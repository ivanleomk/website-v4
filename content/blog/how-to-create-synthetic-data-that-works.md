---
title: "How to create synthetic data that works"
date: 2024-08-27
description: Lessons from generating a few million tokens of synthetic data with gpt-4o-mini
categories:
  - LLMs
  - Synthetic Data
authors:
  - ivanleomk
---

Synthetic data can accelerate AI development, but generating high-quality datasets remains challenging. In this article, I'll walk through a few experiments I've done with synthetic data generation and the takeaways I've learnt so that you can do the same.

We'll do by covering

1. **Limitations of simple generation methods** : Why simple generation methods produce homogeneous data
2. **Entropy and why it matters** : Techniques to increase diversity in synthetic datasets
3. **Practical Implementations** : Some simple examples of how to increase entropy and diversity to get better synthetic data

## Using the same prompt for all experiments

Many practitioners rely on straightforward API calls to Large Language Models (LLMs) for synthetic data generation. This approach often leads to unexpected homogeneity.

We can see an example below with `instructor` where we try to generate a list of random names using structured extraction. Note the use of a few validators to ensure the names are single words.

```python
import instructor
import openai
from tqdm.asyncio import tqdm_asyncio as asyncio
from asyncio import run, Semaphore
from pydantic import BaseModel, field_validator

client = instructor.from_openai(openai.AsyncOpenAI())


class Person(BaseModel):
    name: str

    @field_validator("name")
    def validate_name(cls, v) -> str:
        if "random" in v.lower():
            raise ValueError(
                f"Generate a valid name. {v} is not a valid name because it contains the name random"
            )

        if len(v.split()) > 1:
            return v.split()[0]

        return v


async def generate_random_name(sem: Semaphore):
    async with sem:
        return await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=Person,
            messages=[{"role": "user", "content": "Generate a random name"}],
        )


async def main(n_samples: int):
    sem = Semaphore(10)
    coros = [generate_random_name(sem) for _ in range(n_samples)]
    names = await asyncio.gather(*coros)
    names = [n.name for n in names]
    print(len(set(names)))


if __name__ == "__main__":
    run(main(100))

    #> 5
    #> {'Alex', 'Alice', 'Jane', 'Avery', 'John', 'Randall', 'Harry', 'Jonathan'}
```

We made 100 API calls and got 5 unique names. This is a good example of how simple generation methods can lead to unexpected homogeneity. How can we make this better?

## Entropy

A simple method here is to introduce some form of entropy. This simply means changing the prompt slightly for each call so that we have a more diverse set of prompts that we're using. This helps us to increase the diversity of the synthetic data.

In this case, we're using the `faker` library to generate a random country for each name. We then add in a randomly chosen age and gender to the prompt so that we get a more diverse set of names.

```python
import instructor
import openai
from tqdm.asyncio import tqdm_asyncio as asyncio
from asyncio import run, Semaphore
from pydantic import BaseModel, field_validator
from faker import Faker
import random

fake = Faker()
client = instructor.from_openai(openai.AsyncOpenAI())


class Person(BaseModel):
    first_name: str

    @field_validator("first_name")
    def validate_name(cls, v) -> str:
        if "random" in v.lower():
            raise ValueError(
                f"Generate a valid name. {v} is not a valid name because it contains the name random"
            )

        if len(v.split()) > 1:
            return v.split()[0]

        return v


async def generate_random_name(sem: Semaphore):
    country = fake.country()
    age = random.randint(18, 65)
    gender = random.choice(["male", "female"])
    async with sem:
        return await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=Person,
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a random first name for a {gender} who is from {country} that is {age} years old",
                }
            ],
        )


async def main(n_samples: int):
    sem = Semaphore(10)
    coros = [generate_random_name(sem) for _ in range(n_samples)]
    names = await asyncio.gather(*coros)
    names = [n.first_name for n in names]
    print(len(set(names)))
    print(set(names))


if __name__ == "__main__":
    run(main(100))
    # > 89
    # > {'Gábor', 'Amani', 'Sipho', 'Leyla', 'Anita', 'Ousmane', 'Brian', 'Amin', 'Lassane', 'Luca', 'Jaan', 'Georgi', 'Aaliyah', 'Aigul', 'Tanisha', 'Émilie', 'Liam', 'Fatou', 'Ana', 'Carmen', 'Jānis', 'Alfredo', 'Linda', 'Raimonds', 'Marta', 'Ala', 'Tane', 'Male', 'Mireille', 'Andreea', 'Somchai', 'Emily', 'Mamadu', 'Shane', 'José', 'Amadou', 'Ezekiel', 'Sophie', 'Jamal', 'John', 'Mark', 'Derek', 'Marc', 'Mário', 'Tiko', 'Mia', 'Siti', 'Khalil', 'Lukáš', 'Amina', 'María', 'Nermin', 'Sigrún', 'Faakau', 'Nisha', 'Kebede', 'Salma', 'Malu', 'Maja', 'Thato', 'Marina', 'Boris', 'Thabo', 'Mandlenkosi', 'DeAndre', 'Lucas', 'Dagný', 'Malo', 'Demos', 'Mykola', 'Ivan', 'Giulia', 'Aleksandar', 'Elena', 'Aroha', 'Jean', 'Youssef', 'Aman', 'Sofía', 'Maria', 'Mika', 'James', 'Miaraka', 'Ogechi', 'Sela', 'Viktor', 'Joon', 'Dante', 'Juliana'}
```

