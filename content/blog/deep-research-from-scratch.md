---
title: Deep Research From Scratch
date: 2026-03-11
description: Why you need subagents
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Deep Research From Scratch
---

Deep research is the textbook use case for subagents. When generating long, dense reports, subagents keep the main agent's context window clean and focused. It is a pattern that scales beautifully.

In this series, we are building a deep research system from scratch. We will start simple using a single API call with zero tools—and scale up to a complete system featuring a tool runtime, managed state, lifecycle hooks, subagents, and dynamically swapped tools.

Each step introduces just one new concept. While this won't be production-ready code out of the box, it provides the foundation you need for your own use case. But before we write any code, let's break down the anatomy of a deep research system.

## What is an Agent?

A chatbot receives a prompt and returns an answer. An agent receives a prompt, decides what to do, uses tools, inspects the results, and then decides its next move. The difference lies in the ability to take action and adapt a plan based on new information.

A deep research model relies on this same core loop. When a user asks a complex question, the model iteratively explores the topic. It starts with an initial plan, refines it, and hunts down the necessary context.

The process generally follows these steps:
1. **Deconstruct:** Break down the user's query and ask clarifying follow-up questions.
2. **Gather:** Read relevant pages, files, and sources.
3. **Investigate:** Track unresolved threads and dig deeper for missing information.
4. **Synthesize:** Compile the findings into a cohesive report.

The hard part isn't generating the first answer. The hard part is keeping the model organized long enough to produce a great one.

## From Completion to Tool Calling

To understand why tool calling matters, let's look at a naive approach: asking a model to read a file using a standard API call.

```python
from google.genai import Client
from rich import print

client = Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents="Please read the README.md file.",
)

print(response.text)
```

This fails. No matter how capable the model is, standard text completion cannot interact with your local environment. Run this, and you will get a polite refusal:

```text
I'd be happy to help you read the README.md file! However, I don't have
direct access to your file system. Could you please share the contents
of the README.md file with me, and I'll help you review it?
```

The model is limited to generating text based on its training data and prompt. It cannot reach out into the real world. That is the fundamental gap between a chatbot and an agent. The way to solve this is tool calling.

### Declaring a Tool

Tool Calling is simply telling the model to generate a JSON object with a predictable shape. This is done by providing a schema detailing the tool we does want and the exact arguments that it requires, passing in a schema alongside our request.

```python
from google.genai import Client, types

read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(
                        type="STRING",
                        description="Path to a UTF-8 text file.",
                    )
                },
                required=["path"],
            ),
        )
    ]
)

client = Client()

completion = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[
        types.UserContent(
            parts=[types.Part.from_text(text="Please read the README.md file.")]
        )
    ],
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)

message = completion.candidates[0].content
function_calls = [part.function_call for part in message.parts if part.function_call]

if function_calls:
    for call in function_calls:
        print(f"- {call.name}")
        print(call.args)
```

Instead of a conversational apology, the model now returns a structured request:

```json
{
  "name": "read_file",
  "args": {
    "path": "README.md"
  }
}
```
This predictability makes agentic applications possible. Because the output follows a strict schema, we can write code to inspect it, route it to the right logic and then execute the action. If the model simply replied with, *"Please read the README.md file,"* we would have to rely on fragile natural language processing to extract the intent. Structured tool calls eliminate that guesswork.

But we haven't actually *done* anything yet. The model requested a tool call, and we just printed it. To close the loop, we need to execute the tool and feed the result back.

### Closing the loop

Here's the full round trip. We take the function call from the model, run the tool ourselves, and send the result back so the model can generate a final response.

```python
from pathlib import Path
from google.genai import Client, types


def read_file(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(
                        type="STRING",
                        description="Path to a UTF-8 text file.",
                    )
                },
                required=["path"],
            ),
        )
    ]
)

client = Client()

contents: list[types.Content] = [
    types.UserContent(
        parts=[types.Part.from_text(text="Please read the README.md file.")]
    )
]

completion = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=contents,
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)

message = completion.candidates[0].content
function_calls = [part.function_call for part in message.parts if part.function_call]
call = function_calls[0]

# Execute the tool and send the result back
contents.append(message)
contents.append(
    types.UserContent(
        parts=[
            types.Part.from_function_response(
                name=call.name,
                response={
                    "path": call.args["path"],
                    "content": read_file(call.args["path"]),
                },
            )
        ]
    )
)

follow_up = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=contents,
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)

print(follow_up.candidates[0].content)
```

This is the first complete round trip. The model asks to read a file, we read it, the model uses the contents to produce a real answer. Every agent you've ever used — coding agents, research agents, all of them — is doing some version of this.

But look at how much manual wiring there is. We're checking the function call name, pulling out arguments, building the response by hand. 

With one tool this is fine. With two it's tedious. With ten it's **unmanageable**.

