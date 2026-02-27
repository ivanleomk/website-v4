---
title: "Total Recall"
date: 2026-02-25
description: Persisting conversations to a database and compacting context so our agent never forgets
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Openclawd From Scratch
---

Our agent can talk over Telegram, call tools, and even extend itself — but it has the memory of a goldfish. Every time the server restarts, the conversation vanishes. Send enough messages and the context window fills up, and the agent starts losing track of what you said five minutes ago.

In this post, we'll fix the first problem. We'll persist conversations to a SQLite database so they survive restarts. Along the way, we'll build a proper serialization layer for Gemini messages using Pydantic so that text, function calls, and function responses all round-trip faithfully — including the thinking signatures that Gemini's newer models produce.

By the end, our agent will remember everything — not because it's doing anything fancy, but because we gave it a place to store things.

Let's get into it.

## The Problem

Right now our conversation is a single Python list. Whenever the server is restarted, the list is gone. Additionally we don't have an easy way of handling the context once we go beyond the model's context window.

To do so, we'll create a simple `SessionManager` that will handle the raw conversations. It'll do two things

1. Firstly, it will create, store and retrieve all of our messages. We'll use Sqlite since it's built into python and is simple enough to be used for a single user agent.

2. Secondly, it will handle the serialization and deserialization of Gemini messages, including thinking signatures that we need to preserve for the API to accept our conversation history.

Let's dive in and start building our session manager.

## Modeling Gemini Messages

Let's start by installing the `aiosqlite` library so that we can access the sqlite file without blocking our main file.

```bash
uv pip install aiosqlite
```

Before we think about the database, we need to solve the serialization problem. Gemini's `types.Content` objects aren't directly serializable — a single message can contain text, function calls, or function responses, and newer models also produce `thought_signature` bytes that must be preserved for the API to accept the conversation back.

We'll model each part type as a Pydantic model with a `kind` discriminator:

```py
import base64
from typing import Annotated, Any, Literal
from pydantic import BaseModel, Field


class FunctionCallData(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class FunctionResponseData(BaseModel):
    name: str
    response: dict[str, Any] = Field(default_factory=dict)


class FCMetadata(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class TextPart(BaseModel):
    kind: Literal["text"] = "text"
    text: str
    thought_signature_b64: str | None = None
    thought: bool | None = None


class FunctionCallPart(BaseModel):
    kind: Literal["function_call"] = "function_call"
    function_call: FunctionCallData
    thought_signature_b64: str | None = None


class FunctionResponsePart(BaseModel):
    kind: Literal["function_response"] = "function_response"
    function_response: FunctionResponseData
    thought_signature_b64: str | None = None
    fc_metadata: FCMetadata | None = None


SessionPart = Annotated[
    TextPart | FunctionCallPart | FunctionResponsePart,
    Field(discriminator="kind"),
]
```

Each part knows its own kind, so Pydantic can discriminate between them automatically when deserializing. The `thought_signature_b64` field stores the raw bytes as base64 — we can't drop these or the API will reject our conversation when we load it back.

The `FCMetadata` on `FunctionResponsePart` is a small convenience: when we store a function response, we also stash the name and args of the function call that produced it. This makes it easy to render history without having to correlate responses back to their calls.

### The SessionEvent

A `SessionEvent` wraps a role and a list of parts — it's our serializable equivalent of `types.Content`:

