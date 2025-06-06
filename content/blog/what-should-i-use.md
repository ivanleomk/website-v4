---
title: Why Instructor might be a better bet than Langchain
date: 2024-09-21
description: Deciding on the right LLM framework for your application
categories:
  - LLMs
  - langchain
  - instructor
authors:
  - ivanleomk
---

## Introduction

If you're building LLM applications, a common question is which framework to use: Langchain, Instructor, or something else entirely. I've found that this decision really comes down to a few critical factors to choose the right one for your application. We'll do so in three parts

1. First we'll talk about testing and granular controls and why you should be thinking about it from the start
2. Then we'll explain why you should be evaluating a framework's ability to experiment quickly with different models and prompts and adopt new features quickly.
3. Finally, we'll consider why long term maintenance is also an important factor and why Instructor often provides a balanced solution, offering both simplicity and flexibility.

By the end of this article, you'll have a good idea of how to decide which framework to use for your LLM application. As a caveat, I've used langchain sparringly and have only used it for a few applications so I might be missing out on some features that would sway my opinion more heavily if I used it more.

## Testing and Granular Controls

Testing is incredibly important in LLM application development for two primary reasons:

1. Failure Mode Detection: LLMs can fail in unexpected ways. Robust testing helps identify these failure modes early, preventing potential issues in production.
2. Performance Impact Assessment: Testing allows us to see how changes in prompts and function definitions affect the overall performance of our application.

Without a good set of evaluations early in the development process, it's challenging to catch and address problems before they become deeply embedded in your application. Early testing enables iterative improvement and helps ensure the reliability of your LLM-powered features.

