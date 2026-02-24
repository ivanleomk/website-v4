---
title: "ET Phone Home"
date: 2026-02-24
description: Deploying our agent on Telegram with ngrok so it can report back
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Openclawd From Scratch
---

Our agent can read, write, and even extend itself — but right now it's stuck in a terminal. In this post we'll fix that by putting it on Telegram so you can message it from your phone and watch it work in real time.

The setup is dead simple: a local Python server, ngrok to expose it to the internet, and Telegram's Bot API to send and receive messages. No database, no deployment pipeline, no infrastructure to manage. We'll also refactor our loose `run` function and `AgentRuntime` into a single `Agent` class with hooks so that firing off a Telegram notification on every tool call is just a few lines of code.

Let's get into it.

## Centralising Our Logic

Last time we ended up with a standalone `run` function, a separate `AgentRuntime`, and a reload mechanism scattered across the top level of our script. It works, but it's awkward — state is everywhere and adding new behaviour means touching multiple places.

Let's fold everything into a single `Agent` class.

```py
import importlib
from pathlib import Path

import agent_tools
from google.genai import Client, types


class Agent:
    def __init__(self, model: str = "gemini-3-flash-preview"):
        self.model = model
        self.client = Client()

        self.tools_module = agent_tools
        self.tools_file = Path(self.tools_module.__file__).resolve()
        self.runtime = self.tools_module.get_default_runtime()
        self.last_modified = self._mtime(self.tools_file)

    @staticmethod
    def _mtime(path: str | Path) -> float:
        return Path(path).stat().st_mtime

    def maybe_reload_runtime(self) -> bool:
        current = self._mtime(self.tools_file)
        if current == self.last_modified:
            return False

        try:
            self.tools_module = importlib.reload(self.tools_module)
            self.tools_file = Path(self.tools_module.__file__).resolve()
            self.runtime = self.tools_module.get_default_runtime()
            self.last_modified = self._mtime(self.tools_file)
            print(f"[Tool Reload] Loaded tools from {self.tools_file.name}")
            return True
        except Exception as exc:
            print(f"[Tool Reload] Failed, keeping previous runtime: {exc}")
            return False

    def run(self, conversation: list[types.Content]) -> types.Content | None:
        """Run one assistant step. Returns tool-response message, or None when done."""
        self.maybe_reload_runtime()

        completion = self.client.models.generate_content(
            model=self.model,
            contents=conversation,
            config=types.GenerateContentConfig(tools=self.runtime.get_tools()),
        )

        message = completion.candidates[0].content
        conversation.append(message)

        function_calls = [
            part.function_call for part in message.parts if part.function_call
        ]

        if not function_calls:
            text_parts = [part.text for part in message.parts if part.text]
            print(f"Amie: {''.join(text_parts)}")
            return None

        tool_responses: list[types.Part] = []
        for call in function_calls:
            print(f"[Agent Action] Running '{call.name}' with args: {call.args}")
            tool_result = self.runtime.execute_tool(call.name, call.args or {})
            tool_responses.append(
                types.Part.from_function_response(
                    name=call.name,
                    response={"result": tool_result},
                )
            )

        return types.Content(role="user", parts=tool_responses)
```

The constructor sets up the Gemini client, loads our tools module, and snapshots its last-modified time. Every call to `run` starts with `maybe_reload_runtime` — the same hot-reload trick from last time, now living where it belongs.

The `run` method itself is unchanged in spirit: send the conversation to Gemini, check whether it replied with text or tool calls, execute any tools, and return the result. The only difference is that everything it needs — the client, model name, and runtime — lives on `self` instead of being passed around.

Our main loop gets a lot cleaner too.

```py
def main() -> None:
    print("Welcome to Amie! (Type 'exit' to quit)")
    conversation: list[types.Content] = []
    agent = Agent()

    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in ["exit", "quit"]:
            break

        conversation.append(
            types.Content(role="user", parts=[types.Part(text=user_input)])
        )

        while True:
            next_message = agent.run(conversation)
            if next_message is None:
                break
            conversation.append(next_message)


if __name__ == "__main__":
    main()
```

