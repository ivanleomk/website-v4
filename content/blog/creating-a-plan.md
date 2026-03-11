---
title: Creating a Plan
date: 2026-03-11
description: Teaching our deep research agent to break broad questions into a concrete research plan
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Deep Research From Scratch
---

If you ask a model a broad question and let it immediately start searching, the model will jump to the first promising source, summarise random facts and then forget half the original question by the time it's ready to write.

Before we send our agent into the void, it needs a flight plan. Most of the code here comes from my [Building OpenClawd from Scratch series](./the-lay-of-the-land.md) where we show how to implement things like persistence, tool calls and the agent loop from scratch.

We'll implement a simple loop in this first part where we'll build an agent which will ask clarifying questions for you until it's got all of the context it needs.

For this series, we'll be using the new beta interactions API that the `google-genai` sdk now ships with.

## Creating our first Interaction

Before we can build an intelligent agent, we need to understand how to have a coherent conversation with a language model. In many traditional API setups, conversations are "stateless." This means every time you send a message, you also have to send the entire chat history along with it. The model has no memory of its own; you have to provide it every single time. This is inefficient, slow, and costly.

This is the problem the Interactions API is designed to solve. An Interaction is a stateful, managed conversation thread.

Think of it like a persistent text message chain. When you start an Interaction, you get back an interaction_id. For every subsequent turn in the conversation, you simply send your new input along with that ID. The Gemini backend takes care of remembering the entire history, providing the necessary context to the model for you.

Let's see it in action by creating our first interaction.

```py
import warnings
from google.genai import Client
from rich import print

warnings.filterwarnings(
    "ignore",
    message="Interactions usage is experimental and may change in future versions.",
    category=UserWarning,
)


client = Client()

response = client.interactions.create(
    model="gemini-3-flash-preview", input="This is a test"
)

print(response)
```

Sending this request returns a detailed response object that contains everything we need to manage our conversation.

```py
Interaction(
    id='v1_ChdwZjJ3YWNuVEp1cjU0LUVQM3VfT2tBRRIXcGYyd2FjblRKdXI1NC1FUDN1X09rQUU',
    created=datetime.datetime(2026, 3, 11, 5, 29, 12, tzinfo=datetime.timezone.utc),
    status='completed',
    updated=datetime.datetime(2026, 3, 11, 5, 29, 12, tzinfo=datetime.timezone.utc),
    agent=None,
    agent_config=None,
    input=None,
    model='gemini-3-flash-preview',
    outputs=[
        ThoughtContent(
            type='thought',
            signature='Et8CCtwCAb4+9vs1z1cPCS524/R7L0Dwra7bOPuxPoeNMXArf1Lna1eQgXJhhaisn8jMqrUGkYrUPg1+bKmd55dk1wFdUQPHc5qtAVtyhTwaJmm/GIDxQvfYKXXZHJTiIMzbS+6BKLU3f8UxBINpHSf4d0/vsIy4WWQ2bGShB8JCz42skYvl100/ZmDW0SMGh
aAYcQf6P/ZI6d9GiEQcKWtE5M9+qe5XXOMttzxZntCt1cXS2ElaJcBPG4e3mEcaITRe+O52qQTG4MjRndK1XVP2hKc3eYg+kJk1/fjc5T24Ze0TYCcAMZE/KdIRmXGmAxYBg0+VXHtT5PAIziGhRBBLzf3PRlrBVj0vqwquKqLv8PslBAI9H5M8GqIBadDPs76Q2oMCBHCkJfvYTSOcxO60M
s8YHabzq2yOZ1bczC4XOGJH1c93/tXXRW3LvEPitqw149FPwEa2zF7htuN5hl2U',
            summary=None
        ),
        TextContent(text='Test received! I am functioning properly and ready to help. How can I assist you today?', type='text', annotations=None)
    ],
    previous_interaction_id=None,
    response_format=None,
    response_mime_type=None,
    response_modalities=None,
    role='model',
    system_instruction=None,
    tools=None,
    usage=Usage(
        cached_tokens_by_modality=None,
        input_tokens_by_modality=[InputTokensByModality(modality='text', tokens=5)],
        output_tokens_by_modality=None,
        tool_use_tokens_by_modality=None,
        total_cached_tokens=0,
        total_input_tokens=5,
        total_output_tokens=19,
        total_thought_tokens=72,
        total_tokens=96,
        total_tool_use_tokens=0
    ),
    object='interaction'
)
```