```py
from google.genai import types


class SessionEvent(BaseModel):
    role: str
    parts: list[SessionPart] = Field(default_factory=list)

    @staticmethod
    def _encode_thought_signature(signature: bytes | None) -> str | None:
        if not signature:
            return None
        return base64.b64encode(signature).decode("ascii")

    @staticmethod
    def _decode_thought_signature(signature_b64: str | None) -> bytes | None:
        if not signature_b64:
            return None
        return base64.b64decode(signature_b64.encode("ascii"))

    @classmethod
    def from_content(
        cls,
        content: types.Content,
        part_metadata: list[FCMetadata | None] | None = None,
    ) -> "SessionEvent":
        metadata = part_metadata or [None] * len(content.parts)
        if len(metadata) != len(content.parts):
            raise ValueError("part_metadata length must match content.parts length")
        return cls(
            role=content.role or "user",
            parts=cls._parts_from_content(content.parts, metadata),
        )

    @classmethod
    def _parts_from_content(
        cls,
        parts: list[types.Part],
        metadata: list[FCMetadata | None],
    ) -> list[SessionPart]:
        out: list[SessionPart] = []
        for part, meta in zip(parts, metadata):
            thought_signature_b64 = cls._encode_thought_signature(
                getattr(part, "thought_signature", None)
            )
            if part.text is not None:
                out.append(
                    TextPart(
                        text=part.text,
                        thought_signature_b64=thought_signature_b64,
                        thought=part.thought,
                    )
                )
            elif part.function_call is not None:
                out.append(
                    FunctionCallPart(
                        function_call=FunctionCallData(
                            name=part.function_call.name,
                            args=dict(part.function_call.args or {}),
                        ),
                        thought_signature_b64=thought_signature_b64,
                    )
                )
            elif part.function_response is not None:
                out.append(
                    FunctionResponsePart(
                        function_response=FunctionResponseData(
                            name=part.function_response.name,
                            response=dict(part.function_response.response or {}),
                        ),
                        thought_signature_b64=thought_signature_b64,
                        fc_metadata=meta,
                    )
                )
            else:
                raise ValueError("Unsupported GenAI part")
        return out

    def to_content(self) -> types.Content:
        return types.Content(
            role=self.role,
            parts=[self._part_to_genai(part) for part in self.parts],
        )

    @classmethod
    def _part_to_genai(cls, part: SessionPart) -> types.Part:
        thought_signature = cls._decode_thought_signature(part.thought_signature_b64)
        if isinstance(part, TextPart):
            return types.Part(
                text=part.text,
                thought=part.thought,
                thought_signature=thought_signature,
            )
        if isinstance(part, FunctionCallPart):
            return types.Part(
                function_call=types.FunctionCall(
                    name=part.function_call.name,
                    args=part.function_call.args,
                ),
                thought_signature=thought_signature,
            )
        return types.Part(
            function_response=types.FunctionResponse(
                name=part.function_response.name,
                response=part.function_response.response,
            ),
            thought_signature=thought_signature,
        )
```

The two key methods are `from_content` (Gemini → Pydantic) and `to_content` (Pydantic → Gemini). Because `SessionEvent` is a Pydantic model, serializing to JSON is just `event.model_dump_json()` and deserializing is `SessionEvent.model_validate_json(data)`. No manual `json.dumps`/`json.loads` with custom logic.

## Managing Sessions

With serialization handled, the `SessionManager` itself is minimal. We just need one table:

```sql
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_json TEXT NOT NULL,
    created_at REAL NOT NULL
);
```

Each row stores a full `SessionEvent` as JSON. Since this is a single-user agent, we don't need a sessions table — there's just one conversation.

```py
import asyncio
import time
import aiosqlite


INIT_SQL = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_json TEXT NOT NULL,
    created_at REAL NOT NULL
);
"""


class SessionManager:
    def __init__(self, db_path: str = "agent.db"):
        self.db_path = db_path
        self._conn: aiosqlite.Connection | None = None
        self._init_lock = asyncio.Lock()
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized and self._conn is not None:
            return

        async with self._init_lock:
            if self._initialized and self._conn is not None:
                return

            self._conn = await aiosqlite.connect(self.db_path)
            await self._conn.executescript(INIT_SQL)
            await self._conn.commit()
            self._initialized = True

    async def db(self) -> aiosqlite.Connection:
        if not self._initialized or self._conn is None:
            raise RuntimeError(
                "SessionManager is not initialized. Call initialize() first."
            )
        return self._conn

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None
            self._initialized = False

    async def delete(self) -> None:
        conn = await self.db()
        await conn.execute("DELETE FROM messages")
        await conn.commit()

    async def add_message(
        self, event: SessionEvent, created_at: float | None = None
    ) -> None:
        conn = await self.db()
        created_at = created_at or time.time()
        await conn.execute(
            "INSERT INTO messages (event_json, created_at) VALUES (?, ?)",
            (event.model_dump_json(), created_at),
        )
        await conn.commit()

    async def load_messages(self) -> list[SessionEvent]:
        conn = await self.db()
        cursor = await conn.execute(
            "SELECT event_json FROM messages ORDER BY id ASC"
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [SessionEvent.model_validate_json(row[0]) for row in rows]
```