Two lines to create an agent and start chatting. More importantly, this gives us a clean seam to hook into — which is exactly what we need to wire up Telegram.

## Adding Hooks

Right now if we want to know what the agent is doing, we have to stare at the terminal. That's fine for debugging but useless when you're away from your desk.

What we really want is a way to say "every time a tool is called, do _this_" without hardcoding that logic into `run`. That's what hooks give us — simple callbacks registered against lifecycle events like `on_tool_call` and `on_response`. The agent fires them at the right moment, and whatever's on the other end decides what to do with it: print to stdout, send a Telegram message, log to a file, whatever.

This keeps the `Agent` class focused on orchestration while all the side-effect logic (notifications, logging, UI updates) lives outside it, easy to swap or combine. We'll make things simple and simply define these few hooks

1. `user_message_recieved` : This is when we execute our `.run` method and receive some user message or a function call result
2. `model_response` : This is what happens when we have the raw model response from the LLM call
3. `tool_executed`: This is what happens when we execute the tool that the model has provided

Let's start by adding these three hooks here to our `Agent` class

```py
HookType: TypeAlias = Literal[
    "user_message_received",
    "model_response",
    "tool_executed",
]
UserMessageHook: TypeAlias = Callable[[list[types.Content]], None]
ModelResponseHook: TypeAlias = Callable[[types.Content], None]
ToolExecutedHook: TypeAlias = Callable[[dict[str, Any], Exception | None], None]

@overload
def on(
    self, event: Literal["user_message_received"], handler: UserMessageHook
) -> "Agent":
    pass

@overload
def on(
    self, event: Literal["model_response"], handler: ModelResponseHook
) -> "Agent":
    pass

@overload
def on(self, event: Literal["tool_executed"], handler: ToolExecutedHook) -> "Agent":
    pass

def on(self, event: HookType, handler: Callable[..., None]) -> "Agent":
    self._hooks[event].append(handler)
    return self

def emit(self, event: HookType, *args: Any) -> None:
    for handler in self._hooks[event]:
        (handler)(*args)
```

We'll then implement support for these in our original `.run()` method

```py
def run(self, conversation: list[types.Content]) -> types.Content | None:
        """Run one assistant step. Returns tool-response message, or None when done."""
        self.maybe_reload_runtime()
        self.on("user_message_received", conversation)

        completion = self.client.models.generate_content(
            model=self.model,
            contents=conversation,
            config=types.GenerateContentConfig(tools=self.runtime.get_tools()),
        )

        message = completion.candidates[0].content
        conversation.append(message)
        self.emit("model_response", message)

        function_calls = [
            part.function_call for part in message.parts if part.function_call
        ]

        if not function_calls:
            return None

        tool_responses: list[types.Part] = []
        for call in function_calls:
            call_args = call.args or {}
            try:
                tool_result = self.runtime.execute_tool(call.name, call_args)
                execution = {"success": True, "result": tool_result}
                error: Exception | None = None
            except Exception as exc:
                execution = {"success": False, "error": str(exc)}
                error = exc
            self.emit(
                "tool_executed",
                {"name": call.name, "args": call_args, "execution": execution},
                error,
            )
            tool_responses.append(
                types.Part.from_function_response(
                    name=call.name,
                    response={"execution": execution},
                )
            )

        return types.Content(role="user", parts=tool_responses)
```

We can then refactor our original code to use a few simple handlers for each of these hooks.