We can see that with this one simple change, we've increased the diversity of the synthetic data. We've gone from 5 unique names to 89 unique names. This is a good example of how we can use entropy to increase the diversity of the synthetic data.

## Practical Considerations

Often times, I've found that there are a few levers that we can pull to increase the diversity of the synthetic data. These tend to be

1. Including few shot examples : These are incredibly useful for increasing the diversity of the synthetic data. They help to guide the model to generate more diverse outputs by explicitly showing examples of recent generations or outputs we want.

```python
async def generate_random_name(sem: Semaphore, names: list[str]):
    async with sem:
        return await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=Person,
            messages=[
                {
                    "role": "user",
                    "content": "Generate a random name, Make sure that this name is different from the previous names we generated of {names} ",
                }
            ],
        )
```

If you're generating things like synthetic questions, you can even go one step further and ensure that the cosine similarity of the question compared to previous generations is below a certain threshold. This can be done using simple validator here to ensure that the questions are diverse with the help of a validation context.

```
class SyntheticQuestion(BaseModel):
    question: str
    answer: str

    @field_validator("question")
    def check_similarity(cls, v):
        # This is pseudo code
        prev_questions = get_prev_questions()
        if prev_questions and any(cossim(prev_q, v) > 0.5 for prev_q in prev_questions):
            raise ValueError(
                f"Generate a unique question-answer pair. '{v}' is too similar to previously generated questions"
            )
        return v
```

2. Changing the response model : In this case, we're using a structured extraction response model to generate a more diverse set of names. We've added a new backstory field to the response model so that the model has some diversity of output as it generates the names.

```python
class Person(BaseModel):
    backstory: str
    first_name: str

    @field_validator("first_name")
    def validate_name(cls, v) -> str:
        if "random" in v.lower():
            raise ValueError(
                f"Generate a valid name. {v} is not a valid name because it contains the name random"
            )

        if len(v.split()) > 1:
            return v.split()[0]

        return v
```

3. Having some sort of chained generation process : This could look like generating a backstory for a person and then using that backstory to generate a name. This can help to increase the diversity of the synthetic data.

```python
class CharacterProfile(BaseModel):
    background: str
    occupation: str
    personality_traits: list[str]

class Character(BaseModel):
    profile: CharacterProfile
    name: str

async def generate_character(sem: Semaphore):
    async with sem:
        profile = await client.chat.completions.create(
            model="gpt-4",  # Note: Use an appropriate, available model
            response_model=CharacterProfile,
            messages=[{"role": "user", "content": "Generate a character profile"}],
        )
        character = await client.chat.completions.create(
            model="gpt-4o-mini",
            response_model=Character,
            messages=[
                {
                    "role": "user",
                    "content": f"Generate a name for a character with this profile: {profile}",
                }
            ],
        )
        return character
```

## Conclusion

Generating high-quality synthetic data requires moving beyond simple API calls. By introducing entropy, leveraging few-shot examples, modifying response models, and implementing chained generation processes, you can significantly improve the diversity and quality of your synthetic datasets.

Remember to always validate your synthetic data against your specific use case and adjust these techniques as needed. With these approaches, you'll be better equipped to create synthetic data that truly adds value to your AI development process.