A few things worth noting:

- We use a double-checked lock in `initialize()` so it's safe to call from concurrent requests without opening multiple connections.
- `db()` is an async method (not a property) that returns the connection, raising if we forgot to initialize.
- `add_message` takes a `SessionEvent` directly — no raw `types.Content`. The conversion happens at the call site, which keeps the boundary clean.
- `load_messages` returns `SessionEvent` objects, not `types.Content`. The caller converts with `.to_content()` when it's time to talk to the API.

## Wiring It Into the Agent

The big change is in `Agent.run()`. Instead of the caller managing the conversation list, the agent now handles persistence internally. It takes a single message, persists it, loads the full conversation from the database, and runs the model:

```py
class Agent:
    def __init__(
        self,
        model: str = "gemini-3-flash-preview",
        context: AgentContext | None = None,
        session_manager: SessionManager | None = None,
    ):
        self.model = model
        self.client = Client()
        self.session_manager = session_manager or SessionManager()
        self.context = context or AgentContext()
        # ... tools and hooks setup

    async def initialize(
        self,
        *,
        replay_handler: ReplayHook | None = None,
    ) -> None:
        await self.session_manager.initialize()
        if replay_handler is None:
            return
        events = await self.session_manager.load_messages()
        for event in events:
            await replay_handler(event=event)

    async def run(self, message: types.Content) -> types.Content | None:
        """Run one assistant step. Returns tool-response message, or None when done."""
        has_function_response_input = any(
            part.function_response is not None for part in message.parts
        )
        if not has_function_response_input:
            session_message = SessionEvent.from_content(message)
            await self.session_manager.add_message(session_message)
        conversation = await self.session_manager.load_messages()

        completion = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[event.to_content() for event in conversation],
            config=types.GenerateContentConfig(tools=self.get_tools()),
        )

        message = completion.candidates[0].content
        await self.session_manager.add_message(SessionEvent.from_content(message))
        await self.emit("on_model_response", message=message, context=self.context)

        function_calls = [
            part.function_call for part in message.parts if part.function_call
        ]

        if not function_calls:
            return None

        tool_responses: list[types.Part] = []
        for call in function_calls:
            call_args = call.args or {}
            await self.emit("on_tool_call", call=call, context=self.context)
            result = await self.execute_tool(call.name, call_args)
            await self.emit(
                "on_tool_result",
                result=result,
                call_name=call.name,
                call_args=call_args,
                context=self.context,
            )
            tool_responses.append(result.to_genai_message())

        final_response = types.UserContent(parts=tool_responses)
        response_metadata = [
            FCMetadata(name=call.name, args=(call.args or {}))
            for call in function_calls
        ]
        await self.session_manager.add_message(
            SessionEvent.from_content(final_response, part_metadata=response_metadata)
        )
        return final_response
```

There's a subtle detail here: we skip persisting function response messages that come _in_ as input (the `has_function_response_input` check). That's because those messages were already persisted at the end of the previous `run()` call — we'd be double-writing them otherwise.

The caller's loop is now dead simple:

```py
async def main() -> None:
    agent = Agent()
    agent.on("on_tool_result", print_tool_result)
    agent.on("on_model_response", print_llm_response)

    await agent.initialize(replay_handler=render_history_event)

    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            break
        if user_input.lower() == "clear":
            await agent.session_manager.delete()
            print("[History cleared]")
            continue
        if not user_input:
            continue

        next_message = types.UserContent(parts=[types.Part.from_text(text=user_input)])

        while True:
            next_message = await agent.run(next_message)
            if next_message is None:
                break
```

On startup, `initialize()` replays the saved history through a handler so the user can see what happened in previous sessions. Then the main loop just feeds messages in and keeps calling `run()` until the agent has no more tool calls to make.

### Replaying History

The replay handler renders saved events back to the terminal so you can see what happened in previous sessions:

