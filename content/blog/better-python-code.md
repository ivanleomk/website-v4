---
title: "Everything I've learnt about writing good Python code"
date: 2024-04-17
description: Speedrun your way to becoming a good python developer and don't make the same mistakes I did
categories:
  - Python
  - Advice
authors:
  - ivanleomk
---

In the past 6 months, I've 10xed the amount of python code I've written. In this article, I'll show you a few easy actionable tips to write better and more maintainable code. I've been lucky enough to have Jason (@jxnlco on twitter) review a good chunk of my code and I've found that these few things have made a massive difference in my code quality.

1. using the `@classmethod` decorator
2. learn the stdlib
3. write simpler functions
4. being a bit lazier - earn the abstraction
5. decouple your implementation

<!-- more -->

## Use the classmethod decorator

You should be using the `@classmethod` decorator when dealing with complex logic. A good example is that of the [Instructor API schema](https://python.useinstructor.com/api/?h=openai#instructor.function_calls.OpenAISchema) which has clear explicit ways for you to instantiate the different API providers.

Let's compare two separate versions of the API. The first is the API that the library used before their v1.0.0 release and the second is their more recent version

```python
# Pre-V1.0.0
import instructor
from openai import OpenAI

client = instructor.patch(OpenAI())

# Post V1
import instructor
from openai import OpenAI

client = instructor.from_openai(OpenAI())
```

Because we're using the classmethod to define explicitly the client that we want to patch, **we get better code readability and improved autocomplete out of the box. this is great for developer productivity**.

If you ever want to migrate to a separate provider that doesn't support the OpenAI standard, you need to change to a separate classmethod and explicitly make that change in the code. If the two providers have very different behaviour, this helps you to catch subtle bugs that you otherwise might not have caught.

This is important because the more complex your code's logic is, the more likely for it to have a strange bug. You don't want to be dealing with complex edge cases since you're explicitly declaring the specific clients you're using in your code base.

### Using Classmethods

I recently worked on a script that generated embeddings using different models using SentenceTransformers, OpenAI and Cohere. This was tricky because each of these models need to be used differently, even when initialising them and I finally settled on the code below.

```python
import enum


class Provider(enum.Enum):
    HUGGINGFACE = "HuggingFace"
    OPENAI = "OpenAI"
    COHERE = "Cohere"


class EmbeddingModel:
    def __init__(
        self,
        model_name: str,
        provider: Provider,
        max_limit: int = 20,
        expected_iterations: int = float("inf"),
    ):
        self.model_name = model_name
        self.provider = provider
        self.max_limit = max_limit
        self.expected_iterations = expected_iterations

    @classmethod
    def from_hf(cls, model_name: str):
        return cls(
            model_name,
            provider=Provider.HUGGINGFACE,
            max_limit=float("inf"),
        )

    @classmethod
    def from_openai(cls, model_name: str, max_limit=20):
        return cls(model_name, provider=Provider.OPENAI, max_limit=max_limit)

    @classmethod
    def from_cohere(cls, model_name: str):
        return cls(model_name, provider=Provider.COHERE)

```

There are a few things which make the code above good

1. **Easier To Read**: I can determine which provider I'm using when I instantiate the class - `EmbeddingModel.from_hf` makes it clear that it's the `SentenceTransformers` package that's being used

2. **Lesser Redundancy**: I only need to pass in the values that I need to for each specific model. This makes it easy to add in additional configuration parameters down the line and be confident that it won't mess up existing functionality

## Learn Common Libraries

This might be overstated but I think everyone should take some time to at least read through the basic functions in commonly used libraries. Some general parallels I've found have been

- Handling Data -> Pandas
- Retrying/Exception Handling -> Tenacity
- Caching data -> diskcache
- Validating Objects -> Pydantic
- Printing/Formatting things to the console - Rich
- Working with generators - itertools has a great selection of things like `islice` and automatic batching
- Writing common counters/dictionary insertion logic etc - use Collections
- Caching Data/Working with Curried functions? - use functools

If a commonly used libarary provides some functionality, you should use it. It's rarely going to be beneficial to spend hours writing your own version unless it's for educational purposes. The simple but effective hack I've found has been to use a variant of the following prompt.

```bash
I want to do <task>. How can I do so with <commonly used library>.
```

ChatGPT has a nasty habit of trying to roll its own implementation of everything. I made this mistake recently as usual when I had to log the results of an experiment I did. ChatGPT suggested I use the `csv` module, manually calculate a set of all of the keys in my data before writing it to a `.csv` file as seen below.

```python
import csv

data = [{"key1": 2, "key4": 10}, {"key3": 3}, {"key4": 4}]

keys = set()
for obj in data:
    keys.update(obj.keys())

with open("output.csv", "w", newline="") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=keys)
    writer.writeheader()
    writer.writerows(data)
```

After spending 30 minutes testing and fixing some bugs with this version, I discovered to my dismay that Pandas had the native `to_csv` classmethod to write to csv and that I could generate a Dataframe from a list of objects as seen below.

```python
import pandas as pd

data = [{"key1": 2, "key4": 10}, {"key3": 3}, {"key4": 4}]
df = pd.DataFrame(data)
df.to_csv("output.csv", index=False)
```

What's beautiful about using a pandas dataframe is that now, you get all this beautiful added functionality like

- Generating it as a markdown table? - just use `df.to_markdown()`
- Want to get a dictionary with the keys of each row? - just use `df.to_dict()`
- Want to get a json formatted string? - just use `df.to_json()`

That's a huge reduction in the potential issues with my code because I'm now using a library method that other people have spent time and effort to write and test. Standard libraries are also well supported across the ecosystem, allowing you to take advantage of other integrations down the line (Eg. LanceDB supporting Pydantic Models )

## Write Simpler Functions

I think that there are three big benefits to writing simpler functions that don't mutate state

1. They're easier to reason about since they're much smaller in size
2. They're easier to test because we can mock the inputs and assert on the outputs
3. They're easier to refactor because we can swap out different components easily

I had a pretty complex problem to solve recently with some code - which was to take in a dataset of rows with some text and then embed every sentence inside it. I took some time and wrote an initial draft that looked something like this

```python
def get_dataset_batches(data, dataset_mapping: dict[str, int], batch_size=100):
    """
    In this case, dataset_mapping maps a sentence to a
    id that we can use to identify it by. This is an
    empty dictionary by default
    """
    batch = []
    for row in data:
        s1, s2 = data["text"]
        if s1 not in dataset_mapping:
            dataset_mapping[s1] = len(dataset_mapping)
            batch.append(s1)
            if len(batch) == batch_size:
                yield batch
                batch = []

        if s2 not in dataset_mapping:
            dataset_mapping[s2] = len(dataset_mapping)
            batch.append(s1)
        if len(batch) == batch_size:
            yield batch
            batch = []

    if batch:
        yield batch
```

Instead of doing this, a better method might be to break up our function into the following few smaller functions as seen below.

```python
def get_unique_sentences(data):
    seen = set()
    for row in data:
        s1, s2 = data["text"]
        if s1 not in seen:
            seen.add(s1)
            yield s1

        if s2 not in seen:
            seen.add(s1)
            yield s2


def get_sentence_to_id_mapping(sentences: List[str]):
    return {s:i for i, s in enumerate(sentence)}


def generate_sentence_batches(sentence_mapping: dict[str, int], batch_size=100):
    batch = []
    for sentence in sentence_mapping:
        batch.append([sentence, sentence_mapping[sentence]])
        if len(batch) == batch_size:
            yield batch
        batch = []

    if batch:
        yield batch

```

> I wrote my own batching function here but you should really be using `itertools.batched` if you're running Python 3.12 and above.

We can then call the function above using a main function like

```python
def main(data):
    sentences = get_unique_sentences(data)
    s2id = get_sentence_to_id_mapping(sentences)
    batches = generate_sentence_batches(s2id)
    return batches
```

In the second case we're not squeezing everything into a single function. It's clear exactly what is happening in each function which makes it easy for people to understand your code.

Additionally, because we don't mutate state in between our functions and instead generate a new value, we are able to mock and test each of these functions individually, allowing for more stable code to be written in the long run.

It helps to have one main function call a sequence of other functions and have those functions be as flat as possible. This means that ideally between each of these calls, we minimise mutation or usage of some shared variable and only do so when there's an expensive piece of computation involved.

## Earn the Abstraction

I think it's easy to quickly complicate a codebase with premature abstractions without much effort over time - just look at Java. After all, it's a natural reflex as we work towards writing code that is DRY. But that often makes it difficult for you to adapt your code down the line.

For instance, an easy way to do this initially is to just return a simple dictionary if the returned value is only being used by a single function.

```python
def extract_attributes(data):
    new_data = process_data(data)
    return {"key1": new_data["key1"], "key2": new_data["key2"]}


def main():
    data = pd.read_csv("data.csv")
    attributes = extract_attributes(data)
    return attributes
```

In this example, there's a limited utility to declaring an entire dataclass because it adds additional overhead and complexity to the function.

```python
@dataclass
class Attributes:
    key1: List[int]
    key2: List[int]


def extract_attributes(data):
    new_data = process_data(data)
    return Attributes(key1=new_data["key1"], key2=new_data["key2"])


def main():
    data = pd.read_csv("data.csv")
    attributes = extract_attributes(data)
    return attributes
```

## Decouple your implementation

Another example I like a lot is scoring values. Say we want to calculate the recall for a list of predictions that we've made where we have a single known label as our ground truth and a list of other labels as our model's predictions. We might implement it down the line as

```python
def calculate_recall(labels,predictions):
    scores = []
    for label,preds in zip(labels,predictions):
        calculate_recall(label,preds)
    return scores
```

But what if we'd like to work with other metrics down the line like precision, NDCG or Mean Reciprocal Rank? Wouldn't we then have to declare 4 different functions for this?

```python
def calculate_recall_predictions(labels, predictions):
    scores = []
    for label, preds in zip(labels, predictions):
        calculate_recall(label, preds)
    return scores


def calculate_ndcg_predictions(labels,predictions):
    scores = []
    for label, preds in zip(labels, predictions):
        calculate_ndcg(label, preds)
    return scores
```

A better solution instead is to parameterise the scoring function itself. If you look at the different functions we've defined, they all take in a single label. We're also doing the same thing in each function, which is to score the predictions with respect to a specific output.

This means that we could rewrite this as seen below

```python
def score(labels, predictions, score_fn):
    return [score_fn(label, pred) for label, pred in zip(labels, predictions)]
```

In fact, we could even go one step further and just represent all of the metrics that we want as a single dictionary.

```python
SIZES = [3, 10, 15, 25]
metrics = {"recall": calculate_recall, "mrr": calculate_mrr}
evals = {}


def predictions_at_k(score_fn, k:int):
    def wrapper(chunk_id, predictions):
        return score(chunk_id, predictions[:k])

    return wrapper


for metric, k in itertools.product(metrics.keys(), SIZES):
    evals[f"{metric}@{k}"] = predictions_at_k(score_fn=metrics[metric], k=k)
```

We can then take a given label and list of predictions and calculate the result as

```python
def score(labels, predictions):
    return pd.DataFrame(
        [
            {label: metric_fn(label, pred) for label, metric_fn in evals.items()}
            for label, pred in zip(labels, predictions)
        ]
    )
```

This is an extremely flexible function that we're using which gives us a pandas dataframe out of the box. All we need to do if we want to add an extra metric is to add a new entry to the `metrics` dictionary. If we want to evaluate our results at a new subset of `k` items, we just need to update the `SIZES` array too.

## Conclusion

Everyone needs to write enough bad code to start writing better code. The path to writing better code is paved with a lot of PR reviews and reading better code examples. I've definitely written my share of bad code and I hope that this article helps you to see some interesting ways to write better code.
