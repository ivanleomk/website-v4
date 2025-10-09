---
title: "Building your own AI SDK"
date: 2025-10-09
description: "Switch between models with your own custom router"
categories:
  - Agents
  - Applied AI
authors:
  - ivanleomk
series:
  - Building an Agent
---

In our previous article, we used React Ink to implement a coding CLI agent using Anthropic's `claude-sonnet-4` model. Since then, much has changed and I've got a new favourite model - [`grok-code-fast-1`](https://x.ai/news/grok-code-fast-1) by XAI. It's approximately 10-15x cheaper than Anthropic's sonnet 4 model, more when you consider cached tokens.

In this article, we'll refactor our agent to be provider-agnostic, building a clean, event-driven architecture that can easily support Anthropic, XAI, OpenAI, or any other provider.

Instead of mixing everything together, we'll separate our code into three distinct layers. This separation is key to making our system flexible and easy to maintain.

1. View: The UI layer that renders the conversation and manages application state.
2. Orchestrator: The provider-agnostic "brain" that processes events, updates the conversation, and executes tools.
3. Provider: An adapter that translates a specific provider's output (e.g., Anthropic, XAI) into a standardized stream of events for the Orchestrator.

By translating individual provider responses into a standardized set of events, our orchestrator can handle these events in a consistent way. This makes it easy to switch between providers without changing the core logic of our agent.

## Understanding our changes

Let's start by defining a new way to represent the conversation history.

### Conversation State

We'll define tools using two main things

1. An `input_schema` that defines the shape of the input arguments.
2. An `execute` function that takes the input arguments and returns the output.

We can then define tools using a `zod` schema as seen below

```ts
export const readFileArgsSchema = z.object({
  paths: z.array(z.string()),
});

export async function executeReadFile(
  args: z.infer<typeof readFileArgsSchema>
): Promise<ContentBlock[]> {
  return args.paths.map((path) => ({
    type: "text" as const,
    text: fs.readFileSync(path, "utf8"),
  }));
}

export const FILE_TOOLS = [
  {
    name: "read_file",
    description: "Read files in parallel and return the contents",
    input_schema: readFileArgsSchema,
    execute: executeReadFile,
  },
];
```

A message is made of content blocks that can be text, reasoning, images, or a tool call. A tool result is just another item in the conversation history. This keeps the state uniform regardless of provider.

```ts
export type ToolSchema<N extends string = string> = {
  name: N;
  description: string;
  input_schema: z.ZodType<any>;
  execute: (args: any) => Promise<any>;
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; signature?: string }
  | {
      type: "image";
      source: {
        type: "base64" | "url";
        data?: string;
        url?: string;
        mimeType?: string;
      };
    }
  | { type: "tool_call"; tool_id: string; name: string; args: any | string };

type Message = {
  type: "message";
  role: "assistant" | "user";
  content: ContentBlock[];
};

type Tool = {
  type: "tool";
  tool_id: string;
  name: string;
  args: any;
  output: ContentBlock[];
  status: "pending" | "success" | "error";
};

type ConversationItem = Message | Tool;

export const TOOLS = [...FILE_TOOLS];

type ToolResult<T extends ToolSchema> = {
  type: "tool";
  tool_id: string;
  name: T["name"];
  args: z.infer<T["input_schema"]>;
  output: ContentBlock[];
  status: "pending" | "success" | "error";
};

export type Tool = ToolResult<(typeof TOOLS)[number]>;
```

One of the benefits of having state like this is that it makes thing easy to serialise, we can now store previous conversations to a file and load it back in when we want to.

You might also wonder why we've chosen to make Tool results their own top-level conversation items rather than nesting them inside messages. This design decision comes down to making our conversation history easier to work with and more aligned with how AI providers actually handle tool calls.

When a model makes a tool call, there's a natural pause in the conversation—the model has sent its message (which includes the tool call), we execute the tool, and then we need to send the results back as a separate turn. By treating tool results as their own conversation items, we make this boundary explicit. It also makes our state easier to serialize and debug: you can look at the conversation history and clearly see the sequence of events without having to dig through nested message structures.

This structure also maps cleanly to how providers like Anthropic and OpenAI actually format their API calls. In their APIs, tool results are sent as separate user messages, not nested within the assistant's message. By mirroring this structure in our internal state, the conversion from our format to theirs becomes straightforward—we're not fighting against the provider's native format.

Finally, having Tool as its own type gives us a clean place to track tool-specific metadata like execution status (pending, success, error) and the tool's unique ID, without cluttering up the message structure with conditional fields.

### Provider Events

It's important to note that Providers don't return messages directly, they stream a series of events like "start a message", "add a block at index 0", update the text at index 1 by appending the delta `hel` to it.

```ts
type ProviderEvent =
  | { type: "START_MESSAGE"; role: "assistant" | "user" }
  | { type: "ADD_CONTENT_BLOCK"; index: number; block: ContentBlock }
  | {
      type: "UPDATE_CONTENT_BLOCK";
      index: number;
      delta?: string;
      final?: boolean;
    }
  | {
      type: "UPDATE_CONTENT_BLOCK_METADATA";
      index: number;
      key: string;
      value: any;
    }
  | { type: "END_MESSAGE" }
  | { type: "ERROR"; message: string };
```

For instance, the assistant might be typing "Let me read that file for you..." and then decides to call the read_file tool. The events would therefore look like something like what we have below:

```bash
START_MESSAGE - "I'm about to send a message"
ADD_CONTENT_BLOCK (index: 0) - "I'm adding a text block"
UPDATE_CONTENT_BLOCK (index: 0, delta: "Let me read") - "Here's some text"
UPDATE_CONTENT_BLOCK (index: 0, delta: " that file") - "Here's more text"
ADD_CONTENT_BLOCK (index: 1) - "I'm adding a tool call block"
UPDATE_CONTENT_BLOCK (index: 1, delta: '{"paths"') - "Here are the tool arguments (streaming)"
UPDATE_CONTENT_BLOCK (index: 1, final: true) - "Tool arguments are complete"
END_MESSAGE - "I'm done with this message"
```

By defining our own standardized ProviderEvent format, we create a common language that all providers can be translated into. Each provider implementation acts as an adapter, taking that provider's specific streaming events and converting them into our universal event format.

This means our orchestrator never needs to know whether it's talking to Anthropic, OpenAI, or XAI—it just processes the same set of events regardless of the underlying model.

## Migrating Anthropic

Now that we've got a rough grasp for what our new architecture looks like, let's start by implementing our Anthropic provider.

We'll do so in two parts - first, we're going to implement a way to convert our `ConversationItem` state to the Anthropic message format. Then, we'll migrate our original streaming logic to emit the set of standardized provider events that we mentioned earlier.

Here's a quick Provider interface for reference

```ts
export interface Provider {
  complete(
    conversation: ConversationItem[],
    model?: string,
    tools?: ToolSchema[]
  ): AsyncGenerator<ProviderEvent>;
}
```

Ok now that we've implemented and understood the different types that we

### Converting ConversationItems to Anthropic Messages

> Note that in this new implementation with the `reasoning` block that we've created, we'll be able to support `Thinking` mode on the Anthropic models, this helps us to achieve better performance with the model and also helps us to generate more coherent and accurate responses. However, to do so, we'll need to preserve the `signature` of the Thinking blocks with it.

Let's start by first implementing a method to convert our `ContentBlock` type into the Anthropic message.

```ts
import {
  ContentBlock,
  ConversationItem,
  Message,
  Provider,
  ProviderEvent,
  Tool,
  ToolSchema,
} from "../lib/types.js";
import Anthropic from "@anthropic-ai/sdk";

export class AnthropicProvider implements Provider {
  client: Anthropic;
  defaultModel: string;
  maxTokens: number;
  reasoningBudget?: number;

  constructor(config: {
    apiKey?: string;
    defaultModel?: string;
    maxTokens?: number;
    reasoningBudget?: number;
  }) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env["ANTHROPIC_API_KEY"],
    });
    this.defaultModel = config.defaultModel || "claude-3-5-sonnet-20241022";
    this.maxTokens = config.maxTokens || 4096;
    this.reasoningBudget = config.reasoningBudget;
  }

  private fromContentBlock = (
    block: ContentBlock
  ): Anthropic.ContentBlockParam | null => {
    switch (block.type) {
      case "text":
        return {
          type: "text",
          text: block.text,
          citations: null,
        };
      case "reasoning":
        if (!block.signature) return null;
        return {
          type: "thinking",
          thinking: block.text,
          signature: block.signature,
        };
      case "image":
        if (block.source.type === "base64") {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: block.source.mimeType,
              data: block.source.data,
            },
          };
        }
        return {
          type: "image",
          source: {
            type: "url",
            url: block.source.url,
          },
        };
      case "tool_call":
        return {
          type: "tool_use",
          id: block.tool_id,
          name: block.name,
          input: block.args,
        };
      default:
        return null;
    }
  };
}
```

We can then add two more methods here to do the conversion from our `Tool` block and `Message` block to an Anthropic message

```ts
private fromToolBlock = (block: Tool): Anthropic.MessageParam => {
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: block.tool_id,
        content: block.output
          .filter(item => item.type === 'text')
          .map(item => (item.type === 'text' ? item.text : ''))
          .join('\n'),
      },
    ],
  };
};

private fromMessageBlock = (message: Message): Anthropic.MessageParam => {
  const content: Anthropic.ContentBlockParam[] = [];

  for (const block of message.content) {
    const converted = this.fromContentBlock(block);
    if (converted) {
      content.push(converted);
    }
  }

  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
  };
};
```

With these three functions in place, we can then implement a higher level function that wraps all three of these functions together to convert our `ConversationItem` list to a list of Anthropic messages.

A key advantage of using Zod for our input_schema is that it allows us to automatically generate the JSON Schema required by most major AI providers.

Instead of defining our types twice—once in TypeScript for our internal logic and again in JSON Schema for the API call—we can maintain a single source of truth. The z.toJSONSchema() function, which we use in the toAnthropicTool helper, handles this conversion for free.

This saves us from writing and maintaining redundant definitions and ensures our tool definitions are always in sync with what the provider expects.

```ts
private toAnthropicTool = (tool: ToolSchema): Anthropic.Tool => ({
  name: tool.name,
  description: tool.description,
  //@ts-ignore
  input_schema: z.toJSONSchema(tool.input_schema),
});

private toAnthropicMessages(
  conversation: ConversationItem[],
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (const item of conversation) {
    if (item.type === 'message') {
      messages.push(this.fromMessageBlock(item));
    } else {
      messages.push(this.fromToolBlock(item));
    }
  }

  return messages;
}
```

With this, we've now implemented the first part of our conversation to Anthropic message conversion. Now let's move on to handling streaming responses from Anthropic.

### Handling Streaming Responses

Now let's start implementing the hard part - streaming responses. If you'd like to see how the Anthropic streaming format works, you can check out my [previous article here where I walk through the details of the streaming format](./migrating-to-react-ink).

I'm going to assume you have some familiarity with the Anthropic streaming messsages.

Let's start by defining our method to handle user input. We'll do so here by defining a new complete method. Because we're using a streaming format, we want to use a generator to yield relevant messages as they're recieved.

```ts
async *complete(
  conversation: ConversationItem[],
  model?: string,
  tools?: ToolSchema[],
): AsyncGenerator<ProviderEvent> {
  const messages = this.toAnthropicMessages(conversation);

  const stream = await this.client.messages.stream({
    model: model || this.defaultModel,
    max_tokens: this.maxTokens,
    messages,
    ...(tools && {tools: tools.map(this.toAnthropicTool)}),
    ...(this.reasoningBudget && {
      thinking: {
        type: 'enabled',
        budget_tokens: this.reasoningBudget,
      },
    }),
  });

  const startEvent = {
    type: 'START_MESSAGE' as const,
    role: 'assistant' as const,
  };
  appendFileSync('anthropic_events.jsonl', JSON.stringify(startEvent) + '\n');
  yield startEvent;

  for await (const chunk of stream) {
    for (const event of this.handleStreamChunk(chunk)) {
      yield event;
    }
  }

  const endEvent = {type: 'END_MESSAGE' as const};
  yield endEvent;
}
```

You might be wondering why we have multiple loops here for the inner yield loop. This gives us more flexibility with the response so that a single chunk can be broken up into separate events if needed.

We now just need to handle a total of 8 events as seen below in our function. As long as we dispatch the right events, the `Orchestrator` will handle the rest.

```ts
private *handleStreamChunk(
  chunk: Anthropic.MessageStreamEvent,
): Generator<ProviderEvent> {
  switch (chunk.type) {
    case 'content_block_start':
      if (chunk.content_block.type === 'text') {
        yield {
          type: 'ADD_CONTENT_BLOCK',
          index: chunk.index,
          block: {type: 'text', text: ''},
        };
      } else if (chunk.content_block.type === 'tool_use') {
        yield {
          type: 'ADD_CONTENT_BLOCK',
          index: chunk.index,
          block: {
            type: 'tool_call',
            tool_id: chunk.content_block.id,
            name: chunk.content_block.name as Tool['name'],
            args: '',
          },
        };
      } else if (chunk.content_block.type === 'thinking') {
        yield {
          type: 'ADD_CONTENT_BLOCK',
          index: chunk.index,
          block: {type: 'reasoning', text: ''},
        };
      }
      break;

    case 'content_block_delta':
      if (chunk.delta.type === 'text_delta') {
        yield {
          type: 'UPDATE_CONTENT_BLOCK',
          index: chunk.index,
          delta: chunk.delta.text,
        };
      } else if (chunk.delta.type === 'input_json_delta') {
        yield {
          type: 'UPDATE_CONTENT_BLOCK',
          index: chunk.index,
          delta: chunk.delta.partial_json,
        };
      } else if (chunk.delta.type === 'thinking_delta') {
        yield {
          type: 'UPDATE_CONTENT_BLOCK',
          index: chunk.index,
          delta: chunk.delta.thinking,
        };
      } else if (chunk.delta.type === 'signature_delta') {
        yield {
          type: 'UPDATE_CONTENT_BLOCK_METADATA',
          index: chunk.index,
          key: 'signature',
          value: chunk.delta.signature,
        };
      }
      break;

    case 'content_block_stop':
      yield {
        type: 'UPDATE_CONTENT_BLOCK',
        index: chunk.index,
        final: true,
      };
      break;
  }
}
```

Note here that we're using a `content_block_stop` here to indicate to our Orchestrator that a content block has finished. This is because our tool calls are streamed in as a series of `content_block_delta` events, and we only parse and validate them into a JSON object when we receive a `content_block_stop` event.

This allows us to sidestep the issue of having to deal with incomplete JSON objects.

## Implementing our Orchestrator

Now that we've seen how a Provider can turn a model's specific output into a standardized stream of ProviderEvents, let's look at the other side of the equation: the Orchestrator. The core responsibility of the Orchestrator is to listen to these events and update the application's state accordingly.

### Handling State Updates

At its heart is a single, pure function that acts as a state reducer. It takes the current conversation state and a single provider event, and returns the new state.

This makes our application's logic simple and easy to reason about. Let's look at the implementation.

```ts
export function applyProviderEvent(
  event: ProviderEvent,
  conversation: ConversationItem[]
): ConversationItem[] {
  switch (event.type) {
    case "START_MESSAGE":
      return [
        ...conversation,
        {
          type: "message",
          role: event.role,
          content: [],
        } satisfies Message,
      ];

    case "ADD_CONTENT_BLOCK": {
      const lastItem = conversation[conversation.length - 1];
      if (lastItem?.type !== "message") return conversation;

      const updated = [...conversation];
      const message = updated[updated.length - 1] as Message;
      message.content[event.index] = event.block;

      return updated;
    }

    case "UPDATE_CONTENT_BLOCK": {
      const lastItem = conversation[conversation.length - 1];
      if (lastItem?.type !== "message") return conversation;

      const updated = [...conversation];
      const message = updated[updated.length - 1] as Message;
      const block = message.content[event.index];

      if (!block) return updated;

      if (event.delta) {
        if (block.type === "text" || block.type === "reasoning") {
          block.text += event.delta;
        } else if (
          block.type === "tool_call" &&
          typeof block.args === "string"
        ) {
          block.args += event.delta;
        }
      }

      if (
        event.final &&
        block.type === "tool_call" &&
        typeof block.args === "string"
      ) {
        try {
          block.args = JSON.parse(block.args);
        } catch {
          // Leave as string if parsing fails
        }
      }

      return updated;
    }

    case "UPDATE_CONTENT_BLOCK_METADATA": {
      const lastItem = conversation[conversation.length - 1];
      if (lastItem?.type !== "message") return conversation;

      const updated = [...conversation];
      const message = updated[updated.length - 1] as Message;
      const block = message.content[event.index];

      if (block?.type === "reasoning" && event.key === "signature") {
        block.signature = event.value;
      }

      return updated;
    }

    case "END_MESSAGE":
    case "ERROR":
      return conversation;

    default:
      return conversation;
  }
}
```

This function is essentially a state machine that handles each event type:

- `START_MESSAGE`: When a provider begins sending a response, we receive this event. Our reducer handles it by appending a new, empty Message object to our conversation history. This prepares us to receive the content that will follow.

- `ADD_CONTENT_BLOCK`: This event tells us the model is creating a new piece of content, like a text block or a tool call. We find the last message we just created and add the new, empty ContentBlock to its content array at the specified index.

- `UPDATE_CONTENT_BLOCK`: This is where the streaming happens. For a text or reasoning block, we simply append the delta (the new chunk of text) to the existing text. For a tool_call, we append the delta to the args string, progressively building what will eventually be a complete JSON object.

- `UPDATE_CONTENT_BLOCK_METADATA`: This is a more specialized event, used here to handle attaching the signature to a reasoning block for Anthropic's "thinking" feature. This shows how the event system can be extended to handle provider-specific metadata cleanly.

When the provider sends an event like content_block_stop, we translate it into an `UPDATE_CONTENT_BLOCK` event with final: true.

You'll notice in our reducer that this is the trigger to attempt JSON.parse() on the accumulated args string for a tool call. This is a crucial step that transforms the streamed string of characters into a structured object that our tool execution logic can use.

By breaking down the complex process of handling a streaming LLM response into a series of small, discrete events, our state management becomes incredibly straightforward. This single function can now build up the conversation state correctly, no matter which provider is sending the events.

### Processing Tool Calls

The next step is to actually execute those tools, get the results, and add them back into our conversation history. This is the final, crucial job of the Orchestrator.

The executeTools function is designed to be called right after the assistant's message has been fully streamed in. It scans that last message, and if it finds any tool calls, it runs them.

```ts
export async function executeTools(
  conversation: ConversationItem[]
): Promise<{ updated: ConversationItem[]; executedAny: boolean }> {
  const lastItem = conversation[conversation.length - 1];
  if (lastItem?.type !== "message" || lastItem.role !== "assistant") {
    return { updated: conversation, executedAny: false };
  }

  const toolCalls = lastItem.content.filter(
    (block): block is Extract<ContentBlock, { type: "tool_call" }> =>
      block.type === "tool_call"
  );

  if (toolCalls.length === 0) {
    return { updated: conversation, executedAny: false };
  }

  let updated = [...conversation];
  let executedAny = false;

  for (const toolCall of toolCalls) {
    const tool = TOOLS.find((t) => t.name === toolCall.name);

    if (!tool) {
      updated.push({
        type: "tool",
        tool_id: toolCall.tool_id,
        name: toolCall.name,
        args: (typeof toolCall.args === "string" ? {} : toolCall.args) as any,
        output: [{ type: "text", text: `Tool ${toolCall.name} not found` }],
        status: "error",
      } satisfies Tool);
      executedAny = true;
      continue;
    }

    if (typeof toolCall.args === "string") {
      continue;
    }

    try {
      const validatedArgs = tool.input_schema.parse(toolCall.args);
      // @ts-ignore
      const output = await tool.execute(validatedArgs);
      updated.push({
        type: "tool",
        tool_id: toolCall.tool_id,
        name: toolCall.name,
        args: validatedArgs,
        output,
        status: "success",
      } satisfies Tool);
      executedAny = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      updated.push({
        type: "tool",
        tool_id: toolCall.tool_id,
        name: toolCall.name,
        args: toolCall.args,
        output: [{ type: "text", text: `Error: ${errorMessage}` }],
        status: "error",
      } satisfies Tool);
      executedAny = true;
    }
  }

  return { updated, executedAny };
}
```

This function is responsible for bringing the model's requests to life. It scans the assistant's most recent message for any tool_call blocks and, for each one, finds the corresponding tool definition in our code. Using the tool's built-in Zod schema, it securely validates the arguments from the model before calling the execute function to run the actual tool.

The result of the execution, whether a success or a gracefully handled error, is then packaged into a new Tool item. This item is appended directly to our conversation history, creating a clear record of the tool's outcome. This "closes the loop" by ensuring that when we next call the model, it has the full context of the tool's output to formulate its final answer.

## Creating a Custom Hook

Now that we have our provider and orchestrator logic in place, let's tie everything together with a custom React hook that bridges our architecture with the UI layer.

We'll do so with a custom `useAgent` hook which will help manage this entire conversation lifecycle. This holds the conversation state and provides a way to interact with the agent.

```ts
import { useState, useCallback, useEffect } from "react";
import type { Provider, ConversationItem, Message } from "../lib/types.js";
import { TOOLS } from "../lib/types.js";
import { applyProviderEvent, executeTools } from "./agentCore.js";

export function useAgent(provider: Provider) {
  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  const processNextTurn = useCallback(
    async (
      currentConvo: ConversationItem[]
    ): Promise<{ updated: ConversationItem[]; shouldContinue: boolean }> => {
      let updated = currentConvo;

      for await (const event of provider.complete(
        currentConvo,
        undefined,
        TOOLS
      )) {
        updated = applyProviderEvent(event, updated);
        setConversation(updated);
      }

      const { updated: withToolResults, executedAny } = await executeTools(
        updated
      );
      setConversation(withToolResults);

      return { updated: withToolResults, shouldContinue: executedAny };
    },
    [provider]
  );

  const complete = useCallback(
    async (userInput: string) => {
      const userMessage: Message = {
        type: "message",
        role: "user",
        content: [{ type: "text", text: userInput }],
      };

      let currentConvo = [...conversation, userMessage];
      setConversation(currentConvo);

      while (true) {
        const { updated, shouldContinue } = await processNextTurn(currentConvo);
        currentConvo = updated;
        if (!shouldContinue) break;
      }
    },
    [conversation, processNextTurn]
  );

  return {
    conversation,
    complete,
  };
}
```

The hook exposes two key pieces to our UI: the conversation state for rendering, and a complete function that the UI calls when the user sends a message. The complete function handles the full interaction cycle in a while loop that continues until no more tools need to be executed.

Inside each iteration, it streams the model's response, updating the UI in real-time as events are processed, and then executes any tools that were called. This creates a seamless experience where the user can see the model "thinking" and using tools live.

Now that we have a clean, provider-agnostic architecture in place, let's prove its flexibility by implementing support for XAI's Grok models.

In the next section, we'll create an XAIProvider that translates XAI's OpenAI-compatible API into our standardized ProviderEvent stream, demonstrating how easy it is to swap between providers without changing any of our core agent logic.

## XAI Provider

Since XAI uses an OpenAI-compatible API, we'll convert our internal ConversationItem format to OpenAI's message format.

### Converting Conversation Items

The implementation follows a similar pattern to our Anthropic provider with a few differences. Both text and reasoning blocks are sent as text parts in the OpenAI format, as the API doesn't have a distinct type for reasoning content.

1. tool_call blocks are converted into the standard OpenAI function tool call format.
2. Images are converted to image_url parts.

```ts
private fromContentBlock = (
  block: ContentBlock,
):
  | OpenAI.ChatCompletionContentPart
  | OpenAI.ChatCompletionMessageToolCall => {
  switch (block.type) {
    case 'reasoning':
    case 'text':
      return {
        type: 'text',
        text: block.text,
      };
    case 'image':
      if (block.source.type === 'base64') {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${block.source.mimeType};base64,${block.source.data}`,
          },
        };
      }

      return {
        type: 'image_url',
        image_url: {
          url: block.source.url,
        },
      };

    case 'tool_call': {
      return {
        id: block.tool_id,
        type: 'function',
        function: {
          arguments: JSON.stringify(block.args),
          name: block.name,
        },
      };
    }
  }
};
```

We can then implement a similar conversion here that handles the conversion of our `ConversationItem` objects into a specific format for XAI's API.

```ts
private toOpenAITool = (
  tool: ToolSchema,
): OpenAI.Chat.ChatCompletionTool => ({
  type: 'function',
  function: {
    parameters: z.toJSONSchema(tool.input_schema),
    name: tool.name,
    description: tool.description,
  },
});

