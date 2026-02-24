---
title: The Lay of the Land
date: 2026-02-22
description: Breaking down OpenClaw-style agents and the roadmap for building one from scratch
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Openclawd From Scratch
---

Coding agents are no longer a novelty; they're quickly becoming the default interface for writing code, running workflows, and automating personal operations. Yet, most of the systems we use today are complete black boxes.

In this series, we're going in the opposite direction by rebuilding Open Claw from first principles. [Open Claw](https://www.reuters.com/business/openclaw-founder-steinberger-joins-openai-open-source-bot-becomes-foundation-2026-02-15/) is the fastest-growing repo in GitHub history with 9K to 179K stars in 60 days built by [Peter Steinberger](https://x.com/steipete). He recently got hired by OpenAI and the codebase continues to be open source for the world to use.

We'll start by thinking about what an agent like this should look like before starting to build out an implementation of our own.

## What is an Agent

Well what makes an agent like Open Claw effective. I'd argue there are a few things

1. Firstly, it needs a decent model running in the background to handle your queries.

2. Secondly, as you interact more with it, it should have more context on you. It should then be able to use this to help understand you better.

3. Thirdly, it can extend itself. Whether this is through modifying its environment, being able to add skills or even modifying its own system prompt and tools, it's able to customise itself over time for you.

4. Lastly, you can interact with it in a platform that's familiar to you. In this series, we'll use telegram since it's easy to get setup.

The goal here isn't to clone OpenClaw pixel for pixel, instead we want to understand what makes agents like Open Claw, Pi and Codex work well and then implement a simple pattern ourselves.

Let's break it down one step at a time. We'll be using the Gemini models in this series - specifically Gemini-3-flash since I want to see how far I can push this model.

## An Agent

It's not that hard to build a fully functioning agent, just check out [How To Build An Agent by Amp](https://ampcode.com/notes/how-to-build-an-agent) or my other article that walks you through [how to do it in Typescript](../blog/building-an-agent.md).

Let's now see how we might be able to do this in Python

Fundamentally, it's a LLM in a loop with enough of a token budget to spare. Let's see how we might be able to do so using

```py
from google.genai import types, Client


print("Welcome to Amie!")
client = Client()
conversations: list[dict[str, object]] = []

while True:
    user_input = input("You: ").strip()
    if user_input.lower() in {"q", "quit"}:
        break
    if not user_input:
        continue

    conversations.append({"role": "user", "parts": [{"text": user_input}]})

    completion = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=conversations,
        config=types.GenerateContentConfig(max_output_tokens=4096),
    )

    content = completion.candidates[0]
    print("Gemini: ")
    for part in content.content.parts:
        if part.text:
            print(part.text)

    conversations.append({"role": "model", "parts": content.content.parts})

print("Exiting...")
```

It's nothing complicated here, all we need is a simple model that runs in a loop. What makes this useful is tool calling which every provider under the sun supports out of the box now - from [OpenAI](https://openai.com/index/introducing-structured-outputs-in-the-api/), [Gemini](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-structured-outputs/) and even most recently [Anthropic](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform) almost 2 years late to the party.

You need tool calling to build reliable agents in production. Let's see how we can implement this in our Gemini example above.

```py
import os

from google.genai import Client, types


def read_file(path: str) -> str:
    if not path:
        return "No path provided."
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as exc:
        return f"Failed to read '{path}': {exc}"


print("Welcome to Amie!")
client = Client()
user_input = input("You: ").strip()

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

completion = client.models.generate_content(
    model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    contents=[{"role": "user", "parts": [{"text": user_input}]}],
    config=types.GenerateContentConfig(
        max_output_tokens=4096,
        tools=[read_file_tool],
    ),
)

candidate = completion.candidates[0]
print("Gemini:")
for part in candidate.content.parts:
    if part.text:
        print(part.text)
    if part.function_call and part.function_call.name == "read_file":
        args = part.function_call.args or {}
        path = str(args.get("path", ""))
        result = read_file(path)
        print(f"[tool:read_file] {path}")
        print(result)
```

When we run this, we get the following output

```text
Welcome to Amie!
You: read the file at ./README.md please
Gemini:
[tool:called] {'path': './README.md'}
[tool:read_file] ./README.md
# Building a coding agent

Here's a workshop on how to build up to a simple coding agent Koroku!
```

