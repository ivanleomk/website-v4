---
title: "Write Stupid Evals"
date: 2024-11-26
image: "/article_1.png"
description: Keep it simple and worry about the rest later
categories:
  - Evals
authors:
  - ivanleomk
---

## Write Stupid Evals

Evals should start simple and get progressively more complex. It's important to start simple because what we're aiming to do is to build a habit for writing these simple assertions early. By doing so, we can start taking our vibes and turning them into objective metrics. This allows us to compare different approaches easily and make a data-driven decision into what works and what doesn't.

Don't overthink it and really just use a `assert` statement at the start.

There's a famous story about a pottery teacher who divided their class into two groups. The first group would be graded solely on quantity - how many pieces they could produce. The second group would be graded on quality - they just needed to produce one perfect piece. When grading time came, something interesting happened: the best pieces all came from the quantity group. While the quality group got stuck theorizing about perfection, the quantity group learned through iterative practice.

This perfectly captures my philosophy on LLM evaluations: start simple, start now, and improve through practice.

### The Case for Simple Evaluations

When I first started working with LLMs, I thought I needed complex evaluation frameworks with multiple metrics, preference learning, and sophisticated ranking systems. I kept putting off evaluations because they seemed too complex to get right.

But here's the thing: the point of evaluations isn't perfection. The goal is to start building the muscle of questioning and measuring your system's performance.

Even a simple assertion checking if your function returns valid JSON is an evaluation - it tells you something concrete about your system's behavior and whether the response model might be too complex for the LLM to handle.

Ideally what you want is a simple evaluation suite that is

1. Easy to run locally
2. Quick to execute in totality
3. Simple to understand

The more complex you build out a evaluation suite, the more likely you are to not use it. That limits your ability to iterate, build new features and ultimately the quality of your system. Let's look at a few simple examples of how we can use assertions to build muscle.

### 1. Discord's Casual Chat Detection

Discord faced an interesting challenge: How do you evaluate whether a chatbot sounds casual? While the obvious approach might be to use another LLM as a judge to evaluate responses, they found a brilliantly simple heuristic:

```python
def is_casual_response(text: str) -> bool:
    return text.islower()
```

This simple check caught most cases where the bot was being too formal. While not perfect, it provided quick feedback during development and was trivial to implement. More importantly, it gave them a foundation to build upon and improve over time.

### 2. Retrieval Quality for SQL Queries

Recently, I worked on comparing different approaches for text-to-SQL retrieval. We were experimenting with everything from raw snippets to modifying the input to the Cohere Re-Ranker, trying different models and prompts for generating summaries.

It's tempting to rely on subjective feelings - "this summary looks good" or "this seems better" but we couldn't make real progress until we nailed down a simple, objective metric - recall@k.

```python
def evaluate_retrieval(queries: List[str], relevant_snippets: List[str], k: int = 5) -> float:
    """
    Evaluate retrieval quality using recall@k
    """
    total_hits = 0
    for query, relevant in zip(queries, relevant_snippets):
        retrieved = retrieve_top_k(query, k)
        if relevant in retrieved:
            total_hits += 1

    return total_hits / len(queries)
```

This made things easy to iterate because when I reported the results to the team, I could say **"Method 1 has a recall@5 of 80% which is 50% better than Method 2. The increase in latency is roughly 100ms but that's a small price to pay for the quality improvement."**

Having this concrete metric let us:

- compare different tradeoffs
- test the impact of different prompts and retrieval methods on the performance of our system
- make an informed decision about which direction to go in

We could iterate rapidly because we had a clear signal about what was working. The metric wasn't perfect, but it was good enough to drive real improvements.

### 3. Testing Tool Selection for Agents

A hot topic in the LLM space right now is agents - language models equipped with tools for autonomous decision-making. While it's tempting to jump straight into building complex agents that can chain multiple actions together, I've found it's crucial to start with dead simple evaluations.

Let's look at how we can progressively build up our evaluation of an agent's capabilities:

```python
from enum import Enum
from pydantic import BaseModel
import instructor
from openai import OpenAI

class ToolChoice(str, Enum):
    CALENDAR = "calendar"
    WEATHER = "weather"
    EMAIL = "email"

class ToolSelection(BaseModel):
    tool: ToolChoice
    reason: str

client = instructor.from_openai(OpenAI())

def evaluate_tool_selection(query: str) -> ToolSelection:
    """
    Evaluate if the model can select the appropriate tool
    """
    return client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=ToolSelection,
        messages=[
            {"role": "user", "content": f"Select the appropriate tool for: {query}"}
        ]
    )
```

Starting with this simple evaluation - "does the model pick the right tool?" - opens up a world of insights:

1. **Model Selection**: We might discover that GPT-4o-mini is great at understanding basic queries (80% accuracy) but struggles with ambiguous ones (20% accuracy). This data helps justify when to upgrade to Claude or even gemini.

2. **Progressive Complexity**: Once we nail single tool selection, we can evolve our evaluation:

   ```python
   class MultiToolSelection(BaseModel):
       reasoning: str
       tools: List[ToolChoice]
   ```

3. **Argument Validation**: Beyond tool selection, we need to validate the arguments:

   ```python
   class CalendarEvent(BaseModel):
       date: datetime
       title: str

       @field_validator("date")
       def validate_date(cls, v):
           if v.year < 2020:
               raise ValueError("Invalid historical date")
           return v
   ```

The beauty of starting simple is that it drives architectural decisions:

- If basic tool selection is failing, maybe we need few-shot examples
- If accuracy is low, perhaps we need to fine-tune
- If certain query types consistently fail, we might need better prompt engineering

Each of these decisions comes from having a concrete metric - tool selection accuracy - rather than vague feelings about agent performance. We can progressively add complexity (multiple tools, argument validation, chain verification) while maintaining our baseline evaluations to ensure we're not regressing on basic capabilities.

This approach saves us from the common trap of building complex agents that look impressive but fail at basic decision-making. By starting with "can it pick the right tool?" and gradually adding complexity, we build reliable systems grounded in measurable performance metrics.

## Building the Evaluation Muscle

The key insight I've gained is that evaluation isn't something you do at the end - it's a habit you build from the start. Every time you have a "vibe" about your system's performance, that's an opportunity to turn that intuition into a measurable metric.

Start with dead simple assertions:

- Does the model return valid JSON?
- Are all the required fields present?
- Does the output match basic format requirements?

Then gradually evolve to more sophisticated measures:

- Are the responses relevant to the input?
- How often does the system pick the right tool?
- What percentage of outputs need human correction?

You don't have to get it right the first time. Like the pottery students, you'll learn more from writing 10 imperfect evaluations than from endlessly planning one perfect one.

## Conclusion

Writing evaluations takes time and effort - there's no getting around that. But waiting for the perfect evaluation framework means missing opportunities to improve your system today.

Start with stupid simple evaluations. Build the habit of measuring what matters. Learn to convert your intuitions into concrete metrics. The sophistication will come naturally as you develop a feel for what works and what doesn't.

Remember: The best evaluation isn't the most sophisticated one you can design - it's the one you'll actually use consistently to make better decisions about your system.