```py
async def render_history_event(*, event: SessionEvent) -> None:
    for part in event.parts:
        if isinstance(part, TextPart):
            label = (
                "You"
                if event.role == "user"
                else "Assistant"
                if event.role == "model"
                else event.role
            )
            print(f"{label}: {part.text}")
            continue

        if isinstance(part, FunctionCallPart):
            continue

        call_name = (
            part.fc_metadata.name
            if part.fc_metadata is not None
            else part.function_response.name
        )
        call_args = part.fc_metadata.args if part.fc_metadata is not None else {}
        error = "error" in part.function_response.response
        status = "[green]✓[/green]" if not error else "[red]✗[/red]"
        rprint(f"{status} [bold]{call_name}[/bold] {call_args}")
```

This is where the `FCMetadata` pays off. Without it, we'd only know the function response name — which is often just the tool name. With the metadata, we can show the exact arguments that were passed, making the history much more useful.

## Handling Compaction

We've solved persistence — conversations survive restarts and the full history is faithfully reconstructed, including thinking signatures and tool call metadata. But we've got one small problem - long converstions still blow past the model's context window. We need a strategy for summarising older messages while keeping recent context intact.

To solve this, we'll be introducing a new `CompactionEvent` type. Let's start by modifying our previous `SessionEvent` class and defining a new union.

```py

class SessionEvent(BaseModel):
    event_type: Literal["session"] = "session"
    role: str
    parts: list[SessionPart] = Field(default_factory=list)
    ...(rest of sessionEvent)

class CompactionEvent(BaseModel):
    event_type: Literal["compaction"] = "compaction"
    parts: list[SessionPart] = Field(default_factory=list)

    def to_content(self) -> types.Content:
        return types.UserContent(
            parts=[SessionEvent._part_to_genai(part) for part in self.parts]
        )


StoredEvent = Annotated[
    SessionEvent | CompactionEvent,
    Field(discriminator="event_type"),
]

StoredEventAdapter = TypeAdapter(StoredEvent)

```

We'll then update our initialisation `SQL` script so that we add a new `kind` column inside the database. This makes it easy for us to index and find the latest compaction event and load all events from there.

```py
INIT_SQL = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'session',
    event_json TEXT NOT NULL,
    created_at REAL NOT NULL
);
"""
```

We can then update our `add_message` function so that it now loads in the `kind` event type as a column too.

```py
async def add_message(
    self, event: StoredEvent, created_at: float | None = None
) -> None:
    conn = await self.db()
    created_at = created_at or time.time()
    await conn.execute(
        """
        INSERT INTO messages (kind, event_json, created_at)
        VALUES (?, ?, ?)
        """,
        (event.event_type, event.model_dump_json(), created_at),
    )
    await conn.commit()
```

### Implementing Compaction

Implementing compaction is relatively straightforward. On a high level, here's how our compaction will work

1. **Determine if we've hit a limit**: This can be a message or token limit that you compute using the list of events that you have in the context
2. **Summarise all of the context so far**: We'll then use a LLM prompt to summarise everything into a single `CompactionEvent`
3. **Recreate the new context**: Now the model has a summary of all the prior context along with the new messages you'll be adding.

There are a lot of other optimisations that you can add in here but we'll choose to keep it simple for our tutorial series. Let's start by implementing a simple `should_summarise` function which will just tell us if the number of events is greater than 30 for now.

```py
def should_summarise(self, events: list[StoredEvent]) -> bool:
    max_events_before_summary = 30
    used_ratio = min(len(events) / max_events_before_summary, 1.0)
    remaining_pct = round((1.0 - used_ratio) * 100, 1)
    print(f"[Logging]: {remaining_pct}% context remaining")
    return len(events) > max_events_before_summary
```

Now we need to modify our `load_messages` call too so that we grab the list of events after the most recent compaction. We can fetch this using the following function

```py
async def _latest_compaction_id(self) -> int | None:
    conn = await self.db()
    cursor = await conn.execute(
        """
        SELECT id
        FROM messages
        WHERE kind = 'compaction'
        ORDER BY id DESC
        LIMIT 1
        """
    )
    row = await cursor.fetchone()
    await cursor.close()
    if row is None:
        return None
    return int(row[0])
```

We'll then use this in our `load_messages` function as seen below.