Now when we tell Gemini to read a file, it can get that information by calling the read_file tool. When we see that Gemini has decided to call the tool, we can execute some predefined logic and then return it as a tool result.

If you've written any sort of application, you'll see why this is a big deal. By defining a set of available tools for the model and having model providers guarantee that the model will always output this strictly formatted JSON payload matching your schema, the model can safely interact with its environment to read files, search the web and work its magic.

The real black magic happens when we realize this paradigm doesn't stop at predefined functions. Because the agent can write and execute code, it can author new scripts, register them as tools, and hot-reload its own capabilities on the fly.

This brings us to our next portion - an agent being able to extend itself over time.

## Extending Themselves

There's been a lot of hype around things like Skills and MCPs but really what they all represent are ways for you to augment your agent with better context and stronger capabilities for your task on hand.

If you're unfamiliar with skills, you can check this out [here](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview). Here is a similar resource for [MCPs](https://www.anthropic.com/news/model-context-protocol)

Skills are fundamentally folders with related files and documentation to teach a model how to perform a specific task or set of tasks. MCPs are just tools that a model can call which other people have written ( sometimes quite terribly ) for you.

Pi comes with a pretty beautiful way to extend itself too using two things

- Hooks
- Extensions

Hooks are executed at specific defined parts of the agent's life cycle. For instance, if you wanted to implement some form of approval before executing a tool then you would do this there.

```ts
// Log out that the Agent is starting
pi.on("agent_start", () => {
  console.log("[Inline Extension] Agent starting");
});

// Log out that a tool is being executed
import { isToolCallEventType } from "@mariozechner/pi-coding-agent";

pi.on("tool_call", async (event, ctx) => {
  // event.toolName - "bash", "read", "write", "edit", etc.
  // event.toolCallId
  // event.input - tool parameters

  // Built-in tools: no type params needed
  if (isToolCallEventType("bash", event)) {
    // event.input is { command: string; timeout?: number }
    if (event.input.command.includes("rm -rf")) {
      return { block: true, reason: "Dangerous command" };
    }
  }

  if (isToolCallEventType("read", event)) {
    // event.input is { path: string; offset?: number; limit?: number }
    console.log(`Reading: ${event.input.path}`);
  }
});
```

This makes it easy to do things like implement custom tool specific approvals, global policy approvals and logging because you just need to think about these things in terms of the entire agent's life cycle.

Extensions on the other hand, are ways that we can extend the Pi agent. The easiest thing that we can do with extensions are to add extra tools.

```ts
/**
 * Hello Tool - Minimal custom tool example
 */

import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "hello",
    label: "Hello",
    description: "A simple greeting tool",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { name } = params as { name: string };
      return {
        content: [{ type: "text", text: `Hello, ${name}!` }],
        details: { greeted: name },
      };
    },
  });
}
```

The model can then just use the [`/reload` functionality here to reload these new tools](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md) allowing the agent to be able to use the new tools that it's defined for itself.

## Memory

There's a lot of different companies working on Memory for AI Agents such as [Super Memory](https://supermemory.ai/) and [Mem0](https://mem0.ai/) which have their own bespoke implementations of what memory looks like.

Each foundation lab has also implemented their own variation of Memory with [Anthropic opting for explicit tools for retrieval](https://www.shloked.com/writing/claude-memory), [OpenAI seems to be betting on longer context with memory directly dumped into the system prompt](https://www.shloked.com/writing/chatgpt-memory-bitter-lesson) while Gemini from personal experience seems to be doing a combination of the two.

Fundamentally, what they're trying to do is make sense of the huge amount of data that's present in your chats - your dreams, aspirations, preferences etc.

Open Claw does this in a pretty simple way by using the following system

1. When our session hits a certain token limit, [we compact the existing conversation and append it to the daily memory file](https://github.com/openclaw/openclaw/blob/a0d0104a86cd50c04b0d206e4e98e07b4e1b25bd/src/auto-reply/reply/memory-flush.ts#L11) it writes them to a memory file (with today's date)

2. We compact this on a regular basis to a `Memory.md` file

But you can really set things like a cron job if you need be to add additional memory indexing every say week or so.

## What we'll do

In this series, we'll implement a minimal open claw reproduction called Amie.

We'll start simple and then progressively add more complexity.

Follow along!
