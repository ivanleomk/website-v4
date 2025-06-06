---
title: "How does Instructor work?"
date: 2024-09-08
description: "How your request goes from chat completion to validated Pydantic model"
categories:
  - instructor
authors:
  - ivanleomk
---

For Python developers working with large language models (LLMs), `instructor` has become a popular tool for structured data extraction. While its capabilities may seem complex, the underlying mechanism is surprisingly straightforward. In this article, we'll walk through a high level overview of how the library works and how we support the OpenAI Client.

We'll start by looking at

1. Why should you care about Structured Extraction?
2. What is the high level flow
3. How does a request go from Pydantic Model to Validated Function Call?

By the end of this article, you'll have a good understand of how `instructor` helps you get validated outputs from your LLM calls and a better understanding of how you might be able to contribute to the library yourself.

<!-- more -->

### Why should you care?

For developers integrating AI into production systems, structured outputs are crucial. Here's why:

1. **Validation Reliability** : As AI-driven data extraction becomes more complex, manually crafting validation logic grows increasingly error-prone. Structured outputs provide a robust framework for ensuring data integrity, especially for nested or intricate data structures.
2. **System Integration** : Incorporating AI-generated content into existing infrastructure demands predictable, well-defined output formats. Structured outputs act as a bridge, allowing seamless integration of AI capabilities with established systems and workflows.

By leveraging tools that enforce structured outputs, developers can harness the power of AI while maintaining control over data quality and system reliability. This approach not only streamlines development but also enhances the robustness of AI-driven applications.

> In short, structured outputs transform unvalidated LLM calls into validated functions with type signatures that behave exactly as a normal python function, albeit with some level of probablistic behaviour.

## High Level Flow

Let's look at the `Getting Started` example from the [docs](https://python.useinstructor.com/) and see how it works. In this article, we'll only be looking at the synchronous implementation of the `chat.completions.create` function.

```python
import instructor
from pydantic import BaseModel
from openai import OpenAI


# Define your desired output structure
class UserInfo(BaseModel):
    name: str
    age: int


# Patch the OpenAI client
client = instructor.from_openai(OpenAI())

# Extract structured data from natural language
user_info = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=UserInfo,
    messages=[{"role": "user", "content": "John Doe is 30 years old."}],
)

print(user_info.name)
#> John Doe
print(user_info.age)
#> 30
```

A few things are happening here

1. We define our desired output structure using `Pydantic`
2. We wrap our client in a `from_openai` function that returns a client with the same interface but patched with our new functionality.
3. We then make a call like we normally do to `OpenAI`'s API, but with the exception of the a new `response_model` parameter.
4. Magically we get our output?

That to me was an incredible experience compared to something like Langchain which abstracted a significant amount of inner workings away that made customisation difficult. Now that we've seen how it works on an API level, let's look at what the library does under the hood.

## Parsing Responses and Handling Errors

Let's try to answer a few questions here:

1. What does the `from_openai` function do?
2. How does the Pydantic `response_model` keyword argument get used?
3. What happens to the response from the LLM and how is it validated when we use `response_model`?

### The `from_openai` function