With `instructor`, testing is simple because you can just verify that the language model has called the right function. I wrote about how to test applications in [Rag Is More Than Just Vector Search](https://www.timescale.com/blog/rag-is-more-than-just-vector-search/) in more detail. We can test our model performance by doing a simple assertion on the response.

Let's see how we can do so with a simple example of a personal assistant with a few tools - google search, calculator and a messaging system.

```python
from instructor import from_openai
from openai import OpenAI
from pydantic import BaseModel
from typing import Union
from rich import print

client = from_openai(OpenAI())


# Pydantic
class GoogleSearch(BaseModel):
    query: str


class Calculator(BaseModel):
    calculations: list[str]


class MessageResponse(BaseModel):
    message: str


def get_response(query: str):
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant. Make sure to choose the right tool for the right job",
            },
            {"role": "user", "content": query},
        ],
        response_model=Union[Calculator, GoogleSearch, MessageResponse],
    )

    return resp


print(get_response("What's the latest score in the NBA finals?"))
# > GoogleSearch(query='latest score NBA finals')
```

With just a simple for loop and an assertion function, we can start testing our application.

```python
queries = [
    ["What's the latest score in the NBA finals?", GoogleSearch],
    ["Can you calculate the square root of 2?", Calculator],
    ["Tell me a joke", MessageResponse],
]

for query, expected_call in queries:
    assert isinstance(
        get_response(query), expected_call
    ), f"Expected {expected_call} for query: {query}"

print("All tests passed")
```

By prioritizing testability and leveraging `instructor`'s features, you can build a robust testing suite that catches issues early, facilitates rapid iteration, and ensures the reliability of your LLM application. This approach sets a strong foundation for more advanced evaluation techniques as your project grows in complexity.

Additionally, `instructor` can integrate with any evaluation provider capable of wrapping the OpenAI client. This flexibility allows you to start with simple local tests and scale to more complex evaluation setups as needed. The simplicity of testing also means that it's easy to write tests early.

We can imagine a slightly more complex test here where we want to check that the right parameters are passed to the tool. Because our tools here are just Pydantic models, we can also test them separately or chain on additional functionality by defining simple class methods.

The closest equivalent I could find in Langchain was this [example](https://docs.smith.langchain.com/how_to_guides/evaluation/evaluate_on_intermediate_steps) where they use langsmith to evaluate the intermediate steps of a chain where they evaluate the input and output of a tool call and use langsmith to evaluate the intermediate steps.

It's a bit too complex for my liking and combines the retrieval and generation in a single step which I don't think is a good idea. I would have personally split this into a few different tests

1. Testing that the right tool is called - there are some cases where we might not even want RAG to be used (Eg. Tell me a joke )
2. Generating some synthetic queries and seeing what was retrieved from my database ( measuring recall and precision)
3. Only relying on LLM as a judge at the end when we know that our retrieval and model is working correctly.

## Experimentation

You want a framework that allows you to quickly experiment with different models and prompts. When comparing Instructor to Langchain, since Instructor is a wrapper on top of the provider's SDKs, it supports [Anthropic's Prompt Caching](https://python.useinstructor.com/blog/2024/09/14/why-should-i-use-prompt-caching/) and [multi-modal input to Gemini](https://python.useinstructor.com/examples/multi_modal_gemini/) easily. This is a huge advantage because it means that we can use the latest features of the provider SDKs without having to wait for the library maintainers to get around to implementing them in a majority of cases.

This is important because you'll want to do three things when you develop an application

1. **Iterate on your prompts** : Different prompts can dramatically change the performance quality ( On some application, I've seen a 20% improvement just by adding a few sentences )
2. **Experiment quickly with different models for the same task** : Different models are suited for different tasks and it's not always clear which one is the best.
3. **Try Provider Features** : Different providers have different features that can be used to improve the performance of your application - for example using different response modes or specifical features such as caching.

We can do this easily with `instructor` by changing the client definition - here's an example of using the `gemini-1.5-flash` model instead of the `gpt-4o-mini` model we used earlier. All we had to change was the client definition and remove the model name from the `chat.completions.create` method.

```python
import instructor
import google.generativeai as genai
from pydantic import BaseModel
from typing import Union
from rich import print

client = instructor.from_gemini(
    client=genai.GenerativeModel(
        model_name="gemini-1.5-flash-latest",
    ),
    mode=instructor.Mode.GEMINI_JSON,
)


# Pydantic
class GoogleSearch(BaseModel):
    query: str


class Calculator(BaseModel):
    calculations: list[str]


class MessageResponse(BaseModel):
    message: str


def get_response(query: str):
    resp = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant. Make sure to choose the right tool for the right job",
            },
            {"role": "user", "content": query},
        ],
        response_model=Union[Calculator, GoogleSearch, MessageResponse],
    )

    return resp


# print(get_response("What's the latest score in the NBA finals?"))
# > GoogleSearch(query='latest score NBA finals')

queries = [
    ["What's the latest score in the NBA finals?", GoogleSearch],
    ["Can you calculate the square root of 2?", Calculator],
    ["Tell me a joke", MessageResponse],
]

for query, expected_call in queries:
    assert isinstance(
        get_response(query), expected_call
    ), f"Expected {expected_call} for query: {query}"

print("All tests passed")
```

With Langchain, we can do something similar by using their different wrappers for each individual provider - `ChatOpenAI` or `ChatGemini` which provide a similar API to each of the different providers. But many of the latest features are not available in these wrappers and depend on PRs from the community to add them due to the abstractions that the library has.

## Long Term Maintenance

This is probably the most important factor when choosing a framework. As a library matures, it's natural for it to become more complex and harder to integrate into your application. These come in two main forms - either with a large number of dependencies that cause conflicts with other libraries or a complex internal architecture that makes it hard to understand how to integrate into your application.

With instructor, because you're really just using the low-level SDKs under the hood, you don't have to worry about these issues. Let's see an example where we might need to migrate from `instructor` to the original `openai_sdk`

```python
from pydantic import BaseModel
from typing import Union
from rich import print
from openai import OpenAI
from instructor import from_openai

client = OpenAI()
client = from_openai(client)


class User(BaseModel):
    name: str
    age: int
    email: str


resp = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=User,
    messages=[
        {
            "role": "user",
            "content": "Ivan is 27 and lives in Singapore. His email is randomemail@gmail.com",
        }
    ],
)

print(resp)
# > User(name='Ivan', age=27, email='randomemail@gmail.com')
```

To use the default `openai` client instead of `instructor` we just need to change 3 lines of code.

```python
from pydantic import BaseModel
from typing import Union
from rich import print
from openai import OpenAI
from instructor import from_openai

client = OpenAI()
# client = from_openai(client)


class User(BaseModel):
    name: str
    age: int
    email: str


# resp = client.chat.completions.create(
resp = client.beta.chat.completions.parse(
    model="gpt-4o-mini",
    response_format=User,
    messages=[
        {
            "role": "user",
            "content": "Ivan is 27 and lives in Singapore. His email is randomemail@gmail.com",
        }
    ],
)

# print(resp)
print(resp.choices[0].message.parsed)
# > User(name='Ivan', age=27, email='randomemail@gmail.com')
```

The equivalent in Langchain would be take much more effort, especially if you're using a custom LLM wrapper and their integrations. In other words, the more abstractions that a library has, the harder it is to remove them later. But, with that being said, Langchain has a tremendous advantage when it comes to integrating with different providers out of the box - especially if you're using the `langchain-community` integrations.

Because `instructor` is much more low-level, you would otherwise have to build these integrations yourself.

## Conclusion

I've only scratched the surface of what you can do with Instructor and I've highlighted a few key features that I think are important when choosing a framework. With `instructor`, you get a really nice balance between ease of use and flexibility which I think is more suitable for long term maintenance and more complex applications.

However, if you're just creating a simple MVP, Langchain might be a better choice because it's more opinionated and easier to get started with. The different integrations are a god send, especially when you're just getting started. It also gives you a good sense for what thse models might be able to do and some interesting optimisations that might work.

It's just difficult to do things like testing and experimentation without having to write a lot of custom code for it due to the levels of abstraction that they've had to do in order to provide these integrations. If you're actively using Langchain, I'd love to know what I might have missed out on.