There are three key fields here that form the foundation of our agent:

- **`id`**: A unique identifier for the entire conversation that maintains state on Gemini's backend, allowing you to build multi-step dialogues without resending the chat history.
- **`outputs`**: A list containing the model's response for the current turn, which can include not only plain text but also structured data like function calls to enable actions.
- **`usage`**: An object that provides a detailed breakdown of token consumption for the current turn, which is crucial for monitoring and managing the interaction's cost.

## Asking Clarifying Questions

Before we start building out a plan, we need to let the model ask some clarifying questions to resolve ambiguity. This is better than guessing the user's intent and producing a generic and unhelpful answer. Instead of letting the model ask questions using unstructured text, we'll force it to use a specific tool to get more information.

We'll do so by defining a `clarifyScope` tool. In other words, the absence of a tool call signals that the clarification phase is over and it's time to move on to planning.

Let's define the simple tool that enables this behavior.

```python
clarify_scope_tool = {
    "name": "clarify_scope",
    "description": "Ask the user a clarifying question to better understand the research request. Only use this when you need more information.",
    "parameters": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The specific question to ask the user to resolve ambiguity.",
            }
        },
        "required": ["question"],
    },
}
```

Now, let's see this in action. We can provide the model with a tool for it to call as seen below.

```py

response = client.interactions.create(
    model=MODEL,
    input=(
        f"You're a deep research agent. Use the clarify Scope tool if you need more information from the user before generating your response. if not just reply normally to {initial_request}"
    ),
    tools=[clarify_scope_tool],
)
```

When the model calls the tool, we get the following output

```py
~/D/c/build-your-own-deep-research-agent (main)> python3 ./workshops/questions/tools.py

What do you want to run deep research on?
> Tell me about Tiong Bahru Bakery

Response

<Function Call>
FunctionCallContent(
    id='ivx9smi8',
    arguments={
        'question': 'Would you like me to focus on the history and growth of the Tiong Bahru Bakery brand, a guide to their signature menu items and locations, or their role in the gentrification of the Tiong Bahru neighborhood?'
    },
    name='clarifyScope',
    type='function_call',
    signature=None
)
```

This also means that when the model sees that it's not a relevant query, it simply just won't ask any questions

```py
~/D/c/build-your-own-deep-research-agent (main)> python3 ./workshops/questions/tools.py

What do you want to run deep research on?
> tell me a joke

Response

[
    ThoughtContent(
        type='thought',
        signature='EoEECv4...',
        summary=None
    ),
    TextContent(text='Why did the researcher cross the road?\n\nTo get to the other side of the data set!', type='text', annotations=None)
]
```

Here's the simple agent code for you to run

```py
import warnings

from google.genai import Client
from rich import print

warnings.filterwarnings(
    "ignore",
    message="Interactions usage is experimental and may change in future versions.",
    category=UserWarning,
)


MODEL = "gemini-3-flash-preview"

clarify_scope_tool = {
    "type": "function",
    "name": "clarifyScope",
    "description": "Ask the user a clarifying question to better understand the deep research request.",
    "parameters": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The next clarifying question to ask the user.",
            }
        },
        "required": ["question"],
    },
}


client = Client()

print()
print("[bold cyan]What do you want to run deep research on?[/bold cyan]")
initial_request = input("> ")
print()

response = client.interactions.create(
    model=MODEL,
    input=(
        f"You're a deep research agent. Use the clarify Scope tool if you need more information from the user before generating your response. if not just reply normally to {initial_request}"
    ),
    tools=[clarify_scope_tool],
)

function_call = next(
    (output for output in response.outputs if output.type == "function_call"),
    None,
)

print("[bold green]Response[/bold green]")
print()

if function_call and function_call.name == "clarifyScope":
    print("<Function Call>")
    print(function_call)
    print("</Function Call>")

else:
    print(response.outputs)
```

Now that we've seen how tool calling works, let's write a simple while loop that will prompt the user until our model feels like it has enough information.

## Generating a plan

Now that we've seen how a single tool call works, we can build the core of our scoping agent: a loop that continues asking questions until the model has enough information to proceed.
The logic is straightforward: we'll run a while loop that checks for a tool call in the model's response.

1. If a clarifyScope tool call exists, we'll ask the user the generated question, capture their answer, and send it back to the model as a function_result to continue the same conversation.
2. If there is no tool call, it means the model is confident it understands the request. It will return a text summary, and we can break the loop.