We can see the code for the `from_openai` function [here](https://github.com/jxnl/instructor/blob/ea9c1dc5fd40795088bda7b18bc2b3312b32c087/instructor/client.py#L390) where it takes in two main arguments - `client` and `Mode`. These `Mode` enums are how we switch between different modes of interaction with the OpenAI client itself.

```python
class Mode(enum.Enum):
    """The mode to use for patching the client"""

    FUNCTIONS = "function_call"
    PARALLEL_TOOLS = "parallel_tool_call"
    TOOLS = "tool_call"
    MISTRAL_TOOLS = "mistral_tools"
    JSON = "json_mode"
    MD_JSON = "markdown_json_mode"
    JSON_SCHEMA = "json_schema_mode"
    ANTHROPIC_TOOLS = "anthropic_tools"
    ANTHROPIC_JSON = "anthropic_json"
    COHERE_TOOLS = "cohere_tools"
    VERTEXAI_TOOLS = "vertexai_tools"
    VERTEXAI_JSON = "vertexai_json"
    GEMINI_JSON = "gemini_json"
    GEMINI_TOOLS = "gemini_tools"
    COHERE_JSON_SCHEMA = "json_object"
    TOOLS_STRICT = "tools_strict"
```

For `OpenAI`, we have the following tools

1. `FUNCTIONS` - This was the previous method of calling OpenAI functions that's been deprecated
2. `TOOLS_STRICT` - This is the current Tool Calling mode that uses Structured Outputs
3. `TOOLS` - This is how we call OpenAI tools and is the default mode for the OpenAI client
4. `JSON` - This is when we manually prompt the LLM to return JSON and then parse it using a JSON loader.

```python
def from_openai(
    client: openai.OpenAI | openai.AsyncOpenAI,
    mode: instructor.Mode = instructor.Mode.TOOLS,
    **kwargs: Any,
) -> Instructor | AsyncInstructor:
    # Other Validation Log Here

    if isinstance(client, openai.OpenAI):
        return Instructor(
            client=client,
            create=instructor.patch(create=client.chat.completions.create, mode=mode),
            mode=mode,
            provider=provider,
            **kwargs,
        )

    if isinstance(client, openai.AsyncOpenAI):
        return AsyncInstructor(
            client=client,
            create=instructor.patch(create=client.chat.completions.create, mode=mode),
            mode=mode,
            provider=provider,
            **kwargs,
        )
```

We can see here that when we use the `from_openai` function, we get a new `Instructor` that has been patched with our desired mode. What's this [`.patch` function](https://github.com/jxnl/instructor/blob/ea9c1dc5fd40795088bda7b18bc2b3312b32c087/instructor/patch.py#L80) doing? In short, it's really helping us to create a new function that wraps the original `client.chat.completions.create` function that exists on the `Instructor` class that we've now obtained from the `from_openai` function.

```python
def patch(
    client: Union[OpenAI, AsyncOpenAI] = None,
    create: Callable[T_ParamSpec, T_Retval] = None,
    mode: Mode = Mode.TOOLS,
) -> Union[OpenAI, AsyncOpenAI]:
    # ... Validation Logic

    @wraps(func)
    def new_create_sync(
        response_model: type[T_Model] = None,
        validation_context: dict = None,
        max_retries: int = 1,
        strict: bool = True,
        *args: T_ParamSpec.args,
        **kwargs: T_ParamSpec.kwargs,
    ) -> T_Model:
        response_model, new_kwargs = handle_response_model(
            response_model=response_model, mode=mode, **kwargs
        )
        response = retry_sync(
            func=func,
            response_model=response_model,
            validation_context=validation_context,
            max_retries=max_retries,
            args=args,
            strict=strict,
            kwargs=new_kwargs,
            mode=mode,
        )
        return response

    new_create = new_create_async if func_is_async else new_create_sync

    if client is not None:
        client.chat.completions.create = new_create
        return client
    else:
        return new_create
```

The key insight here is that the magic happens with

- `handle_response_model` - This is where we do a lot of the heavy lifting. We use the `response_model` to convert your Pydantic class into a OpenAI Schema compatible format.
- `retry_sync` - This is where we handle the retry logic. We use the `max_retries` to retry the function call if it fails.

### How does the Pydantic `response_model` keyword argument get used?

Let's first look at the code for the `handle_response_model` function [here](https://github.com/jxnl/instructor/blob/ea9c1dc5fd40795088bda7b18bc2b3312b32c087/instructor/process_response.py#L176)

```python
def handle_response_model(
    response_model: type[T] | None, mode: Mode = Mode.TOOLS, **kwargs: Any
) -> tuple[type[T], dict[str, Any]]:
    """Prepare the response model type hint, and returns the response_model
    along with the new modified kwargs needed to be able to use the response_model
    parameter with the patch function.


    Args:
        response_model (T): The response model to use for parsing the response
        mode (Mode, optional): The openai completion mode. Defaults to Mode.TOOLS.

    Raises:
        NotImplementedError: When using stream=True with a non-iterable response_model
        ValueError: When using an invalid patch mode

    Returns:
        Union[Type[OpenAISchema], dict]: The response model to use for parsing the response
    """
    new_kwargs = kwargs.copy()

    # Other Provider Logic
    if not issubclass(response_model, OpenAISchema):
        response_model = openai_schema(response_model)  # type: ignore

    # Other Logic
    elif mode in {Mode.TOOLS, Mode.MISTRAL_TOOLS}:
            new_kwargs["tools"] = [
                {
                    "type": "function",
                    "function": response_model.openai_schema,
                }
            ]
            if mode == Mode.MISTRAL_TOOLS:
                new_kwargs["tool_choice"] = "any"
            else:
                new_kwargs["tool_choice"] = {
                    "type": "function",
                    "function": {"name": response_model.openai_schema["name"]},
                }


    # Other Logic

    return response_model, new_kwargs
```

We can see here that we've converted the `response_model` into a format that's compatible with the OpenAI API. This is where the `openai_schema` function is called. This function is responsible for converting your Pydantic class into a format that's compatible with the OpenAI API, code can be found [here](https://github.com/jxnl/instructor/blob/ea9c1dc5fd40795088bda7b18bc2b3312b32c087/instructor/function_calls.py#L348)

```python
class OpenAISchema(BaseModel):
    # Ignore classproperty, since Pydantic doesn't understand it like it would a normal property.
    model_config = ConfigDict(ignored_types=(classproperty,))

    @classproperty
    def openai_schema(cls) -> dict[str, Any]:
        """
        Return the schema in the format of OpenAI's schema as jsonschema

        Note:
            Its important to add a docstring to describe how to best use this class, it will be included in the description attribute and be part of the prompt.

        Returns:
            model_json_schema (dict): A dictionary in the format of OpenAI's schema as jsonschema
        """
        schema = cls.model_json_schema()
        docstring = parse(cls.__doc__ or "")
        parameters = {
            k: v for k, v in schema.items() if k not in ("title", "description")
        }
        for param in docstring.params:
            if (name := param.arg_name) in parameters["properties"] and (
                description := param.description
            ):
                if "description" not in parameters["properties"][name]:
                    parameters["properties"][name]["description"] = description

        parameters["required"] = sorted(
            k for k, v in parameters["properties"].items() if "default" not in v
        )

        if "description" not in schema:
            if docstring.short_description:
                schema["description"] = docstring.short_description
            else:
                schema["description"] = (
                    f"Correctly extracted `{cls.__name__}` with all "
                    f"the required parameters with correct types"
                )

        return {
            "name": schema["title"],
            "description": schema["description"],
            "parameters": parameters,
        }

def openai_schema(cls: type[BaseModel]) -> OpenAISchema:
    if not issubclass(cls, BaseModel):
        raise TypeError("Class must be a subclass of pydantic.BaseModel")

    schema = wraps(cls, updated=())(
        create_model(
            cls.__name__ if hasattr(cls, "__name__") else str(cls),
            __base__=(cls, OpenAISchema),
        )
    )
    return cast(OpenAISchema, schema)
```

With this function, we're able to take our original Pydantic class and convert it to a function call that looks something like this.

```python
{
    "name": "UserInfo",
    "description": "A user info object",
    "parameters": {
        "name": {
            "type": "string",
            "description": "The name of the user"
        },
        "age": {
            "type": "int",
            "description": "The age of the user"
        }
    }
}
```

We then customise the specific kwargs that we'll then be passing into the OpenAI API to call a function that matches the exact Pydantic class we've defined.

```python
new_kwargs["tools"] = [
    {
        "type": "function",
        "function": response_model.openai_schema,
    }
]
if mode == Mode.MISTRAL_TOOLS:
    new_kwargs["tool_choice"] = "any"
else:
    new_kwargs["tool_choice"] = {
        "type": "function",
        "function": {"name": response_model.openai_schema["name"]},
    }
```

### How does the response from the LLM get validated?

Now that we've seen how the `response_model` is used, let's look at how the response from the LLM is validated in the `retry_sync` function [here](https://github.com/jxnl/instructor/blob/ea9c1dc5fd40795088bda7b18bc2b3312b32c087/instructor/retry.py#L150)

It really is a

```python
for i in max_retries:
    try:
        call_openai_with_new_arguments(**kwargs)
    except validation fails as e:
        update the kwargs with the new errors ( keep appending to the messages the generated content + validation errors )
```

You'll see this from the code snippet below

```python
def retry_sync(
    func: Callable[T_ParamSpec, T_Retval],
    response_model: type[T_Model],
    validation_context: dict,
    args,
    kwargs,
    max_retries: int | Retrying = 1,
    strict: bool | None = None,
    mode: Mode = Mode.TOOLS,
) -> T_Model:

    # Compute some stuff

    try:
        response = None
        for attempt in max_retries:
            with attempt:
                try:
                    response = func(*args, **kwargs)
                    stream = kwargs.get("stream", False)

                    return process_response(
                        response,
                        response_model=response_model,
                        stream=stream,
                        validation_context=validation_context,
                        strict=strict,
                        mode=mode,
                    )
                except (ValidationError, JSONDecodeError) as e:
                    if <condition unrelated to TOOL calling with OpenAI>:
                        raise e
                    else:
                        kwargs["messages"].extend(reask_messages(response, mode, e))
```

Resk messages themselves aren't anything special, for tool calling, we're literally just appending the `response` from the LLM and the `validation_context` to the messages and calling the LLM again as you can see [here](https://github.com/jxnl/instructor/blob/main/instructor/retry.py#L34)

```python
def reask_messages(response: ChatCompletion, mode: Mode, exception: Exception):
    # other Logic
    if mode in {Mode.TOOLS, Mode.TOOLS_STRICT}:
        for tool_call in response.choices[0].message.tool_calls:
            yield {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_call.function.name,
                "content": f"Validation Error found:\n{exception}\nRecall the function correctly, fix the errors",
            }
```

This updates the messages with the validated errors that we've been passing into the OpenAI API and then we call the LLM again. Eventually either we get the validated response that we care about or we hit the max retry limit and raise an error.

## Why you probably shouldn't roll your own

I hope this article has shed some light on the inner workings of Instructor and how it's able to provide a seamless experience for structured outputs. If anything, I hope it helps you understand and think about how you might be able to contribute to the library yourself in the future.

While it might be tempting to implement your own solution, there are several challenges to consider:

1. Constantly tracking updates to different LLM providers can be time-consuming and difficult to maintain.
2. Implementing your own streaming support, partial responses, and iterable handling is technically challenging and prone to errors.

Instead of reinventing the wheel, using a validated library like Instructor allows you to focus on what truly matters - building your LLM application. By leveraging a robust, well-maintained solution, you can save time, reduce errors, and stay up-to-date with the latest developments in the rapidly evolving field of LLMs.
