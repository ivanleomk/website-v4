---
title: "Pydantic to Regex: Compiling JSON Schemas for Structured Outputs"
date: 2026-02-02
description: Build a recursive JSON Schema-to-regex compiler from first principles
categories:
  - Reinforcement Learning
authors:
  - ivanleomk
series:
  - Structured Outputs From Scratch
---

If you've ever asked a LLM to output JSON, it might return markdown code blocks, hallucinate extra fields or produce invalid syntax. A common way to solve this is to handle this at a decoding level - the model still produces tokens one by one but before each token is sampled, we mask out anything that would violate a predefined structure.

This means that invalid outputs become impossible because the model never gets a chance to emit markdown fences, commenary text, missing fields or invalid syntax because those tokens simply have probability zero.

In this series, we'll build a simple package called `kosoku` that mimics structured outputs while intentionally supporting only a subset of the JSON Schema specification.

We'll do this with an implementation that's compatible with the `transformers` library, using an older `mlx-community/Qwen1.5-0.5B-Chat-4bit` model that struggles with structured outputs.

When we ask a smaller model to extract arguments for a more complex tool (for example a flight search with required fields like `origin`, `destination`, `passengers`, `cabin_class`, and `price_limit`), unconstrained decoding often returns the wrong JSON shape entirely.

Here is a real unconstrained output from the model:

```text
Output:
{
  "flights": [
    {
      "flight_number": "JFK-THO",
      "departure_date": "2025-03-15",
      "arrival_date": "2025-03-16",
      "price_per_person": "$3000"
    }
  ]
}

✗ Failed to parse as FlightSearch: 8 validation errors for FlightSearch
```

Instead of the expected argument object, it emits a different structure (`flights`), so the tool call fails validation.

## What are structured Outputs?

Typically if you've ever used any model provider, you normally get to define the functions you'd like to call using JSON Schema.