Here's the full implementation.

```py
import warnings

from google.genai import Client
from rich import print
from rich.markdown import Markdown

warnings.filterwarnings(
    "ignore",
    message="Interactions usage is experimental and may change in future versions.",
    category=UserWarning,
)


SCOPING_MODEL = "gemini-3-flash-preview"

clarify_scope_tool = {
    "type": "function",
    "name": "clarifyScope",
    "description": "Ask the user a clarifying question to better understand the deep research request.",
    "parameters": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The next clarifying question to ask the user.",
            }
        },
        "required": ["question"],
    },
}


def run_clarification():
    client = Client()
    previous_interaction_id = None

    print()
    print("[bold cyan]What do you want to run deep research on?[/bold cyan]")
    initial_request = input("> ")
    print()

    response = client.interactions.create(
        model=SCOPING_MODEL,
        input=f"""
You're helping scope a deep research request.
Use the clarifyScope tool only when you need more information from the user.
When you have enough information, stop calling the tool and return only a short markdown summary of what the user asked for.
Do not answer the research request itself.

User request: {initial_request}
""",
        tools=[clarify_scope_tool],
        previous_interaction_id=previous_interaction_id,
    )
    previous_interaction_id = response.id

    clarification_history = []

    while True:
        function_call = next(
            (output for output in response.outputs if output.type == "function_call"),
            None,
        )

        if not function_call or function_call.name != "clarifyScope":
            break

        question = function_call.arguments["question"]

        print()
        print(f"[bold cyan]{question}[/bold cyan]")
        answer = input("> ")
        print()
        clarification_history.append((question, answer))

        response = client.interactions.create(
            model=SCOPING_MODEL,
            input=[
                {
                    "type": "function_result",
                    "call_id": function_call.id,
                    "name": function_call.name,
                    "result": answer,
                }
            ],
            tools=[clarify_scope_tool],
            previous_interaction_id=previous_interaction_id,
        )
        previous_interaction_id = response.id

    return initial_request, clarification_history, response.outputs[-1].text


if __name__ == "__main__":
    _, _, response_text = run_clarification()

    print("[bold green]Response[/bold green]")
    print()
    print(Markdown(response_text))
```

This interactive dialogue is the core of our solution to the problem we set out to solve. Instead of letting an agent immediately jump into the void with a vague goal, we’ve built a crucial "scoping phase" that forces collaboration. Through a series of clarifying questions, our agent has successfully distilled a broad user request into a focused, user-validated research brief. This brief acts as a contract, ensuring the agent knows exactly what to investigate before it writes a single line of code or performs a single search.

In the next section,we'll then generate an initial set of executable todos before starting on its deep research query.

## Creating To-dos

With a validated research brief in hand, our agent now has a clear destination. But it still needs a map. The final step in our planning phase is to translate this natural-language summary into a concrete, machine-readable list of tasks. We'll accomplish this with another targeted model call, using a different tool designed specifically for structuring output.

We introduce a `generate_plan_tool`. This tool forces the model to structure its response into two distinct parts:

1.  **`response`**: A human-readable, 3-4 sentence summary that confirms the agent's understanding and gives the user a quick overview of the plan.
2.  **`todos`**: A list of strings, where each string is a distinct, actionable task for the research agent to perform.

Notice that for this more complex reasoning task, we're switching to a more powerful model, `gemini-3.1-pro-preview`. We feed this model all the context we've gathered so far: the user's initial request, the full history of our clarifying questions and answers, and the final scoped summary.

The prompt explicitly instructs the model to call the `generate_plan` tool exactly once and to populate its fields according to our specifications. By doing this, we get a perfectly structured JSON object back, which we can then easily parse and display.