```py
def print_llm_response(response: types.Content) -> None:
    for part in response.parts:
        if part.text:
            print(f"* {part.text}")


def print_llm_tool(response: ToolExecutionPayload) -> None:
    execution = response["execution"]
    if not execution.get("success"):
        print("X [Error Encountered]")
        print(response)
        return

    print(f"✓ {response['name']} : {response['args']}")
    result = execution.get("result")
    if result is not None:
        print(result)

def main() -> None:
    print("Welcome to Amie! (Type 'exit' to quit)")
    conversation: list[types.Content] = []
    agent = Agent()
    agent.on("model_response", print_llm_response)
    agent.on("tool_executed", print_llm_tool)

    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in ["exit", "quit"]:
            break

        conversation.append(
            types.Content(role="user", parts=[types.Part(text=user_input)])
        )

        while True:
            next_message = agent.run(conversation)
            if next_message is None:
                break
            conversation.append(next_message)


if __name__ == "__main__":
    main()
```

And with this we've migrated away from our messy console.log printing as seen below.

```py
Welcome to Amie! (Type 'exit' to quit)

You: hey there can u help me find out what's in the readme
✓ Bash : {'command': 'ls'}
{'ok': True, 'result': {'exit_code': 0, 'stdout': '__pycache__\n1 - Building Our First Agent\n2 - Giving Our Agent Hands\n3 - Integrating Telegram\nanalysis.md\narchive\ncode_analyzer.py\npyproject.toml\nREADME.md\nuv.lock\n', 'stderr': ''}}
✓ ReadFile : {'path': 'README.md'}
{'ok': True, 'result': "# Building a coding agent\n\nHere's a workshop on how to build up to a simple coding agent Koroku!\n"}
* The `README.md` file contains the following:

# Building a coding agent

Here's a workshop on how to build up to a simple coding agent Koroku!

You:
```

## Adding a server

Now in order for us to recieve messages from telegram, we need to have our agent be able to be called from an external process. To do so, we'll now add a server that we can use to send messages and trigger our agent locally.

Luckily this code is relatively mild since we can just reuse the previous `Agent` class that we defined. We can also reuse the same hooks that we previously built.

```py
from fastapi import FastAPI
from pydantic import BaseModel
from google.genai import types

from agent import Agent, ToolExecutionPayload

app = FastAPI()
agent = Agent()

# In-memory conversation store keyed by conversation_id
conversation = []


class ChatRequest(BaseModel):
    message: str


def print_llm_response(response: types.Content) -> None:
    for part in response.parts:
        if part.text:
            print(f"* {part.text}")


def print_llm_tool(response: ToolExecutionPayload) -> None:
    execution = response["execution"]
    if not execution.get("success"):
        print("X [Error Encountered]")
        print(response)
        return

    print(f"✓ {response['name']} : {response['args']}")
    result = execution.get("result")
    if result is not None:
        print(result)


@app.post("/chat", response_model=ChatRequest)
def chat(req: ChatRequest):
    print(f"You: {req.message}")
    conversation.append(
        types.Content(role="user", parts=[types.Part(text=req.message)])
    )
    agent.run(conversation)
    while True:
        next_message = agent.run(conversation)
        if next_message is None:
            break
        conversation.append(next_message)

    return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
```

When we call it via a fast api endpoint we see the following response in our logs

```text
INFO:     Started server process [9512]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
You: Read the README.md file and summarize it for me
✓ Bash : {'command': 'ls -F'}
{'ok': True, 'result': {'exit_code': 0, 'stdout': '__pycache__/\n1 - Building Our First Agent/\n2 - Giving Our Agent Hands/\n3 - Integrating Telegram/\nanalysis.md\narchive/\ncode_analyzer.py\npyproject.toml\nREADME.md\nuv.lock\n', 'stderr': ''}}
✓ ReadFile : {'path': 'README.md'}
{'ok': True, 'result': "# Building a coding agent\n\nHere's a workshop on how to build up to a simple coding agent Koroku!\n"}
* The `README.md` file introduces a workshop designed to guide users through the process of building a simple coding agent named **Koroku**.

Based on the project structure, the workshop appears to be organized into three main stages:
1.  **Building Our First Agent**: Setting up the core logic of the agent.
2.  **Giving Our Agent Hands**: Enabling the agent to interact with its environment (likely through tools or file system access).
3.  **Integrating Telegram**: Connecting the agent to a messaging interface for interaction.
```