OpenAI calls their offering [Constrained Decoding](https://openai.com/index/introducing-structured-outputs-in-the-api/) and Google has a [similar version for Gemini](https://ai.google.dev/gemini-api/docs/structured-output). If you're using an open source library, then you'll have [Outlines](https://github.com/dottxt-ai/outlines) which is an open source equivalent.

The easiest way to generate this JSON Schema is by using a library like Pydantic.

```py
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
```

We can then generate JSON schema by using their `model_json_schema` method which gives the following output.

```json
{
  "properties": {
    "name": {
      "title": "Name",
      "type": "string"
    },
    "age": {
      "title": "Age",
      "type": "integer"
    }
  },
  "required": ["name", "age"],
  "title": "User",
  "type": "object"
}
```

Then when we call the APIs, we can then pass this JSON schema in and then get back a valid function call.

Let's see how we might do so with the `@google/genai` package using `Gemini-3-flash-preview`. Note that it supports Pydantic objects out of the box but I wanted to show what's happening under the hood.

```py
client = Client(api_key="<api key>")

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Ivan is 29 and lives in Singapore. Extract Ivan as a user",
    config=types.GenerateContentConfig(
        tools=[
            types.Tool(
                function_declarations=[
                    types.FunctionDeclaration(
                        name=schema["title"],
                        description=schema["description"],
                        parameters_json_schema={
                            "type": "object",
                            "properties": schema["properties"],
                            "required": schema["required"],
                        },
                    )
                ]
            )
        ],
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="ANY")
        ),
    ),
)

print(response)
```

This in turn results in a function call below

```py
Content(
    parts=[
        Part(
            media_resolution=None,
            code_execution_result=None,
            executable_code=None,
            file_data=None,
            function_call=FunctionCall(id=None, args={'age': 29, 'name': 'Ivan'}, name='User', partial_args=None, will_continue=None),
            ...other args
        )
    ]
)
```

If we hadn't used function calling here with structured outputs, we would have to manually parse out JSON code blocks which is just error prone and fraught with issues.

## Converting JSON Schema to Functions

How does this work on a high level? How did we go from our JSON schema to a valid JSON object which our function call generated.

1. We start with a JSON Schema, which indicates what the model is allowed to output (required keys, types, enums, etc.). This is supported by most common libraries like [Zod](https://zod.dev/) and [Pydantic](https://docs.pydantic.dev/latest/) out of the box

2. We then compile this into a regular expression which is able to describe the final valid serialized output. Booleans for instance become `(true|false)` expressions and we indicate here all of our JSON rules too. Note that this is a **global form of validation**

3. Once we've done this, we then compile this regex into a Finite State machine (FSM) which tells us given a prefix, what are the valid states from there. This is a **local lookup for us**.

Once we've obtained our FSM, we then have an object we can lookup quickly to determine which tokens to mask at each step.

Now that we understand what how the proccess works, let's see how we can implement a JSON Schema to Regex converter.

## Processing our JSON Schema

Now that we understand the process, let's implement the first major step: converting a JSON Schema into a single, comprehensive regular expression that can validate the entire JSON output.

Before we write a script to automate this, it’s crucial to understand how to construct the regex manually. This will clarify the goal of our automation.

Let's start with a simple Pydantic model:

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
```

Our goal is to create a regex that validates a JSON string representing this `User` object. The target structure looks like this: `{"name": (a string), "age": (an integer)}`. To build a pattern for this, we first need a set of "building blocks"—regular expressions for fundamental JSON data types and for handling whitespace.

```python
# Primitives for JSON validation
STRING_PATTERN = r'"([^"\\]|\\.)*"'
INTEGER_PATTERN = r"-?(0|[1-9][0-9]*)"
NUMBER_PATTERN = r"-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?"
BOOLEAN_PATTERN = r"(true|false)"
NULL_PATTERN = r"null"
WS = r"[ \t\n\r]*" # Whitespace
```

With these primitives, we can assemble the full pattern for our `User` model piece by piece. The final regex is a direct, character-by-character translation of the expected JSON structure.

```python
import re

# Assemble the pieces to match the User structure
full_pattern = (
    f"\\{{{WS}}"  # Match the opening brace and whitespace
    f'"name"{WS}:{WS}{STRING_PATTERN}{WS},{WS}'  # "name" key-value pair, plus a comma
    f'"age"{WS}:{WS}{INTEGER_PATTERN}{WS}'      # "age" key-value pair
    f"\\}}"  # Match the closing brace
)

# Now, let's test it. We use `re.fullmatch` to ensure the *entire* string conforms.
valid_json = '{"name": "Ivan", "age": 29}'
invalid_json = '{"name": "Ivan"}' # Missing "age" field

print(f"Matching valid JSON:   {bool(re.fullmatch(full_pattern, valid_json))}")
print(f"Matching invalid JSON: {bool(re.fullmatch(full_pattern, invalid_json))}")
```

This works perfectly, but it's not scalable. The key to automation is using a programmable representation of our model, which Pydantic provides with the `.model_json_schema()` method.

```python
User.model_json_schema()
# {
#   "type": "object",
#   "properties": {
#     "name": {"type": "string"},
#     "age": {"type": "integer"}
#   },
#   "required": ["name", "age"]
# }
```

This dictionary is our blueprint.

At the first level, the mental model is simple: each property maps to one regex fragment. A `name: str` field maps to `STRING_PATTERN`, an `age: int` field maps to `INTEGER_PATTERN`, and we stitch them into an object pattern.

Then we go one level deeper. A property can itself be an object or an array, so "property -> regex" needs to become a reusable conversion step, not hardcoded string concatenation.

That's exactly why we split things into two functions:

1. `pydantic_to_regex` is the entry point.
2. `_schema_to_regex` is the recursive worker that converts any schema node into regex.

This abstraction also handles how Pydantic represents nested models with `$defs` + `$ref`: whenever we hit a `$ref`, we resolve it from `$defs`, then keep recursing.

Here is the complete implementation:

```python
import re
from pydantic import BaseModel
from typing import List, Optional, Literal, Union

# (Primitive patterns from above are assumed to be defined here)

def pydantic_to_regex(pydantic_model: type[BaseModel]) -> str:
    """
    Takes a Pydantic model and returns a regex pattern that validates a
    JSON string representation of it.
    """
    json_schema = pydantic_model.model_json_schema()
    # Pydantic places schemas for nested models in `$defs`. We pass this
    # lookup dictionary through our recursive calls.
    defs = json_schema.get("$defs", {})
    return _schema_to_regex(json_schema, defs)

def _schema_to_regex(schema: dict, defs: dict) -> str:
    # Handle $ref for nested models by replacing the reference with its definition.
    if "$ref" in schema:
        definition_key = schema["$ref"].split("/")[-1]
        return _schema_to_regex(defs[definition_key], defs)

    # Handle Union types (anyOf) with a regex OR.
    if "anyOf" in schema:
        options = [_schema_to_regex(s, defs) for s in schema["anyOf"]]
        return f"({'|'.join(options)})"

    # Handle Literal types (enum).
    if "enum" in schema:
        literals = []
        for v in schema["enum"]:
            if isinstance(v, str):
                literals.append('"' + re.escape(v) + '"')
            elif isinstance(v, (int, float, bool)) or v is None:
                literals.append(re.escape(str(v).lower()))
        return f"({'|'.join(literals)})"

    prop_type = schema.get("type")

    # --- Base Cases: Primitive Types ---
    if prop_type == "string": return STRING_PATTERN
    if prop_type == "integer": return INTEGER_PATTERN
    if prop_type == "number": return NUMBER_PATTERN
    if prop_type == "boolean": return BOOLEAN_PATTERN
    if prop_type == "null": return NULL_PATTERN

    # --- Recursive Cases: Complex Types ---
    if prop_type == "array":
        items_regex = _schema_to_regex(schema["items"], defs)
        # An array is either empty `[]` or has one or more comma-separated items.
        empty = rf"\[{WS}\]"
        non_empty = rf"\[{WS}{items_regex}(?:{WS},{WS}{items_regex})*{WS}\]"
        return f"(?:{empty}|{non_empty})"

    if prop_type == "object":
        properties = schema.get("properties", {})
        required = schema.get("required", [])

        # Convert each property schema into a reusable key-value regex fragment.
        prop_patterns = {
            key: f'"{re.escape(key)}"{WS}:{WS}{_schema_to_regex(prop_schema, defs)}'
            for key, prop_schema in properties.items()
        }

        # Positive lookaheads enforce required fields regardless of field order.
        required_lookaheads = "".join(
            rf"(?=.*{prop_patterns[key]})" for key in required if key in prop_patterns
        )

        if not prop_patterns:
            return rf"\{{{WS}\}}"

        pair = f"(?:{'|'.join(prop_patterns.values())})"
        body = rf"{pair}(?:{WS},{WS}{pair})*"
        return rf"\{{{WS}{required_lookaheads}{body}{WS}\}}"

    raise NotImplementedError(f"Schema type '{prop_type}' not supported.")
```

Here's a simple test for the object compiler:

```python
def test_simple_object():
    assert matches(User, '{"name": "Ivan", "age": 29}')
    assert matches(User, '{"name": "Alice", "age": 0}')
```

For instance, this works pretty well here, and it makes it much easier for us to validate and implement structured outputs.

The real power of this approach is evident with nested models. Let's define a `Data` model that contains a list of our `User` objects and see if the generator can handle it.

```python
class User(BaseModel):
    name: str
    age: int

class Data(BaseModel):
    users: list[User]

# Generate the pattern automatically!
pattern = pydantic_to_regex(Data)

# --- Test Cases ---
should_match = '{"users": [{"name": "Ivan", "age": 29}, {"name": "Jane", "age": 34}]}'
should_not_match = '{"users": [{"name": "Ivan"}]}' # Missing age
wrong_type = '{"users": [{"name": "Ivan", "age": "twenty"}]}' # Wrong type

print(f"Match valid:         {bool(re.fullmatch(pattern, should_match))}")
print(f"No match incomplete: {bool(re.fullmatch(pattern, should_not_match))}")
print(f"No match wrong type: {bool(re.fullmatch(pattern, wrong_type))}")
```

The output is exactly what we expect: `True`, `False`, `False`.

There are a few important things happening here:

1. The compiler sees `users` and maps that property to an array regex.
2. It then sees `items` as a `$ref`, resolves `User` from `$defs`, and recurses.
3. In object nodes, key/value fragments are composed into a concrete JSON object pattern that can be validated with `re.fullmatch`.

At this point we have a clean property-to-regex compiler that works for both flat schemas and nested schemas.

## Structured Outputs from Scratch

Educational constrained decoding pipeline built as explicit stages in `kosoku`.

```python
import kosoku

regex = kosoku.from_json_schema(schema)  # JSON Schema -> regex
nfa = kosoku.from_regex(regex)           # regex -> NFA
dfa = kosoku.from_nfa(nfa)               # NFA -> DFA
runtime = kosoku.from_dfa(dfa)           # cached runtime

result = runtime.generate(model, tokenizer, prompt, output_type=MyModel)
```

```text
JSON Schema -> Regex -> NFA -> DFA -> Token Masking -> Generation
```

1. `from_json_schema`: compiles a JSON Schema subset into regex.
2. `from_regex`: parses regex into IR and compiles it into an epsilon-NFA.
3. `from_nfa`: determinizes NFA closure states into a DFA API (`next_state`, `walk`, `is_final`).
4. `from_dfa`: creates a reusable runtime that lazily builds token masks per DFA state.
5. `generate`: masks invalid tokens at each decoding step and emits valid structured JSON.

Note: this educational implementation is optimized for clarity, not full JSON Schema or regex parity. Current JSON object handling is an ordered-key subset (no lookahead-based unordered matching).

## Conclusion

At this stage, we can take a Pydantic model, convert it to JSON Schema, and compile that into one regex that describes every valid output string.

That gives us a strong global validator, but it's still not enough for fast token-by-token decoding. This regex grows quickly with schema size, which is exactly why we don’t want to run it repeatedly at decode time. For this, we'll need a finite state machine (FSM), once we have the FSM, decoding will only require a fast lookup instead of repeated regex checks at each step.