private fromConversationItem = (
  block: ConversationItem,
): OpenAI.ChatCompletionMessageParam => {
  if (block.type === 'message') {
    return this.fromMessageBlock(block);
  }
  return this.fromToolBlock(block);
};

private fromToolBlock = (
  block: Tool,
): OpenAI.ChatCompletionToolMessageParam => {
  return {
    role: 'tool',
    content: block.output
      .filter(item => item.type == 'text')
      .map(
        item =>
          this.fromContentBlock(item) as OpenAI.ChatCompletionContentPartText,
      ),
    tool_call_id: block.tool_id,
  };
};

private fromMessageBlock = (
  message: Message,
): OpenAI.ChatCompletionMessageParam => {
  if (message.role == 'user') {
    return {
      role: 'user',
      content: message.content.map(
        item =>
          this.fromContentBlock(item) as OpenAI.ChatCompletionContentPart,
      ),
    };
  }

  const toolCalls = message.content.filter(item => item.type == 'tool_call');
  const textResponse = message.content.filter(item => item.type === 'text');

  return {
    role: 'assistant',
    content: textResponse.map(
      item =>
        this.fromContentBlock(item) as OpenAI.ChatCompletionContentPartText,
    ),
    tool_calls: toolCalls.map(
      item =>
        this.fromContentBlock(item) as OpenAI.ChatCompletionMessageToolCall,
    ),
  };
};
```

We can then initialise our main Provider as seen below

```ts
export class XAIProvider implements Provider {
  client: OpenAI;
  defaultModel: string;
  maxTokens: number;
  private currentContentBlockIndex = 0;
  private priorContentBlockType: "tool_call" | "reasoning" | "text" | undefined;