Here's a simple python snippet that I used to call this endpoint.

```py
import requests

response = requests.post(
    "http://localhost:8000/chat",
    json={"message": "Can you also read the server.py file and explain what's there"},
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

As long as our server does not restart our conversation is going to be kept working nice and dandy. Let's now see hook this up to telegram and get our bot working nicely with it.

## Integrating Telegram

The first step to use a bot on telegram is to get a bot from the `botfather` on Telegram. This is a relatively straightforward process. By the end of it, you should get a bot token and a bot URL.

Let's store our bot token as `TELEGRAM_BOT_TOKEN` in a `.env` file in our project base folder

```text
TELEGRAM_BOT_TOKEN=<token here>
```

You'll also need to get your Telegram ID so you can whitelist messages coming in from it. This way we can prevent people from illegally accessing your local agent. The easiest way to do so is to just go to `userinfobot`, open telegram and then message it. It will respond with your numeric user ID.

```py
WHITELIST_TELEGRAM_IDS=<your id here>
```

Then let's install a library called `python-telegram-bot` and `python-dotenv` which will help us integrate and work with telegram nicely.

```
uv pip install python-telegram-bot python-dotenv
```

Now, we need a way to expose our server to the world. For this we'll use a simple `ngrok` server which we'll expose with port 8000. This gives us a public address that Telegram can now hit.

```
ngrok http 8000
```

This will give you a forwarding URL like `https://abc123.ngrok-free.app`. Copy that — we'll need it to tell Telegram where to send messages.

### Setting the Webhook

Telegram uses webhooks to deliver messages. Instead of us polling for new messages, Telegram pushes them to our server whenever someone sends a message to our bot. We just need to tell Telegram which URL to hit.

We can do this with a simple `curl` command. Replace `<BOT_TOKEN>` with your token and `<NGROK_URL>` with the forwarding URL from above:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<NGROK_URL>/chat"
```

You should get back a response like `{"ok":true,"result":true,"description":"Webhook was set"}`. Now every message sent to your bot will be forwarded as a POST request to your `/chat` endpoint.

### Wiring It All Up

With the webhook set, we need to update our server to handle Telegram's update format instead of our simple `ChatRequest`. Here's the full server code:

```py
import os
from contextvars import ContextVar
from collections import defaultdict
from typing import Any
import asyncio

from dotenv import load_dotenv
from fastapi import FastAPI
from google.genai import types
from telegram import Bot, Update

from agent import Agent, ToolExecutionPayload

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("Missing TELEGRAM_BOT_TOKEN in .env")

WHITELIST_TELEGRAM_IDS = {
    int(chat_id.strip())
    for chat_id in os.getenv("WHITELIST_TELEGRAM_IDS", "").split(",")
    if chat_id.strip()
}

app = FastAPI()
agent = Agent()
bot = Bot(token=TELEGRAM_BOT_TOKEN)
CURRENT_CHAT_ID: ContextVar[int | None] = ContextVar("current_chat_id", default=None)

# In-memory conversation store keyed by Telegram chat id.
conversations: dict[int, list[types.Content]] = defaultdict(list)
```

There's a few things going on here. We load our bot token and whitelist from the `.env` file, create a `Bot` instance from the `python-telegram-bot` library, and set up a `ContextVar` to track which chat we're currently responding to. We also use a `defaultdict` to store conversations per chat ID — each Telegram user gets their own conversation history.

The `ContextVar` is the interesting bit. Since our hooks don't know about Telegram — they're just plain functions — we need a way to pass the chat ID through without threading it as a parameter. `ContextVar` gives us exactly that: set it before running the agent, and any hook can read it.

Now let's write the hooks. They're almost identical to our CLI hooks, except instead of `print()` they fire off a Telegram message:

```py
def print_llm_response(response: types.Content) -> None:
    chat_id = CURRENT_CHAT_ID.get()
    if chat_id is None:
        return

    for part in response.parts:
        if part.text:
            text = part.text.strip()
            if text:
                asyncio.create_task(bot.send_message(chat_id=chat_id, text=text))


