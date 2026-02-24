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

The difference between a chatbot and an agent is simple: agents can act. Think of this as our Frankenstein moment: it's alive, and it can use tools.

Once we've implemented a simple tool calling loop, we'll push it one step further and let it write its own tools similar to Pi so that capability isn't frozen to whatever we shipped on day one.

Let's dive in and see how to get there.

## Our First Loop

If there's one thing that you take away from this entire series, it's that the main power of an agent is that it's able to iteratively understand what changes it needs to make so that it can complete its task.

Let's start by first defining a simple `read_file` tool for our agent.

```py
from google.genai import Client, types


def read_file(path: str) -> str:
    """Reads a text file and returns its contents."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as exc:
        return f"Failed to read '{path}': {exc}"


# 1. Setup
print("Welcome to Amie! (Type 'exit' to quit)")
client = Client()

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

We'll then extend on this logic by creating a function that represents a single "turn" for our agent.

```py
def run(client: Client, conversation: list[types.Content]) -> types.Content | None:
    """
    Runs a single step of the agent.
    Returns a tool response message if tools were called, or None if the agent is done.
    """
    # 1. Let the model think and generate a response
    completion = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=conversation,
        config=types.GenerateContentConfig(tools=[read_file_tool]),
    )

    message = completion.candidates[0].content
    conversation.append(message)

    # 2. Check for function calls
    function_calls = [
        part.function_call for part in message.parts if part.function_call
    ]

    # 3. Base Case: The agent is done. Return None.
    if not function_calls:
        text_parts = [part.text for part in message.parts if part.text]
        print(f"Amie: {''.join(text_parts)}")
        return None

    # 4. Action Case: Execute tools
    tool_responses: list[types.Part] = []
    for call in function_calls:
        print(f"[Agent Action] Running '{call.name}' with args: {call.args}")

        # NOTE: If you wanted an approval queue, you could pause here!
        if call.name == "read_file":
            result = read_file(call.args.get("path", ""))

            tool_responses.append(
                types.Part.from_function_response(
                    name=call.name,
                    response={"result": result},
                )
            )

    # Return the formatted tool responses as a tool message
    return types.Content(role="user", parts=tool_responses)
```

The run function is the core of our agent's turn, encapsulating a single cycle of its logic. It sends the entire conversation history to the Gemini model, along with the read_file_tool to let the model know what capabilities it has. The function then inspects the model's response to see what it decided to do.

This leads to two possibilities.

1. If the model provides a direct text answer, the agent's task is complete for now. The function prints this answer and returns None, signaling the main loop to stop.

2. If the model asks to use a tool, the function executes the corresponding Python code, captures the result, and packages it into a special 'tool response' message.

It then returns this message, which gets added back into the conversation, allowing the model to see the outcome of its chosen action and continue the process.

Lastly, let's write it up together so that when the agent makes a tool call, we'll be able to allow it to make another call.

```py
conversation: list[types.Content] = []

while True:
    user_input = input("\nYou: ").strip()
    if user_input.lower() in ["exit", "quit"]:
        break

    conversation.append(types.Content(role="user", parts=[types.Part(text=user_input)]))

    # The Agent Loop is now beautifully simple
    while True:
        # Run one step of the agent
        next_message = run(client, conversation)

        # If it returns None, the agent has finished answering
        if next_message is None:
            break

        # Otherwise, it returned a tool result. Append it and loop!
        conversation.append(next_message)
```

Let's see some sample output below.

```text
Welcome to Amie! (Type 'exit' to quit)

You: hi there can u tell me what's in README.md?
[Agent Action] Running 'read_file' with args: {'path': 'README.md'}
Amie: The `README.md` file contains the following:

# Building a coding agent

Here's a workshop on how to build up to a simple coding agent Amie!
```

This is some pretty cool stuff! Now we've got an agent that's able to read files and answer questions in your code base.

Right now if we type `readme` instead of `README.md` for instance, our agent isn't able to resolve the difference. We're going to need to give it more tools in order for it to be able to work it's magic.

## Creating A Factory

Now that we've seen tool calling in action, we'll now make it easier to define tools so that down the line our model can do it itself automatically.

First let's define a simple Pydantic base model to generate a valid tool call definition.

```py
from pydantic import BaseModel
from google.genai import types
import os


