---
title: Deep Research From Scratch
date: 2026-03-11
description: Breaking down what deep research systems do and the roadmap for building one from scratch
authors:
  - ivanleomk
categories:
  - Agents
  - Applied AI
series:
  - Deep Research From Scratch
---

Deep research is quickly becoming one of the most useful agent patterns. Instead of giving you a fast answer based on whatever happens to already be in the model's weights, it goes out, gathers evidence, follows leads, keeps track of open threads and then comes back with a synthesized response.

That sounds fancy, but the underlying system is actually not that mystical.

In this series, we're going to build a deep research agent from scratch. We'll start with the core loop first and then progressively add the pieces that make these systems feel robust in practice.

Before we write any code, it's worth breaking down what a deep research system actually is.

## What is an Agent

At the simplest level, an agent is just a model that can do work in a loop.

A chatbot receives one prompt and returns one answer. An agent receives a prompt, decides what to do next, uses tools, inspects the results, and then decides what to do after that. The important difference is not "intelligence" in the abstract. It's the ability to take actions and update its plan based on what it learns.

For deep research, those actions usually look like this:

1. Search for sources
2. Open and read useful pages
3. Extract facts or quotes
4. Ask follow-up questions
5. Keep track of unresolved threads
6. Synthesize the findings into a report

That means a deep research agent is not a fundamentally different species from a coding agent. It's the same core pattern with a different set of tools and a different output. Instead of editing files and running tests, it searches, reads, verifies and writes.

The hard part is not getting the first answer. The hard part is getting the model to stay organized long enough to produce a good one.

## How Deep Research Usually Works

When a user asks a deep research question, the system should almost never jump straight to the final response.

Let's say the user asks:

> Compare the best ways for a small B2B SaaS company to expand into Japan in 2026.

A naive system might search once, read two pages and then bluff the rest. A better system will first turn the request into a plan.

That plan might look something like this:

1. Understand the scope of the question
2. Identify the major areas to research
3. Search for high quality sources for each area
4. Read and summarize the best sources
5. Notice what is still unclear
6. Generate follow-up questions
7. Repeat until the important gaps are closed
8. Synthesize the result into a final report

The key idea is that research is iterative. Good researchers don't just search once. They search, read, realize they are missing context, then branch into narrower questions.

In practice, a strong setup often uses two different model roles:

1. A stronger model creates and revises the research plan
2. A cheaper and dumber model executes narrower follow-up searches and extraction tasks

This split matters because a lot of research work is repetitive. Once the high-level planner decides that we need data on pricing norms, distribution channels, local compliance requirements and case studies, the individual sub-questions are often straightforward:

- "Find current documentation on Japanese invoicing requirements for foreign SaaS companies"
- "Summarize pricing expectations for SMB software in Japan"
- "Look for examples of foreign B2B SaaS companies entering Japan successfully"

You do not need your most expensive model deciding how to search for every one of these. A simpler model can execute many of these follow-up steps cheaply, then return its findings to the main planner.

That gives us a loop that looks more like this:

```text
user query
-> planner creates research plan
-> executor searches and reads sources
-> planner reviews findings
-> planner generates follow-up questions
-> executor investigates those questions
-> planner synthesizes final answer
```

This is what makes deep research feel different from ordinary search. It is not just retrieval. It is retrieval guided by an evolving plan.

## Todos Keep The Agent Honest

The easiest way for a model to fail a long task is to lose track of what it still needs to do.

This is why todos matter.

A todo list gives the model an external working memory for the task at hand. Instead of forcing it to remember every outstanding thread in its hidden state, we let it write those threads down explicitly.

A good todo list for deep research might include items like:

1. Find recent market entry case studies
2. Verify tax and invoicing constraints
3. Compare direct sales vs reseller distribution
4. Check whether pricing expectations differ by segment
5. Draft final comparison table

As the agent works, it should be able to create, update and complete these items. That does two useful things.

Firstly, it keeps the task grounded. The model can look at the todo list and ask "what is unresolved?" instead of drifting into premature synthesis.

Secondly, it creates a natural control surface for orchestration. If an item is still open, the planner knows there is more work to do. If the important items are done, it can move on to writing.

Without todos, long research runs often look impressive while quietly skipping half the task.

With todos, the system has a crude but effective notion of progress.

## Subagents Are Just Tool Calls

There's a tendency to describe subagents as if they are a magical new primitive.

They're not.

A subagent is usually just a tool call that delegates a narrower task to another model with its own prompt, context and allowed tools.

For example, our main planner might call a tool like this:

```json
{
  "tool": "run_research_subagent",
  "task": "Find 3 credible sources on Japanese B2B SaaS pricing expectations and summarize them",
  "success_criteria": [
    "At least 3 sources",
    "Include publication dates",
    "Highlight disagreements between sources"
  ]
}
```

Under the hood, that tool might spin up another model call with a more specific system prompt, a smaller context window and a limited tool set such as `search_web` and `open_page`.

That is all a subagent really is: scoped delegation.

This framing is useful because it keeps the architecture simple. You do not need a special metaphysical theory of multi-agent systems. You just need:

1. A parent agent that knows when to delegate
2. A tool interface for launching delegated tasks
3. A structured result that comes back from the delegated run

Once you see subagents this way, they become much easier to reason about. They are not replacing the main agent. They are just another tool it can use when the task is easier to solve in isolation.

## What We'll Build

In this series, we'll build a minimal deep research system from scratch.

We'll start with a planner that can turn a broad question into a concrete sequence of tasks. Then we'll add web search, page reading, todos, delegated subagents and a final synthesis step that turns all that raw evidence into something useful.

The goal is not to build the most bloated research stack possible. The goal is to understand the smallest set of ideas that make deep research work reliably.

Once we have that, we can add the fancy parts later.