def print_llm_tool(response: ToolExecutionPayload) -> None:
    chat_id = CURRENT_CHAT_ID.get()
    if chat_id is None:
        return

    execution = response["execution"]
    if not execution.get("success"):
        asyncio.create_task(
            bot.send_message(
                chat_id=chat_id, text=f"X [Error Encountered]\n{response}"
            )
        )
        return

    asyncio.create_task(
        bot.send_message(
            chat_id=chat_id, text=f"✓ {response['name']} : {response['args']}"
        )
    )
    result = execution.get("result")
    if result is not None:
        asyncio.create_task(bot.send_message(chat_id=chat_id, text=str(result)))


agent.on("model_response", print_llm_response)
agent.on("tool_executed", print_llm_tool)
```

Notice how we register these hooks on the agent at module level — they'll fire for every conversation, and the `ContextVar` ensures each message goes to the right chat.

Finally, the endpoint itself. Telegram sends us an `Update` object with the message, chat ID, and metadata. We parse it, check the whitelist, and run our agent loop exactly like before:

```py
@app.post("/chat")
async def chat(update_payload: dict[str, Any]) -> dict[str, bool]:
    update = Update.de_json(update_payload, bot)
    if update is None or update.effective_chat is None:
        return {"ok": True}

    chat_id = update.effective_chat.id
    if WHITELIST_TELEGRAM_IDS and chat_id not in WHITELIST_TELEGRAM_IDS:
        print(f"Blocked Telegram[{chat_id}] (not in WHITELIST_TELEGRAM_IDS)")
        return {"ok": True}

    message = update.effective_message
    if message is None:
        return {"ok": True}

    user_text = (message.text or "").strip()
    if not user_text:
        return {"ok": True}

    print(f"Telegram[{chat_id}]: {user_text}")
    conversation = conversations[chat_id]
    conversation.append(
        types.Content(role="user", parts=[types.Part(text=user_text)])
    )
    token = CURRENT_CHAT_ID.set(chat_id)

    try:
        while True:
            next_message = agent.run(conversation)
            if next_message is None:
                break
            conversation.append(next_message)
    finally:
        CURRENT_CHAT_ID.reset(token)

    return {"ok": True}


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
```

We always return `{"ok": True}` to Telegram — even for blocked users or empty messages — so it doesn't retry the webhook. The `try/finally` ensures we clean up the `ContextVar` even if the agent throws an error.

### Seeing It Work

Start the server and ngrok, set the webhook, and send your bot a message. You'll see it respond in real time — tool calls, results, and the final answer all streamed as individual Telegram messages.

![Telegram Demo](/images/telegram_demo.png)

The agent runs through its usual loop — calling `Bash` to list files, `ReadFile` to read the contents — but now every step shows up on your phone as it happens. Same agent, same tools, same `run()` loop. The only difference is which hooks are registered.

## Conclusion

We started with an agent trapped in a terminal and ended with one you can text from your phone. The key insight wasn't Telegram or ngrok — it was the refactor. By pulling hardcoded `print()` calls out of the agent loop and replacing them with hooks, we made the `Agent` class genuinely reusable. The CLI and Telegram server share the exact same `run()` method; they just register different callbacks.

The setup is still fragile though. Conversations live in memory, so a server restart wipes everything. And ngrok ties you to having your laptop open and running. In the next post we'll fix both of those — deploying to Modal so the agent runs in the cloud, persisting conversations with SQLite on a Volume, and sandboxing tool execution so a rogue `rm -rf` doesn't ruin your day.