  constructor(config: {
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
    maxTokens?: number;
  }) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env["XAI_API_KEY"],
      baseURL: config.baseURL,
    });
    this.defaultModel = config.defaultModel || "grok-code-fast-1";
    this.maxTokens = config.maxTokens || 4096;
  }

  async *complete(
    conversation: ConversationItem[],
    model?: string,
    tools?: ToolSchema[]
  ): AsyncGenerator<ProviderEvent> {
    const messages = conversation.map(this.fromConversationItem);

    this.currentContentBlockIndex = 0;
    this.priorContentBlockType = undefined;

    const stream = await this.client.chat.completions.create({
      model: model || this.defaultModel,
      max_tokens: this.maxTokens,
      messages,
      stream: true,
      ...(tools && { tools: tools.map(this.toOpenAITool) }),
    });

    yield { type: "START_MESSAGE", role: "assistant" };

    for await (const chunk of stream) {
      yield* this.handleStreamChunk(chunk);
    }

    yield { type: "END_MESSAGE" };
  }
}
```

### Handling Streaming Responses

The core of the XAI provider is the `handleStreamChunk` method, which processes each streaming chunk from the XAI API and emits the correct sequence of ProviderEvents.

Since the XAI stream doesn't tell us when a new content block begins, we must infer it by tracking the type of the last delta we received (this.priorContentBlockType).

For example, if we were previously receiving reasoning_content and then start receiving content, we know the model has switched from its internal "thinking" to its final response.

In that case, we must:

1. Increment our currentContentBlockIndex.
2. Emit an `ADD_CONTENT_BLOCK` event to signal the start of a new text block in our state.

This can be done in the function below

```ts
private *handleStreamChunk(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
): Generator<ProviderEvent> {
  // Remove Redundant chunks
  if (!chunk.choices || chunk.choices.length === 0) return;

  if (!chunk.choices[0]?.delta) return;

  const delta = chunk.choices[0].delta;

  if (Object.keys(delta).length == 0) return;

  if (delta.content) {
    if (
      this.priorContentBlockType != 'text' &&
      this.priorContentBlockType != undefined
    ) {
      this.currentContentBlockIndex++;
      yield {
        type: 'ADD_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        block: {type: 'text', text: ''},
      };
    } else if (this.priorContentBlockType === undefined) {
      yield {
        type: 'ADD_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        block: {type: 'text', text: ''},
      };
    }
    this.priorContentBlockType = 'text';
    yield {
      type: 'UPDATE_CONTENT_BLOCK',
      index: this.currentContentBlockIndex,
      delta: delta.content,
    };
  }

  if ('reasoning_content' in delta && delta.reasoning_content) {
    if (
      this.priorContentBlockType != 'reasoning' &&
      this.priorContentBlockType != undefined
    ) {
      this.currentContentBlockIndex++;
      yield {
        type: 'ADD_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        block: {type: 'reasoning', text: ''},
      };
    } else if (this.priorContentBlockType === undefined) {
      yield {
        type: 'ADD_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        block: {type: 'reasoning', text: ''},
      };
    }
    this.priorContentBlockType = 'reasoning';
    yield {
      type: 'UPDATE_CONTENT_BLOCK',
      index: this.currentContentBlockIndex,
      delta: delta.reasoning_content as string,
    };
  }

  if ('tool_calls' in delta && delta.tool_calls) {
    if (
      this.priorContentBlockType != 'tool_call' &&
      this.priorContentBlockType != undefined
    ) {
      this.currentContentBlockIndex++;
    }
    this.priorContentBlockType = 'tool_call';

    for (const toolCall of delta.tool_calls) {
      yield {
        type: 'ADD_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        block: {
          type: 'tool_call',
          tool_id: toolCall.id as string,
          name: toolCall.function?.name as Tool['name'],
          args: '',
        },
      };

      yield {
        type: 'UPDATE_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        delta: toolCall.function?.arguments as string,
      };

      yield {
        type: 'UPDATE_CONTENT_BLOCK',
        index: this.currentContentBlockIndex,
        final: true,
      };
    }
  }

}
```

When handling XAI’s streaming responses, we process each ChatCompletionChunk and inspect its delta for three possible fields: content (final response), reasoning_content (internal "thoughts"), and tool_calls.

Because XAI’s stream doesn’t explicitly signal the correct index for when new content block begins, we infer transitions by tracking the prior content type.

For example, if we were previously receiving reasoning_content and then get content, we increment the block index and emit an `ADD_CONTENT_BLOCK` event for a new text block.

Similarly, each tool_calls delta triggers an `ADD_CONTENT_BLOCK` for a tool call, followed immediately by `UPDATE_CONTENT_BLOCK` with the partial arguments and a final: true marker since XAI sends complete tool-call arguments in one go.

This stateful tracking ensures our standardized event stream correctly mirrors the model’s output structure, even though XAI’s API lacks explicit block boundaries.

## Making our UI Pretty

With our robust backend in place, we can now turn our attention to the 'View' layer. Let's see how our standardized conversation state and the useAgent hook make it straightforward to build a responsive and informative user interface with React Ink.

We'll do so in two main parts

1. First, we'll clean up our `App.tsx` file so that we use our new hook
2. Then, we'll create a custom component for each Tool Call that will handle the rendering of the tool call arguments and the final response.

Once we've finished all two, we'll have a complete UI that can handle the streaming of XAI's responses and render them in a user-friendly way.

Let's dive in.

### Migrating to our New Hook

Let's start by cleaning up our `App.tsx` file so that we use our new hook. I'll switch over to use the `XAI` provider instead of the Anthropic Provider but you can use any provider that you like for this.

```ts
export default function App() {
  const provider = useMemo(
    () =>
      new XAIProvider({
        baseURL: "https://api.x.ai/v1",
        apiKey: process.env["XAI_API_KEY"],
        defaultModel: "grok-code-fast-1",
        maxTokens: 4096,
      }),
    // new AnthropicProvider({
    // 	defaultModel: 'claude-3-7-sonnet-latest',
    // 	maxTokens: 8092,
    // 	reasoningBudget: 4096,
    // }),
    []
  );

  const { conversation, complete } = useAgent(provider);
  const [input, setInput] = useState("");
  const [showShutdown, setShowShutdown] = useState(false);
  const { exit } = useApp();

  const sendMessage = async () => {
    if (input.trim().length === 0) {
      return;
    }
    setInput("");
    await complete(input);
  };

  useInput((input, key) => {
    if (key.ctrl && input === "d") {
      setShowShutdown(true);
      exit();
    }
    if (key.return) {
      sendMessage();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box flexGrow={1} flexDirection="column" gap={1}>
        {conversation.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {conversation.length > 0 && <Box flexGrow={1} />}
      </Box>
      <Box width="100%">
        <Text color="blue">$ </Text>
        <TextInput
          value={input}
          onChange={setInput}
          placeholder="Type a command..."
        />
      </Box>
      {showShutdown && (
        <Box>
          <Text color="yellow">Shutting down...</Text>
        </Box>
      )}
    </Box>
  );
}
```

We now need to modify our `Message` item so that it can handle the rendering of the tool call arguments and our final response. Let's start by updating it's arguments so that it takes in our new `ConversationItem` type.

We'll only support text, reasoning outputs and tool call arguments for now

```ts
import React from "react";
import { Box, Text } from "ink";
import type { ConversationItem } from "../lib/types.js";

interface MessageProps {
  message: ConversationItem;
}

export default function Message({ message }: MessageProps) {
  if (message.type === "tool") {
    const statusColor =
      message.status === "success"
        ? "green"
        : message.status === "error"
        ? "red"
        : "yellow";

    const errorOutput = message.output.find((item) => item.type === "text");

    return (
      <Box marginLeft={2} flexDirection="column" gap={1}>
        <Box
          borderStyle="round"
          borderColor={statusColor}
          padding={1}
          flexDirection="column"
        >
          <Text color={statusColor}>
            {message.status === "error" ? "✗" : "✓"} {message.name} [
            {message.status}]
          </Text>
          {message.status === "error" && errorOutput && (
            <>
              <Text>{"\n"}</Text>
              <Text color="red">{errorOutput.text}</Text>
            </>
          )}
        </Box>
      </Box>
    );
  }

  const textColor = "white";

  return (
    <Box flexDirection="column">
      {message.content
        .filter((item) => item.type === "reasoning" || item.type === "text")
        .map((item, index) => {
          if (item.type === "reasoning") {
            return (
              <Box key={index} marginLeft={2} marginBottom={1}>
                <Box
                  width={1}
                  height="100%"
                  justifyContent="center"
                  borderColor="cyan"
                  borderLeft={true}
                  borderRight={false}
                  borderTop={false}
                  borderBottom={false}
                  borderStyle="single"
                  alignItems="flex-start"
                >
                  <Text></Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  <Text color="cyan">{item.text.trimEnd()}</Text>
                </Box>
              </Box>
            );
          }
          return (
            <Text key={index} color={textColor}>
              {item.text}
            </Text>
          );
        })}
    </Box>
  );
}
```

One thing you'll notice with our UI is that it doesn't support Markdown context rendering. I couldn't use `ink-markdown` for some reason because of compatability so I created a simple markdown parser.

> You can copy [the source code here](https://gist.github.com/ivanleomk/45d090b9edc7b34886ace29240ac6cb5) and use it in your application. In my case, just replace all of the `Text` above with a `MarkdownText` component.

### Better Tool UIs

Since we have fully typed the tool calls, we can now create a custom component for each Tool Call that will handle the rendering of the tool call arguments and the final response. For context, this is the final set of tools that we have to work with.

```ts
import { z } from "zod";
import archy from "archy";
import fs from "fs";
import type { ContentBlock } from "../types.js";
import { globby } from "globby";
import path from "path";

export const readFileArgsSchema = z.object({
  paths: z.array(z.string()),
});

export async function executeReadFile(
  args: z.infer<typeof readFileArgsSchema>
): Promise<ContentBlock[]> {
  return args.paths.map((path) => ({
    type: "text" as const,
    text: fs.readFileSync(path, "utf8"),
  }));
}

export const listFileArgSchema = z.object({
  directory: z.string(),
  maxDepth: z.number().optional().default(2),
});

function pathsToTree(paths: string[], rootDir: string, rootPath: string) {
  const tree: any = { label: path.basename(rootDir) + "/", nodes: [] };

  paths.forEach((p) => {
    const parts = p.split("/");
    let current = tree;

    parts.forEach((part, i) => {
      if (!current.nodes) current.nodes = [];

      const cleanPart = part.replace("/", "");
      let child = current.nodes.find(
        (n: any) => (n.label || n).replace("/", "") === cleanPart
      );

      if (!child) {
        const fullPath = path.join(rootPath, parts.slice(0, i + 1).join("/"));
        const isDir =
          fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
        child = { label: part + (isDir ? "/" : "") };
        if (isDir) child.nodes = [];
        current.nodes.push(child);
      }

      current = child;
    });
  });

  return archy(tree);
}

async function executeListFile(
  args: z.infer<typeof listFileArgSchema>
): Promise<ContentBlock[]> {
  const allFiles = await globby("**/*", {
    cwd: args.directory,
    gitignore: true,
    dot: false,
    deep: args.maxDepth + 1,
  });

  // Extract directories from all files
  const dirs = new Set<string>();
  allFiles.forEach((f) => {
    const parts = f.split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      dirs.add(parts.slice(0, i + 1).join("/"));
    }
  });

  // Combine files at maxDepth with dirs at maxDepth
  const files = [
    ...allFiles.filter((f) => f.split("/").length <= args.maxDepth),
    ...Array.from(dirs).filter((d) => d.split("/").length <= args.maxDepth),
  ];

  const treeStr = pathsToTree(files, args.directory, args.directory);
  return [{ type: "text" as const, text: treeStr }];
}

export const createFileArgSchema = z.object({
  filePath: z.string(),
  content: z.string(),
});

async function executeCreateFile(args: z.infer<typeof createFileArgSchema>) {
  const { filePath, content } = args;
  fs.writeFileSync(filePath, content);

  return [
    { type: "text" as const, text: `File ${filePath} created successfully` },
  ];
}

export const replaceContentArgsSchema = z.object({
  filePath: z.string(),
  oldStr: z.string(),
  newStr: z.string(),
  replaceAll: z.boolean(),
});

async function executeReplaceContent(
  args: z.infer<typeof replaceContentArgsSchema>
) {
  const { filePath, oldStr, newStr, replaceAll } = args;
  const fileContent = fs.readFileSync(filePath, "utf8");

  if (!replaceAll) {
    const escaped = oldStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const occurrences = (fileContent.match(new RegExp(escaped, "g")) || [])
      .length;
    if (occurrences === 0) {
      throw new Error(`String not found: "${oldStr}"`);
    }
    if (occurrences > 1) {
      throw new Error(
        `Found ${occurrences} instances of "${oldStr}". Use replace_all: true to replace all instances.`
      );
    }
  }

  const newContent = fileContent.replaceAll(oldStr, newStr);

  fs.writeFileSync(filePath, newContent);

  return [{ type: "text" as const, text: "Replaced content successfully" }];
}

export const FILE_TOOLS = [
  {
    name: "read_file",
    description: "Read files in parallel and return the contents",
    input_schema: readFileArgsSchema,
    execute: executeReadFile,
  },
  {
    name: "list_files",
    description:
      "List files in a directory starting from the directory stated. Max depth of 2 by default",
    input_schema: listFileArgSchema,
    execute: executeListFile,
  },
  {
    name: "create_file",
    description: "Create a new file with the given content",
    input_schema: createFileArgSchema,
    execute: executeCreateFile,
  },
  {
    name: "replace_content",
    description:
      "Replace content in a file. If replace_all is false, validates there is only one occurrence.",
    input_schema: replaceContentArgsSchema,
    execute: executeReplaceContent,
  },
] as const;
```

Let's start by creating a component for our `file_read` tool. We can modify our Message above so that we render file_reads specificaly

```ts
export default function Message({ message }: MessageProps) {
  if (message.type === "tool") {
    const toolCall = message as Tool;

    if (toolCall.name === "read_file") {
      return (
        <ReadFileDisplay toolCall={toolCall as Tool & { name: "read_file" }} />
      );
    }

    // Rest of the file here as per normal
  }
}
```

We can then implement a special UI for the `fileRead` tool call as seen below

```ts
import React from "react";
import { Box, Text } from "ink";
import type { Tool } from "../lib/types.js";

interface ReadFileDisplayProps {
  toolCall: Tool & { name: "read_file" };
}

export default function ReadFileDisplay({ toolCall }: ReadFileDisplayProps) {
  const textOutputs = toolCall.output.filter((item) => item.type === "text");
  const paths = (toolCall.args as { paths: string[] }).paths || [];

  return (
    <Box flexDirection="column" marginLeft={2} gap={1}>
      {textOutputs.map((output, index) => {
        if (output.type !== "text") return null;

        const lines = output.text.split("\n");
        const preview = lines.slice(0, 3).join("\n");
        const totalLines = lines.length;
        const filePath = paths[index] || "unknown";

        return (
          <Box key={index} flexDirection="column">
            <Box
              borderStyle="round"
              borderColor="gray"
              borderBottom={false}
              paddingLeft={1}
              paddingRight={1}
            >
              <Text color="gray">read_file </Text>
              <Text color="white">{filePath}</Text>
            </Box>
            <Box
              borderStyle="round"
              borderColor="gray"
              borderTop={false}
              padding={1}
              flexDirection="column"
            >
              <Text color="gray">{preview}</Text>
              {totalLines > 3 && (
                <Text color="dim">... read {totalLines} lines</Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
```

We can also do one for the `content_replace` file tool that we created

```ts
import React from "react";
import { Box, Text } from "ink";
import type { Tool } from "../lib/types.js";

interface ReplaceContentDisplayProps {
  toolCall: Tool & { name: "replace_content" };
}

export default function ReplaceContentDisplay({
  toolCall,
}: ReplaceContentDisplayProps) {
  const args = toolCall.args as {
    path: string;
    oldStr: string;
    newStr: string;
    replaceAll: boolean;
  };

  const oldLines = args.oldStr
    .split("\n")
    .map((line) => line.trimEnd().replace(/\t/g, " "));
  const newLines = args.newStr
    .split("\n")
    .map((line) => line.trimEnd().replace(/\t/g, " "));

  return (
    <Box flexDirection="column" marginY={0} width="90%" alignSelf="center">
      <Box
        borderStyle="round"
        borderColor="gray"
        borderBottom={false}
        paddingLeft={1}
        paddingRight={1}
      >
        <Text color="gray">replace_content </Text>
        <Text color="white">[{args.path}]</Text>
      </Box>
      <Box
        borderStyle="round"
        borderColor="gray"
        borderTop={false}
        padding={1}
        flexDirection="column"
      >
        <Text color="white" wrap="wrap">
          {oldLines.map((line, index) => (
            <Text key={`old-${index}`} color="red">
              {`- ${line}\n`}
            </Text>
          ))}
          {newLines.map((line, index) => (
            <Text key={`new-${index}`} color="green">
              {`+ ${line}\n`}
            </Text>
          ))}
        </Text>
      </Box>
    </Box>
  );
}
```

I've implemented the rest in the repository so you can just copy the code from there.

## Conclusion

In this article, we've transformed a simple, single-provider CLI agent into one that's provider agnostic. At the core of our design is a standardized event stream that allows the orchestrator to easily switch between any model provider as long as it implements the same interface.

By being explicit about conversation history and tool execution state, we were also able to improve our CLI interface for users so that it's easier to understand and use. This made it easier for users to debug and understand the behavior of the agent.

In the next article, we'll look into implementing agentic search, using libraries like `fast-glob` to implement support for glob and grep patterns that we can use to search for files in the local file system. We'll also explore `ast-grep` as a way to search for code patterns in the local file system.