```py
async def load_messages(self) -> list[StoredEvent]:
    conn = await self.db()

    # Get most recent events
    latest_compaction_id = await self._latest_compaction_id()
    if latest_compaction_id is None:
        cursor = await conn.execute(
            """
            SELECT kind, event_json
            FROM messages
            ORDER BY id ASC
            """
        )
    else:
        cursor = await conn.execute(
            """
            SELECT kind, event_json
            FROM messages
            WHERE id >= ?
            ORDER BY id ASC
            """,
            (latest_compaction_id,),
        )
    rows = await cursor.fetchall()
    await cursor.close()
    events: list[StoredEvent] = []
    for row in rows:
        kind, raw_event_json = row
        payload = json.loads(raw_event_json)
        if "event_type" not in payload:
            payload["event_type"] = kind or "session"
        events.append(StoredEventAdapter.validate_python(payload))

    # Now we need to determine if we need to compact it
    if self.should_summarise(events):
        events = await self.generate_summary(events)

    return events
```

We'll then add a simple summarisation prompt and a static method on our `SessionManager` class to create a `memory.md` file for today

```py
@staticmethod
def _append_summary_to_memory(summary_text: str) -> None:
    now = datetime.now()
    memory_dir = Path("memory")
    memory_dir.mkdir(parents=True, exist_ok=True)
    memory_file = memory_dir / f"{now.strftime('%d-%m-%Y')}.md"
    line = f"[{now.strftime('%H:%M')}]: {summary_text}\n"
    with memory_file.open("a", encoding="utf-8") as f:
        f.write(line)

async def generate_summary(self, events: list[StoredEvent]) -> list[StoredEvent]:
    if not events:
        return events

    print("[Logging] Compaction Starting")
    response = await self.client.aio.models.generate_content(
        model="gemini-3-pro-preview",
        contents=[event.to_content() for event in events],
        config=types.GenerateContentConfig(
            tools=[],
            system_instruction=(
                """
You're about to be given a conversation history and the relevant tool calls within the conversation. Your job is to generate a summary of this entire conversation in at most 4 paragraphs.

Required structure:
1) Start with the key user objective first.
2) Then describe what was accomplished across the lifecycle (files read, commands run, code changes made).
3) Then briefly cover blockers/loops and what was learned.
4) End with the current outcome and immediate next step.

Style constraints:
- Return natural language text only.
- Do not call tools or emit function calls.
- Do not return JSON, XML, code blocks, or markdown lists.
- Keep it brief, concrete, and factual.
"""
            ),
        ),
    )
    print("[Logging] Compaction Ended")
    summary_parts = [
        part.text
        for part in response.candidates[0].content.parts
        if not part.thought and part.text
    ]
    summary = "\n".join(summary_parts).strip()
    if not summary:
        summary = "Summary unavailable."

    self._append_summary_to_memory(summary)
    await self.add_message(CompactionEvent(parts=[TextPart(text=summary)]))
    return [CompactionEvent(parts=[TextPart(text=summary)])]
```

