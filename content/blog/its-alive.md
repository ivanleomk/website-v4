---
title: "It's alive!"
date: 2026-02-23
description: Allowing an agent to modify itself with tools
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Openclawd From Scratch
---

> The code for this article is available [here](https://github.com/hugobowne/build-your-own-ai-assistant/tree/main/1%20-%20It's%20Alive).

The difference between a chatbot and an agent is simple: agents can act. Think of this as our Frankenstein moment: it's alive, and it can use tools. For instance, let's say we wanted to find a great restaurant for dinner in Singapore, we might perform the following steps

1. `search_web` : We'll first look up some popular restaurants in Singapore and have a small shortlist of websites to check out
2. `get_page`: For each website we would then get the content of the page, read what they have to say and then see if that's a restaurant we might want to go to
3. `find_availability`: At this point, we would then check the availability of the restaurants that we'd shortlisted
4. `make_reservation` : Finally, we would then make a reservation for the restaurant that we want

Because we were able to iteratively search for information and take actions (Eg. make a reservation ), we were able to achieve our task in the end. Similarly, agents need the right set of tools to be able to perform their job.

In this article, we'll implement a simple agent from scratch that has the ability to call tools in a loop and write its own tools to extend its functionality.

We'll be using the Gemini Python SDK in this series because I like the flash series of models. They're pretty good and at $3/1M tokens, relatively affordable for running something like this. We'll be using uv to manage our dependencies and you can [install it here](https://docs.astral.sh/uv/).

## The Tool Calling Loop

For any agent, the tool calling loop roughly works like this

1. `user_message` : The user sends a message
2. `tool_call` : The model decides to call a tool
3. `tool_response` : We execute the tool and then tell the model the result of executing the tool

We then keep iterating until the model decides it doesn't need to call any tools anymore. This iterative process allows an agent to complete its task by either getting more information or making changes.

Let's start by installing the `google-genai` python sdk and `rich` for nice printing/formatting.

```bash
uv pip install google-genai rich
```

then defining a `read_file` tool for our agent.

```py
from google.genai import Client, types

read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(type="STRING", description="File path")
                },
                required=["path"],
            ),
        )
    ]
)
```

We can then call this tool by instantiating an instance of the `Client` and then providing a simple prompt to call the gemini models with. For Gemini, this uses the `generate_content` method as seen below.

```py
from google.genai import Client, types
from rich import print

read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(type="STRING", description="File path")
                },
                required=["path"],
            ),
        )
    ]
)

client = Client()

completion = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=[{"role": "user", "parts": [{"text": "Can u read the ./README.md file"}]}],
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)

print(completion)
```

This will output a pretty large object in its response. Let's break it down and see what we want.

```py
GenerateContentResponse(
    sdk_http_response=HttpResponse(
        headers={
            'content-type': 'application/json; charset=UTF-8',
            'vary': 'Origin, X-Origin, Referer',
            'content-encoding': 'gzip',
            'date': 'Wed, 25 Feb 2026 04:08:21 GMT',
            'server': 'scaffolding on HTTPServer2',
            'x-xss-protection': '0',
            'x-frame-options': 'SAMEORIGIN',
            'x-content-type-options': 'nosniff',
            'server-timing': 'gfet4t7; dur=2181',
            'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
            'transfer-encoding': 'chunked'
        },
        body=None
    ),
    candidates=[
        Candidate(
            content=Content(
                parts=[
                    Part(
                        media_resolution=None,
                        code_execution_result=None,
                        executable_code=None,
                        file_data=None,
                        function_call=FunctionCall(
                            id=None,
                            args={'path': './README.md'},
                            name='read_file',
                            partial_args=None,
                            will_continue=None
                        ),
                        function_response=None,
                        inline_data=None,
                        text=None,
                        thought=None,
                        thought_signature="....some byte here",
                        video_metadata=None
                    )
                ],
                role='model'
            ),
            citation_metadata=None,
            finish_message=None,
            token_count=None,
            finish_reason=<FinishReason.STOP: 'STOP'>,
            avg_logprobs=None,
            grounding_metadata=None,
            index=0,
            logprobs_result=None,
            safety_ratings=None,
            url_context_metadata=None
        )
    ],
    create_time=None,
    model_version='gemini-3-flash-preview',
    prompt_feedback=None,
    response_id='tXWead7OB-e8qfkPvM30oQ4',
    usage_metadata=GenerateContentResponseUsageMetadata(
        cache_tokens_details=None,
        cached_content_token_count=None,
        candidates_token_count=19,
        candidates_tokens_details=None,
        prompt_token_count=63,
        prompt_tokens_details=[ModalityTokenCount(modality=<MediaModality.TEXT: 'TEXT'>, token_count=63)],
        thoughts_token_count=29,
        tool_use_prompt_token_count=None,
        tool_use_prompt_tokens_details=None,
        total_token_count=111,
        traffic_type=None
    ),
    automatic_function_calling_history=None,
    parsed=None
)
```

Since we want to build an agent, what we want is to get the function calls of the model, which you can get from the `candidates` portion

```text
 candidates=[
        Candidate(
            content=Content(
                parts=[
                    Part(
                        media_resolution=None,
                        code_execution_result=None,
                        executable_code=None,
                        file_data=None,
                        function_call=FunctionCall(
                            id=None,
                            args={'path': './README.md'},
                            name='read_file',
                            partial_args=None,
                            will_continue=None
                        ),
                        function_response=None,
                        inline_data=None,
                        text=None,
                        thought=None,
                        thought_signature="....some byte here",
                        video_metadata=None
                    )
                ],
                role='model'
            )
 ]
```

We can see that in the `function_call` section, we have the `args` and the `name` of the tool to call. Tool calling enables us to know that when our model is executing its task, it will call a fixed set of potentials tools and that all the tools will have a guaranteed set of arguments.

Let's now see how we might execute a tool and then append the result to the conversation history so that the model can process the result of a tool that it's calling.

```py
from google.genai import Client, types
from rich import print

read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(type="STRING", description="File path")
                },
                required=["path"],
            ),
        )
    ]
)


def read_file(path: str) -> str:
    """Reads a text file and returns its contents."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as exc:
        return f"Failed to read '{path}': {exc}"


client = Client()

contents = [
    types.UserContent(
        parts=[types.Part.from_text(text="Can u read the ./README.md file")]
    )
]

completion = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=contents,
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)

fc = completion.candidates[0].content.parts[0].function_call

if fc:
    print(fc.name)
    print(fc.args)
    if fc.name == "read_file":
        path = (fc.args or {}).get("path", "./README.md")
        # Reuse model content to preserve function-call thought signatures.
        contents.append(completion.candidates[0].content)
        contents.append(
            types.UserContent(
                parts=[
                    types.Part.from_function_response(
                        name=fc.name,
                        response={"path": path, "content": read_file(path)},
                    )
                ]
            )
        )

completion = client.models.generate_content(
    model="gemini-3-flash-preview",
    contents=contents,
    config=types.GenerateContentConfig(tools=[read_file_tool]),
)
print(completion)
```

Going back to just the candidates that are generated, we can then see that the model is able to determine that we need to read the README file when we say that `Can u read the ./README.md file` and that once we provide it with the content of the readme file, the response in its final response is as follows.

```py
Candidate(
    content=Content(
        parts=[
            Part(
                media_resolution=None,
                code_execution_result=None,
                executable_code=None,
                file_data=None,
                function_call=None,
                function_response=None,
                inline_data=None,
                text='The `./README.md` file describes **Koroku**, a project designed to teach how to build a coding agent step by step. The repository is structured into four progressive stages:\n\n### Project Overview\n- **Stage 1: Building Our First Agent** - A minimal ...(rest of conten)',
                thought=None,
                thought_signature="....thought signature"
                video_metadata=None
            )
        ],
        role='model'
    ),
)
```

We can see that the response now only contains the `text` field which indicates that the model has chosen to respond with a text response.

To summarise, the LLM tool calling loop is relatively straightforward. The model either decides to call one or more tools or respond with pure text. As long as we see functions being called, we should do another turn. If not, we can stop and return control to the user.

## Cleaning up the code

Now that we've manually run the logic above, let's extend our logic and create a function that represents a single `turn` for our agent.

Since we'll be dealing with async functionality later down the line (Eg. Telegram), we'll make `run` an async function from the get go.

```py
import asyncio

from google.genai import Client, types
from rich import print
from typing import Literal, TypeAlias, TypedDict

read_file_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="read_file",
            description="Read a text file and return its contents.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "path": types.Schema(type="STRING", description="File path"),
                },
                required=["path"],
            ),
        )
    ]
)


def read_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as exc:
        return f"Failed to read '{path}': {exc}"


class FunctionResponseRunResult(TypedDict):
    kind: Literal["function_response"]
    message: types.UserContent


RunResult: TypeAlias = None | FunctionResponseRunResult


async def run(
    client: Client, contents: list[types.Content]
) -> tuple[types.Content, RunResult]:
    completion = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=contents,
        config=types.GenerateContentConfig(tools=[read_file_tool]),
    )

    message = completion.candidates[0].content

    function_calls = [
        part.function_call for part in message.parts if part.function_call
    ]
    if not function_calls:
        return message, None

    tool_responses: list[types.Part] = []
    for call in function_calls:
        if not call or call.name != "read_file":
            continue

        path = (call.args or {}).get("path", "")
        print(f"[Agent Action] read_file(path={path!r})")
        result = read_file(path)
        tool_responses.append(
            types.Part.from_function_response(
                name=call.name,
                response={"path": path, "content": result},
            )
        )

    if not tool_responses:
        return message, None
    return message, {
        "kind": "function_response",
        "message": types.UserContent(parts=tool_responses),
    }


async def main() -> None:
    client = Client()
    contents: list[types.Content] = []

    print("Type 'exit' or 'quit' to stop.")
    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            break
        if not user_input:
            continue

        contents.append(
            types.UserContent(parts=[types.Part.from_text(text=user_input)])
        )
        while True:
            assistant_message, tool_result = await run(client, contents)
            contents.append(assistant_message)
            if tool_result is None:
                for part in assistant_message.parts:
                    if part.text:
                        print(f"\nAssistant: {part.text}")
                break
            assert tool_result["kind"] == "function_response"
            contents.append(tool_result["message"])


if __name__ == "__main__":
    asyncio.run(main())
```

Let's see some sample output below.

```text
You: hi there can you read what's in README.md?
[Agent Action] read_file(path='README.md')

Assistant: The `README.md` file describes **Koroku**, a workshop-style codebase for building a coding agent step-by-step. The repository is
organized into four main stages:

1.  **Building Our First Agent**: A minimal chat loop with Gemini and a basic `read_file` tool.
2.  **Giving Our Agent Hands**: Introducing a reusable runtime, typed tool classes (Read, Write, Edit, Bash), and an async agent loop with
hot-reloading.
3.  **Integrating Telegram**: Exposing the agent via a FastAPI server and a Telegram bot....(rest of text)
```

This is some pretty cool stuff! Now we've got an agent that's able to read files and answer questions in your code base.

Right now if we type `readme` instead of `README.md` for instance, our agent isn't able to resolve the difference. We're going to need to give it more tools in order for it to be able to work its magic.

## Creating A Factory

Now that we've seen tool calling in action, we'll now make it easier to define tools so that down the line our model can do it itself automatically.

We'll define a few types first to make our lives easier in an `agent_tools.py` file which will only store tool specific logic.

1. `AgentContext` : Since we'll be sharing dependencies between different tools, we'll store them inside an AgentContext object that's accessible inside every single execute call

2. `ToolResult` : We'll also define a simple ToolResult that makes it easy for us to instantiate and store the result of the tool call in it. Let's see this in action.

```py
from abc import ABC, abstractmethod
from typing import Any, Awaitable
from pydantic import BaseModel
from google.genai import types
import os
import subprocess

# Empty for now
class AgentContext:
    pass


class ToolResult(BaseModel):
    error: bool
    name: str
    response: dict[str, Any]

    model_config = {"arbitrary_types_allowed": True}

    def to_genai_message(self):
        return types.Part.from_function_response(name=self.name, response=self.response)
```

We'll now create a base `AgentTool` class which implements most of the basic methods that we'll need to handle tool calling

```py
class AgentTool(BaseModel, ABC):
    @classmethod
    def tool_name(cls) -> str:
        return cls.__name__

    def tool_result(self, *, error: bool, response: dict[str, Any]) -> ToolResult:
        return ToolResult(error=error, name=self.__class__.tool_name(), response=response)

    @classmethod
    def to_genai_schema(cls):
        json_schema = cls.model_json_schema()
        tool_name = cls.tool_name()
        return types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=tool_name,
                    description=json_schema.get(
                        "description", f"Call the {tool_name} tool"
                    ),
                    parameters=types.Schema(
                        type="OBJECT",
                        properties=json_schema["properties"],
                        required=json_schema.get("required", []),
                    ),
                )
            ]
        )

    @abstractmethod
    def execute(self, _context: AgentContext) -> Awaitable[ToolResult]:
        """Override this in subclasses to define tool logic."""
        raise NotImplementedError
```

We can then rewrite our original `readFile` tool here to use this `AgentTool` class

```py
class ReadFile(AgentTool):
    path: str

    async def execute(self, _context: AgentContext) -> ToolResult:
        if not os.path.exists(self.path) or not os.path.isfile(self.path):
            return self.tool_result(error=True, response={"error": "File does not exist"})

        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return self.tool_result(
                    error=False,
                    response={
                        "file_content": f"""
File {self.path} was read

<content>
{f.read()}
</content>
"""
                    },
                )

        except Exception as e:
            return self.tool_result(
                error=True,
                response={"error": f"Failed to read '{self.path}': {e}"},
            )

TOOLS = [ReadFile]
```

We can then define an `AgentRuntime` class in our main `agent.py` file so that it's easy for us to easily manage the tools that we have on hand. This will act like a tool registry that the model can use to reload/add new tools as needed as you'll see in the next section.

```py
from agent_tools import TOOLS, AgentTool, ToolResult, AgentContext
from typing import Any, Literal, Type, TypeAlias, TypedDict
from google.genai import types, Client
import asyncio


class AgentRuntime:
    """Minimal runtime that exposes registered tools for the model."""

    def __init__(self, context: AgentContext):
        self.tools: dict[str, type[AgentTool]] = {tool.__name__: tool for tool in TOOLS}
        self.context = context

    def get_tools(self) -> list[types.Tool]:
        return [tool_cls.to_genai_schema() for tool_cls in self.tools.values()]

    def register_tool(self, tool_cls: Type[AgentTool]):
        self.tools[tool_cls.__name__] = tool_cls

    async def execute_tool(
        self, tool_name: str, args: dict[str, Any]
    ) -> ToolResult | types.Part:
        tool_cls = self.tools.get(tool_name)
        if tool_cls is None:
            return ToolResult(
                error=True,
                name=tool_name,
                response={"Error": f"Unknown tool: {tool_name}"},
            )

        try:
            tool_input = tool_cls.model_validate(args)
            return await tool_input.execute(self.context)
        except Exception as exc:
            return ToolResult(
                error=True,
                name=tool_name,
                response={"error": str(exc)},
            )
```

Now let's update our existing `run` function so that we now use this Runtime that we've defined.

```py
async def run(
    client: Client, contents: list[types.Content], runtime: AgentRuntime
) -> tuple[types.Content, RunResult]:
    completion = await client.aio.models.generate_content(
        model="gemini-3-flash-preview",
        contents=contents,
        config=types.GenerateContentConfig(tools=runtime.get_tools()),
    )

    message = completion.candidates[0].content

    function_calls = [
        part.function_call for part in message.parts if part.function_call
    ]
    if not function_calls:
        return message, None

    tool_responses: list[types.Part] = []
    for call in function_calls:
        result = await runtime.execute_tool(call.name, call.args)
        print(f"Tool Call: [{call.name}:{call.args}]\n:{result.response}")
        tool_responses.append(result.to_genai_message())

    if not tool_responses:
        return message, None
    return message, {
        "kind": "function_response",
        "message": types.UserContent(parts=tool_responses),
    }
```

We can then update our `main` function so that we intialise the runtime and the context as needed

```py
async def main() -> None:
    client = Client()
    contents: list[types.Content] = []
    context = AgentContext()
    runtime = AgentRuntime(context=context)

    print("Type 'exit' or 'quit' to stop.")
    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            break
        if not user_input:
            continue

        contents.append(
            types.UserContent(parts=[types.Part.from_text(text=user_input)])
        )
        while True:
            assistant_message, tool_result = await run(client, contents, runtime)
            contents.append(assistant_message)
            if tool_result is None:
                for part in assistant_message.parts:
                    if part.text:
                        print(f"\nAssistant: {part.text}")
                break
            assert tool_result["kind"] == "function_response"
            contents.append(tool_result["message"])


if __name__ == "__main__":
    asyncio.run(main())

```

### Adding More Tools

Now that we've got this in place, let's see how easy it is to add new tools. We'll be adding in the same tools that Pi has for its coding agents. These will be `Write` , `Bash` and `Edit`. To do so, we'll create three new classes that inherit from the `AgentTool` class.

```py
class Write(AgentTool):
    path: str
    content: str

    async def execute(self, _context: AgentContext) -> ToolResult:
        try:
            parent = os.path.dirname(self.path)
            if parent:
                os.makedirs(parent, exist_ok=True)

            with open(self.path, "w", encoding="utf-8") as f:
                f.write(self.content)

            return self.tool_result(
                error=False,
                response={"result": f"successfully wrote content to {self.path}"},
            )
        except Exception as e:
            return self.tool_result(
                error=True,
                response={"error": f"Failed to write '{self.path}': {e}"},
            )


class Edit(AgentTool):
    path: str
    old_str: str
    new_str: str
    replace_all: bool = False

    async def execute(self, _context: AgentContext) -> ToolResult:
        if not os.path.exists(self.path) or not os.path.isfile(self.path):
            return self.tool_result(
                error=True,
                response={"error": f"Path does not exist: {self.path}"},
            )

        try:
            with open(self.path, "r", encoding="utf-8") as f:
                original = f.read()
        except Exception as e:
            return self.tool_result(
                error=True,
                response={"error": f"Failed to read '{self.path}': {e}"},
            )

        if self.old_str not in original:
            return self.tool_result(
                error=True,
                response={"error": f"old_str not found in {self.path}"},
            )

        occurrences = original.count(self.old_str)
        if not self.replace_all and occurrences > 1:
            return self.tool_result(
                error=True,
                response={
                    "error": (
                        "old_str appears multiple times; set replace_all=True or provide a more specific old_str"
                    )
                },
            )

        if self.replace_all:
            updated = original.replace(self.old_str, self.new_str)
            replacements = occurrences
        else:
            updated = original.replace(self.old_str, self.new_str, 1)
            replacements = 1

        try:
            with open(self.path, "w", encoding="utf-8") as f:
                f.write(updated)
            return self.tool_result(
                error=False,
                response={"result": f"Applied {replacements} edit(s) to {self.path}"},
            )
        except Exception as e:
            return self.tool_result(
                error=True,
                response={"error": f"Failed to write '{self.path}': {e}"},
            )


class Bash(AgentTool):
    command: str
    working_dir: str = "."
    timeout_seconds: int = 30

    async def execute(self, _context: AgentContext) -> ToolResult:
        if self.timeout_seconds <= 0:
            return self.tool_result(
                error=True,
                response={"error": "timeout_seconds must be > 0"},
            )

        if not os.path.isdir(self.working_dir):
            return self.tool_result(
                error=True,
                response={"error": f"Invalid working directory: {self.working_dir}"},
            )

        try:
            completed = subprocess.run(
                self.command,
                shell=True,
                cwd=self.working_dir,
                text=True,
                capture_output=True,
                timeout=self.timeout_seconds,
                check=False,
            )
            return self.tool_result(
                error=False,
                response={
                    "result": (
                        "Executed command successfully\n\n"
                        "<output>\n"
                        f"{completed.stdout}{completed.stderr}"
                        "</output>"
                    )
                },
            )
        except subprocess.TimeoutExpired:
            return self.tool_result(
                error=True,
                response={
                    "error": f"Command timed out after {self.timeout_seconds}s",
                },
            )
        except Exception as e:
            return self.tool_result(
                error=True,
                response={"error": f"Bash execution failed: {e}"},
            )


TOOLS = [ReadFile, Write, Edit, Bash]
```

With this we've got a working coding agent that can make changes, run unrestricted bash commands and then go wild.

## Self Extending

One of the coolest things I like about the `pi` coding agent is that it has the ability to define its own tools. It can then reload them as needed.

We'll implement something similar and use the last modified time of the agent_tools file to determine whether we should reload it. Since we previously implemented our `AgentRuntime` class we can simply fold this into `get_tools` and `execute_tool` — checking the `mtime` of `agent_tools.py` before each call.

```py
class AgentRuntime:
    """Minimal runtime that exposes registered tools for the model."""

    def __init__(self, context: AgentContext):
        self._agent_tools_module = agent_tools
        self._tools_file = Path(self._agent_tools_module.__file__).resolve()
        self._last_modified = self._tools_file.stat().st_mtime
        self.tools: dict[str, type[AgentTool]] = {
            tool.__name__: tool for tool in self._agent_tools_module.TOOLS
        }
        self.context = context

    def maybe_reload_runtime(self) -> None:
        current = self._tools_file.stat().st_mtime
        if current == self._last_modified:
            return

        self._agent_tools_module = importlib.reload(self._agent_tools_module)
        self._tools_file = Path(self._agent_tools_module.__file__).resolve()
        self.tools = {tool.__name__: tool for tool in self._agent_tools_module.TOOLS}
        self._last_modified = self._tools_file.stat().st_mtime

    def get_tools(self) -> list[types.Tool]:
        self.maybe_reload_runtime()
        return [tool_cls.to_genai_schema() for tool_cls in self.tools.values()]

    def register_tool(self, tool_cls: Type[AgentTool]):
        self.tools[tool_cls.__name__] = tool_cls

    async def execute_tool(
        self, tool_name: str, args: dict[str, Any]
    ) -> ToolResult | types.Part:
        self.maybe_reload_runtime()
        tool_cls = self.tools.get(tool_name)
        if tool_cls is None:
            return ToolResult(
                error=True,
                name=tool_name,
                response={"Error": f"Unknown tool: {tool_name}"},
            )

        try:
            tool_input = tool_cls.model_validate(args)
            return await tool_input.execute(self.context)
        except Exception as exc:
            return ToolResult(
                error=True,
                name=tool_name,
                response={"error": str(exc)},
            )
```

The logic here is relatively straightforward

1. We have a agent_tools file here which is used to track the existing list of tools that a model has

2. In our main agent file, we use `mtime` so that we know whether the file has been modified since we last loaded the tools. If it has been, then we just reload the tools.

And it works relatively well, see below an example below where the model wrote its own tool to generate timestamped txt files containg the word `hello world`

```text
{'result': "Applied 1 edit(s) to 1 - It's Alive/agent_tools.py"}
Tool Call: [TimestampHello:{}]
{'result': 'Created hello_20260225_193542.txt'}
Tool Call: [Bash:{'command': 'ls hello_*.txt'}]
{'result': 'Executed command successfully\n\n<output>\nhello_20260225_193542.txt\n</output>'}
```

## Wrapping Up

Let's take a step back and see what we've accomplished.

1. **A tool-calling loop**: We built a simple `run` function that lets our agent decide whether to respond with text or call a tool, then loop until it's done thinking.
2. **A tool factory**: We created an `AgentTool` base class and an `AgentRuntime` that makes defining new tools as simple as writing a Pydantic model with an `execute` method.
3. **Self-extension**: We gave the agent the ability to write its own tools and hot-reload them — capability is no longer frozen at deploy time.

If you look at our code right now though, you'll notice that observability is hardcoded — we `print` tool calls inline, we `print` the assistant's reply, and that's it. If we wanted to log tool calls to a database, send a Telegram message when the agent finishes, or pause execution to ask the user for approval before running a dangerous bash command, we'd have to crack open `run` and scatter that logic everywhere.

What we really want is a way to say "whenever X happens, run this callback(s)" without touching the core loop. That's exactly what hooks give us — a clean extension point for things like approval gates, audit logging, notification systems, and progress tracking.

In the next post, we'll add in support for hooks and build in our first telegram integration for our little Koroku agent.