```python
import warnings

from google.genai import Client
from rich import print
from rich.markdown import Markdown

from questions import run_clarification

warnings.filterwarnings(
    "ignore",
    message="Interactions usage is experimental and may change in future versions.",
    category=UserWarning,
)


PLANNING_MODEL = "gemini-3.1-pro-preview"

generate_plan_tool = {
    "type": "function",
    "name": "generate_plan",
    "description": "Create a structured research plan from the clarified request.",
    "parameters": {
        "type": "object",
        "properties": {
            "response": {
                "type": "string",
                "description": "A 3-4 sentence natural-language summary of what the research plan will do.",
            },
            "todos": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Concrete next-step tasks for the research agent.",
            },
        },
        "required": ["response", "todos"],
    },
}


if __name__ == "__main__":
    initial_request, clarification_history, response_text = run_clarification()

    print("[bold green]Research brief[/bold green]")
    print()
    print(Markdown(response_text))
    print()

    client = Client()
    plan_response = client.interactions.create(
        model=PLANNING_MODEL,
        input=f"""
Create a structured research plan for this clarified deep research request.
Call the generate_plan tool exactly once.
Put a 3-4 sentence natural-language first response to the user in `response`.
That response should acknowledge what they want, restate the research focus clearly, and give a short TL;DR of the plan.
Put the actionable next steps in `todos` as a list of strings.
Do not reply with normal text.

Initial request: {initial_request}
Clarifications: {clarification_history}
Scoped summary: {response_text}
""",
        tools=[generate_plan_tool],
    )

    function_call = next(
        (output for output in plan_response.outputs if output.type == "function_call"),
        None,
    )

    print("[bold magenta]Response[/bold magenta]")
    print()
    print(Markdown(function_call.arguments["response"]))
    print()

    print("[bold magenta]Todos[/bold magenta]")
    print()
    for todo in function_call.arguments["todos"]:
        print(f"[ ] {todo}")

```

Here's an example of the entire process in action, from a vague initial query to a concrete, structured plan:

```text
What do you want to run deep research on?
> starbucks and its corporate social responsiblity stuf


Could you specify which areas of Starbucks' CSR you're most interested in? For example, are you looking for information on their environmental sustainability (like waste and water), their ethical coffee sourcing, or their employee benefits and community programs? Also, are you looking for a critique of their efforts or a general overview?
> thinking of its CSR, history and also employee benefits.

Research brief

The user requested a deep research report on the evolution and current state of Starbucks’ corporate social responsibility (CSR) initiatives. The report should cover the history of the company's ethical commitments, tracing how their social and environmental strategies have developed over the decades. A major focus is required on Starbucks' employee benefits programs, specifically looking at how their "Partner" investments—such as healthcare, tuition coverage, and stock options—function as a core pillar of their CSR. Additionally, the research should explore how these internal labor policies integrate with their broader goals for ethical sourcing and community impact. The final report will provide a comprehensive overview of how Starbucks has historically balanced its corporate growth with its identity as a socially conscious brand.

Response

Thank you for clarifying your interest in Starbucks' corporate social responsibility, specifically regarding its historical evolution and employee benefits. This research will delve into the timeline of Starbucks' CSR milestones, analyzing how its commitments to social impact and ethical sourcing have grown over the decades. A major focus will be placed on its "Partner" benefits, evaluating initiatives like tuition coverage, comprehensive healthcare, and stock options to see how internal labor policies shape its brand. Ultimately, the report will provide a comprehensive overview of how Starbucks integrates these programs to balance corporate growth with its identity as a socially conscious company.

Todos

[ ] Investigate the historical timeline and evolution of Starbucks' CSR initiatives, from early corporate milestones to current sustainability and ethical commitments.
[ ] Analyze Starbucks' "Partner" employee benefits programs in detail, specifically focusing on healthcare coverage, the Starbucks College Achievement Plan, and Bean Stock options.
[ ] Research Starbucks' broader ethical commitments, such as C.A.F.E. Practices for ethical coffee sourcing, and how they complement their internal labor policies.
[ ] Examine historical and current critiques or challenges Starbucks has faced regarding its labor practices and CSR claims.
[ ] Synthesize the findings into a comprehensive report evaluating how successfully Starbucks balances its corporate growth objectives with its socially conscious brand identity.
```

The output is exactly what we need: a friendly confirmation for the user and a checklist of tasks for our agent. We've successfully created our flight plan.

## Conclusion

In this post, we've tackled a fundamental flaw in many agent designs: the tendency to rush into action without a clear goal. By implementing a two-stage planning process, we've built a more deliberate and effective foundation for our deep research agent.

First, we used a lightweight model and a simple `clarifyScope` tool to engage in a dialogue with the user, transforming a broad query into a focused research brief. Then, we passed this validated brief to a more powerful model, using a `generate_plan` tool to create a structured list of executable to-dos. This ensures that before any searching or writing begins, both the user and the agent are in complete agreement about the task at hand.

We now have our plan. The next step is to build the machinery to execute it. In the next part of this series, we'll implement the core agent framework that will take this list of to-dos, pick them up one by one, and begin the actual work of deep research.