Once we run this, we'll now see a simple compaction working out of the box. For simplicity sake here, we'll just set it such that whenever we have 30 events, we'll automatically compact. In practice the Gemini API ships with a method called `count_tokens` for you to [count the exact tokens that you've used](https://ai.google.dev/gemini-api/docs/tokens) which you can use to write a function that evaluates when to compact with a more fine-grained approach.

## Adding System Instructions

We'll finish off this section with some system instructions for our Agent. We want to let it know that it's called Koroku and that it has past conversation history/compaction working in a memory.md file. We'll also add a new safeguard so that we run for a maximum of 15 tool calls before we stop and then tell the model to ask the user for clarification before proceeding.

First, let's define our system instruction and a guardrail message that fires when the agent has used up its tool call budget:

```py
AGENT_SYSTEM_INSTRUCTION = """
You are Koroku, a helpful personal assistant. You have access to tools that let you read files, run commands, and more.

You have a memory file at memory.md that contains summaries of past conversations. If the user references something from a previous conversation, check there first.

Be concise and helpful. If you're unsure about something, ask for clarification rather than guessing.
"""

TOOL_CALL_GUARDRAIL_INSTRUCTION = """
You have used a large number of tool calls in this turn. Please stop calling tools and summarise what you've done so far. Ask the user for clarification or confirmation before proceeding with more actions.
"""
```

Now let's look at how we use these in our agent's `run` method. The key idea is simple: we count how many events have happened since the user's last message. If that number exceeds our budget, we disable tools entirely and inject the guardrail instruction so the model is forced to respond with text instead of making more calls.

There's one subtlety though. In the Gemini API, function responses are sent back with `role: "user"` — the same role as an actual human message. If we naively searched for the last `role == "user"` event, we'd find a function response and reset the budget counter every time a tool runs. That would defeat the entire purpose of the guardrail.

So we need a helper that distinguishes real user turns from function response turns:

```py
    @staticmethod
    def _is_real_user_turn(event: StoredEvent) -> bool:
        if not isinstance(event, SessionEvent) or event.role != "user":
            return False
        return not any(isinstance(part, FunctionResponsePart) for part in event.parts)
```

A real user turn is a `SessionEvent` with `role == "user"` that doesn't contain any `FunctionResponsePart`s. Simple, but without it the budget check would never trigger.

Here's the full `run` method using this helper:

```py
    async def run(self, message: types.Content) -> types.Content | None:
        """Run one assistant step. Returns tool-response message, or None when done."""
        has_function_response_input = any(
            part.function_response is not None for part in message.parts
        )
        conversation = await self.session_manager.load_messages()

        if not has_function_response_input:
            session_message = SessionEvent.from_content(message)
            await self.session_manager.add_message(session_message)
            conversation = await self.session_manager.load_messages()

        last_user_idx = -1
        for idx in range(len(conversation) - 1, -1, -1):
            event = conversation[idx]
            if self._is_real_user_turn(event):
                last_user_idx = idx
                break

        session_events_since_last_user = (
            len(conversation)
            if last_user_idx < 0
            else len(conversation) - last_user_idx - 1
        )
        has_tool_budget = session_events_since_last_user < self.max_tool_calls_per_turn

        tools = self.get_tools() if has_tool_budget else []
        events_for_model = list(conversation)
        if not has_tool_budget:
            events_for_model.append(
                SessionEvent(
                    role="user",
                    parts=[TextPart(text=TOOL_CALL_GUARDRAIL_INSTRUCTION)],
                )
            )

        completion = await self.client.aio.models.generate_content(
            model=self.model,
            contents=[event.to_content() for event in events_for_model],
            config=types.GenerateContentConfig(
                tools=tools,
                system_instruction=AGENT_SYSTEM_INSTRUCTION,
            ),
        )
```

We walk backwards through the conversation to find the last _real_ user message — skipping over function responses that happen to share the same role. Everything after it counts against the budget. Once we exceed `max_tool_calls_per_turn` (which we set to 15), two things happen:

1. **Tools are disabled**: We pass an empty `tools` list to `generate_content`, so the model physically cannot emit function calls.
2. **A guardrail message is injected**: We append a fake user message telling the model to stop and summarise. This nudges it to produce a helpful text response instead of trying (and failing) to call tools.

This is a belt-and-suspenders approach. Either change alone would probably work, but together they make runaway tool loops essentially impossible. The model can't call tools because we removed them, and even if we hadn't, the guardrail instruction tells it to pause and check in with the user.

## Wrapping Up

We've covered a lot of ground in this post. Our agent now has:

1. **Persistent memory**: Conversations are saved to SQLite and faithfully reconstructed on restart, including thinking signatures and tool call metadata.
2. **Context compaction**: When the conversation gets too long, we summarise it into a single compaction event and write the summary to a `memory.md` file for future reference.
3. **Tool call guardrails**: A simple budget system that prevents the agent from spiralling into endless tool call loops.

None of these are particularly complex on their own, but together they transform our agent from a stateless chatbot into something that feels much more like a persistent assistant.

So far though, we've been running everything locally. That's fine for development, but our Telegram bot needs to be online 24/7 — not just when our laptop is open. In the next post, we'll deploy the whole thing to [Modal](https://modal.com) so it runs in the cloud with persistent storage, automatic restarts, and zero infrastructure to manage. We'll see how to package up our agent, mount the SQLite database, and get a production-ready deployment with just a few lines of config.