### Building the Tool Runtime

Hand-wiring tool schemas and routing logic gets messy fast. To fix this, we abstract the boilerplate into a lightweight runtime. 

We encapsulate the tool's name, description, expected arguments (via Pydantic), and execution logic inside a single `Tool` dataclass. The runtime takes over the heavy lifting of schema generation, dispatch, and validation.

```python
# tools.py
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, TypeVar

from google.genai import types
from pydantic import BaseModel

ArgsT = TypeVar("ArgsT", bound=BaseModel)
ToolHandler = Callable[[ArgsT], Awaitable[dict[str, Any]]]

@dataclass(slots=True)
class Tool:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: ToolHandler

    def to_genai_tool(self) -> types.Tool:
        schema = self.args_model.model_json_schema()
        return types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=self.name,
                    description=self.description,
                    parameters=types.Schema(
                        type="OBJECT",
                        properties=schema["properties"],
                        required=schema.get("required", []),
                    ),
                )
            ]
        )

class ReadFileArgs(BaseModel):
    path: str

async def read_file(args: ReadFileArgs) -> dict[str, Any]:
    return {
        "path": args.path,
        "content": Path(args.path).read_text(encoding="utf-8"),
    }

READ_FILE_TOOL = Tool(
    name="read_file",
    description="Read a UTF-8 text file and return its contents.",
    args_model=ReadFileArgs,
    handler=read_file,
)
```

By pushing the complexity into the `Tool` class, the agent's core job shrinks to one thing: run a loop. The runtime handles dispatch, validation, and error reporting. If the model hallucinates a tool name or passes the wrong argument types, we catch it and feed the error back as an observation — just like a developer reading a stack trace, the model can read the message and try again.

```python
# agent.py
import asyncio
from typing import Any

from google.genai import Client, types
from tools import READ_FILE_TOOL, Tool


class AgentRuntime:
    def __init__(self, tools: list[Tool]) -> None:
        self.tools = {tool.name: tool for tool in tools}

    def get_tools(self) -> list[types.Tool]:
        return [tool.to_genai_tool() for tool in self.tools.values()]

    async def execute_tool_call(
        self,
        call: types.FunctionCall,
    ) -> dict[str, Any]:
        tool = self.tools.get(call.name)
        if tool is None:
            return {"name": call.name, "response": f"Unknown tool: {call.name}"}

        if call.args is None:
            return {
                "name": call.name,
                "response": f"Tool '{call.name}' did not include arguments.",
            }

        try:
            args = tool.args_model.model_validate(call.args)
            response = await tool.handler(args)
            return {"name": call.name, "response": response}
        except Exception as e:
            return {"name": call.name, "response": f"Error: {e}"}
```

That gives us clean tool execution. But the piece that actually makes this an agent is the loop. Instead of calling the model once and hoping for the best, we keep going until the model stops requesting tools:

```python
async def main() -> None:
    client = Client()
    runtime = AgentRuntime([READ_FILE_TOOL])

    contents: list[types.Content] = [
        types.UserContent(
            parts=[types.Part.from_text(text="Please read the README.md file.")]
        )
    ]

    while True:
        completion = await client.aio.models.generate_content(
            model="gemini-3-flash-preview",
            contents=contents,
            config=types.GenerateContentConfig(tools=runtime.get_tools()),
        )

        message = completion.candidates[0].content
        contents.append(message)

        # Extract function calls from the response
        function_calls = [
            part.function_call for part in message.parts if part.function_call
        ]

        # If the model didn't request any tools, it's done
        if not function_calls:
            print(message)
            break

        # Execute each tool call and send results back
        tool_parts: list[types.Part] = []
        for call in function_calls:
            result = await runtime.execute_tool_call(call)
            tool_parts.append(
                types.Part.from_function_response(
                    name=result["name"],
                    response=result["response"],
                )
            )

        contents.append(types.UserContent(parts=tool_parts))


if __name__ == "__main__":
    asyncio.run(main())
```

This is the entire agent. The `while True` loop is doing the same thing we did by hand in the previous step — call the model, check for tool requests, execute them, send results back — but now it keeps going for as many rounds as needed. The model decides when to stop by responding with text instead of a tool call.

That's all an agent loop is. There's no scheduler, no planner, no orchestration framework. Just a model in a loop with tools, running until it's done.

## What Comes Next

We've gone from a model that can only talk to a model that can act in a loop, backed by a simple runtime that makes adding new tools trivial. 

But a deep research agent needs more than this. Right now the agent has no memory between iterations beyond the raw conversation history. It can't track what it's already investigate and there's no way to intercept the loop for logging or safety checks. 

In the next articles, we'll add those pieces one at a time: run state, context, lifecycle hooks, subagents, and a planning phase.Each one earns its place by solving a problem we can no longer ignore.