class AgentTool(BaseModel):
    @classmethod
    def to_genai_schema(cls):
        json_schema = cls.model_json_schema()
        return types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=json_schema["title"],
                    description=json_schema.get(
                        "description", f"Call the {json_schema['title']} tool"
                    ),
                    parameters=types.Schema(
                        type="OBJECT",
                        properties=json_schema["properties"],
                        required=json_schema.get("required", []),
                    ),
                )
            ]
        )

    def execute(self):
        """Override this in subclasses to define tool logic."""
        raise NotImplementedError(
            f"Execute not implemented for {self.__class__.__name__}"
        )


class ReadFile(AgentTool):
    path: str

    def execute(self, **kwargs):
        if not os.path.exists(self.path) or not os.path.isfile(self.path):
            return {"ok": False, "error": f"Path does not exist: {self.path}"}

        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return {"ok": True, "result": f.read()}
        except Exception as e:
            return {"ok": False, "error": f"Failed to read '{self.path}': {e}"}

```

We can then define a simple `AgentRuntime` here which will register a set of given tools and their execution methods

```py
class AgentRuntime:
    """Minimal runtime that exposes registered tools for the model."""

    def __init__(self):
        self.tools: dict[str, Type[AgentTool]] = {}

    def get_tools(self) -> list[types.Tool]:
        return [tool_cls.to_genai_schema() for tool_cls in self.tools.values()]

    def register_tool(self, tool_cls: Type[AgentTool]):
        self.tools[tool_cls.__name__] = tool_cls

    def execute_tool(self, tool_name: str, args: dict):
        tool_cls = self.tools.get(tool_name)
        if tool_cls is None:
            return {"ok": False, "error": f"Unknown tool: {tool_name}"}
        try:
            tool_input = tool_cls.model_validate(args or {})
            return tool_input.execute()
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
```

We can then instantiate our previous readFile to be part of the list of tools as seen below

```py
def get_default_runtime():
    default_runtime = AgentRuntime()
    default_runtime.register_tool(ReadFile)
    return default_runtime
```

Once we've done this, we can then plug it into our original agent code with a few modifications.

```py
conversation: list[types.Content] = []
client = Client()

# We now need to have this runtime here
runtime = get_default_runtime()
while True:
    user_input = input("\nYou: ").strip()
    if user_input.lower() in ["exit", "quit"]:
        break

    conversation.append(types.Content(role="user", parts=[types.Part(text=user_input)]))

    # The Agent Loop is now beautifully simple
    while True:
        # Run one step of the agent and pass the runtime in
        next_message = run(client, conversation, runtime=runtime)

        # If it returns None, the agent has finished answering
        if next_message is None:
            break

        # Otherwise, it returned a tool result. Append it and loop!
        conversation.append(next_message)

```

Now let's add in a few more tools - the same that Pi has for its coding agents. These will be `Write` , `Bash` and `Edit`.

```py

class Write(AgentTool):
    path: str
    content: str

    def execute(self, **kwargs):
        try:
            parent = os.path.dirname(self.path)
            if parent:
                os.makedirs(parent, exist_ok=True)

            with open(self.path, "w", encoding="utf-8") as f:
                f.write(self.content)

            return {"ok": True, "result": f"Wrote {len(self.content)} chars to {self.path}"}
        except Exception as e:
            return {"ok": False, "error": f"Failed to write '{self.path}': {e}"}


class Edit(AgentTool):
    path: str
    old_str: str
    new_str: str
    replace_all: bool = False

    def execute(self, **kwargs):
        if not os.path.exists(self.path) or not os.path.isfile(self.path):
            return {"ok": False, "error": f"Path does not exist: {self.path}"}

        try:
            with open(self.path, "r", encoding="utf-8") as f:
                original = f.read()
        except Exception as e:
            return {"ok": False, "error": f"Failed to read '{self.path}': {e}"}

        if self.old_str not in original:
            return {"ok": False, "error": f"old_str not found in {self.path}"}

        occurrences = original.count(self.old_str)
        if not self.replace_all and occurrences > 1:
            return {
                "ok": False,
                "error": (
                    "old_str appears multiple times; set replace_all=True "
                    "or provide a more specific old_str"
                ),
            }

        if self.replace_all:
            updated = original.replace(self.old_str, self.new_str)
            replacements = occurrences
        else:
            updated = original.replace(self.old_str, self.new_str, 1)
            replacements = 1

        try:
            with open(self.path, "w", encoding="utf-8") as f:
                f.write(updated)
            return {"ok": True, "result": f"Applied {replacements} edit(s) to {self.path}"}
        except Exception as e:
            return {"ok": False, "error": f"Failed to write '{self.path}': {e}"}


class Bash(AgentTool):
    command: str
    working_dir: str = "."
    timeout_seconds: int = 30

    def execute(self, **kwargs):
        if self.timeout_seconds <= 0:
            return {"ok": False, "error": "timeout_seconds must be > 0"}

        if not os.path.isdir(self.working_dir):
            return {"ok": False, "error": f"Invalid working directory: {self.working_dir}"}

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
            return {
                "ok": True,
                "result": {
                    "exit_code": completed.returncode,
                    "stdout": completed.stdout,
                    "stderr": completed.stderr,
                },
            }
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "error": f"Command timed out after {self.timeout_seconds}s",
            }
        except Exception as e:
            return {"ok": False, "error": f"Bash execution failed: {e}"}
```

With this we've got a working coding agent that can make changes, run unrestricted bash commands and then go wild.

## Self Extending

One of the coolest things I like about the `pi` coding agent is that it has the ability to define its own tools. It can then reload them as needed.

We'll implement something similar and use the last modified time of the agent_tools file to determine whether we should reload it.

```py
import importlib
from pathlib import Path

import agent_tools
from google.genai import Client, types


TOOLS_FILE = Path(agent_tools.__file__).resolve()


def mtime(path: str | Path) -> float:
    return Path(path).stat().st_mtime


runtime = agent_tools.get_default_runtime()
last_modified = mtime(TOOLS_FILE)


def maybe_reload_runtime() -> bool:
    global runtime, last_modified, agent_tools, TOOLS_FILE

    current = mtime(TOOLS_FILE)
    if current != last_modified:
        agent_tools = importlib.reload(agent_tools)
        TOOLS_FILE = Path(agent_tools.__file__).resolve()
        runtime = agent_tools.get_default_runtime()
        last_modified = mtime(TOOLS_FILE)
        return True

    return False
```

The logic here is relatively straightforward

1. We have a agent_tools file here which is used to track the existing list of tools that a model has

2. In our main agent file, we use `mtime` so that we know whether the file has been modified since we last loaded the tools. If it has been, then we just reload the tools.

And it works relatively well, see below an example below where the model wrote its own tool to generate timestamped txt files containg the word `hello world`

```text
...other stuff above
[Agent Action] Running 'Edit' with args: {'new_str': '    default_runtime.register_tool(Edit)\n    default_runtime.register_tool(Bash)\n    default_runtime.register_tool(GenerateTimestamp)\n    return default_runtime\n', 'path': '2 - Giving Our Agent Hands/agent_tools.py', 'old_str': '    default_runtime.register_tool(Edit)\n    default_runtime.register_tool(Bash)\n    return default_runtime\n'}
[Agent Action] Running 'GenerateTimestamp' with args: {}
[Agent Action] Running 'Bash' with args: {'command': 'ls "2 - Giving Our Agent Hands/"'}
[Agent Action] Running 'GenerateTimestamp' with args: {}
Amie: The tool is now available and I've successfully generated another timestamped file. Let me know what else you'd like to do!
```

## Wrapping Up

Let's take a step back and see what we've accomplished.

1. **A tool-calling loop**: We built a simple `run` function that lets our agent decide whether to respond with text or call a tool, then loop until it's done thinking.
2. **A tool factory**: We created an `AgentTool` base class and an `AgentRuntime` that makes defining new tools as simple as writing a Pydantic model with an `execute` method.
3. **Self-extension**: We gave the agent the ability to write its own tools and hot-reload them — capability is no longer frozen at deploy time.

In the next post, we'll clean up the logic in `run` and our runtime into a single `Agent` class.

This will make it simple to add hooks — like sending Telegram notifications when the agent finishes a task — and set us up for the more interesting problems ahead: planning, error recovery, and keeping the agent on track.
