---
title: Know when to let the model cook
date: 2026-01-18
description: Taste is all that matters.
categories:
  - Reflections
  - Advice
authors:
  - ivanleomk
---

The best AI products are built by people who know when to let the models cook. Instead of building heavy scaffolding, let the models have the space to plan, self-correct, and execute.

If you've been in the space for a while, the ground has shifted entirely beneath your feet. The old playbook is obsolete and the reason lies in how the models themselves have evolved.

## Mimicry

In the early days of models like GPT-3, [the training objective was simply next-token prediction on massive amounts of text](https://arxiv.org/abs/2005.14165). We then tried to make them more useful with methods like Supervised Fine-Tuning (SFT) and [Reinforcement Learning from Human Feedback (RLHF)](https://arxiv.org/abs/2203.02155). We were teaching the model to mimic a desired output, like writing a polite and helpful response that people would prefer more.

This was a huge leap forward and even with methods like [Direct Preference Optimization (DPO)](https://arxiv.org/abs/2305.18290), we were still fundamentally training models to approximate these human outputs. It's a bit incredible to imagine that back then a 16k context window made the news with the insane 1M context windows that almost every model seems to ship with nowadays.

So we got into the business of building heavy scaffolding to get these models to work.

We built elaborate RAG pipelines to fit within the tiny context windows that we were able to work with. From trying to figure out the best ways to chunk documents, rewriting queries, using re-rankers and finally using metadata filters, we were trying to augment these models with the relevant information.

But this was tricky — and often times with a single mistuned parameter, the model would output pretty confident hallucinations with irrelevant or missing context. Today, we might have thrown that same bit of data into Gemini and used its 1M context window to get the same answer at approximately the right cost.

Agents were little more than intent classifiers routing to DAGs, some dynamically generated but still heavily constrained. They were auditable and explainable but brittle and prone to failure when small things went wrong.

Even structured outputs demanded a heroic amount of effort with models forgetting brackets, hallucinating fields and ignoring schemas so libraries like [Instructor](https://github.com/567-labs/instructor) and [Outlines](https://github.com/dottxt-ai/outlines) stepped in to make them work.

More importantly, we built these systems because the models lacked robust reasoning to handle ambiguity or recover from errors gracefully on their own. Any errors that weren't properly handled would blow our context window and cause the model to fail.

## Verifiable Outputs

The current frontier has shifted to a new training paradigm: rewarding models for verifiable outputs. It's like how we learn math. First, you're asked to try your best on a word problem, showing your work. But instead of being rewarded for how you got the answer, the model is rewarded only for getting the final result right.

But this isn't a magic pill because you need to find the right balance of tasks to help the model learn. You need a variety of tasks to preserve model capabilities but also finding the right difficulty of tasks so that the model isn't thrown in the deep end to tackle a problem that's completely unsolvable.

This is why high-quality RL environments are so expensive. Most contract sizes reach six to seven figures per quarter and [Anthropic has discussed spending more than $1 billion on RL environments this year](https://techcrunch.com/2025/09/21/silicon-valley-bets-big-on-environments-to-train-ai-agents/). The bottleneck here isn't compute - it's about finding the right tasks that push the model without breaking it.

And while the jury is still out on whether RL unlocks new capabilities, more often than not it unlocks latent capabilities in models, discovering new, emergent behaviors like error correction and trying multiple strategies that weren't present in the base model. Some might even argue that it allows [models to go beyond the human distribution](https://x.com/polynoamial/status/1991573478269677945) as per Alpha Go when it discovered Move 37.

This is the brave new world we find ourselves in, and as we scale these systems, we'll find more unexpected ways to push the boundaries of what's possible.

## Agency

This shift in training has changed everything downstream.

Pure RAG approaches turned into agentic retrieval where instead of a fixed pipeline, models decide when to search, ask clarifying questions and test multiple strategies. [This unlocked many new tools in our retrieval arsenal](https://www.lighton.ai/lighton-blogs/rag-is-dead-long-live-rag-retrieval-in-the-age-of-agents) when previously we had only RAG to reckon with.

We now see models with interleaved thinking where they have much longer stretches of internal monologue or chain-of-thought reasoning between tool calls. Models can call a tool, reflect on the output and decide its next move, resulting in far more autonomous and sophisticated behaviour.

Models can even manage their own state with techniques like context pruning and time travel. In the Kimi CLI, an agent can [selectively send itself back in time with a message to the past](https://x.com/darrenangle/status/1982509166255391080). In tools like [Repogrep](https://app.ami.dev/repogrep), we're seeing implementations of context pruning where the model can choose to unset and remove information from tool calls that are irrelevant.

Other models like Claude-Opus-4-5 and GPT-5.2 now hold coherence across hour-long tasks, running for weeks at a time in a method that just abuses compute. From the Ralph Wiggum technique popularized by Geoffrey Huntley to the more recent work by Cursor where they ran [GPT-5.2-Codex for weeks on end to create a modern browser from scratch](https://cursor.com/blog/scaling-agents), we've got a mini machine god in our pockets that's got the ability to reason, learn, and adapt in ways that were once thought impossible.

As Yang Zhilin, founder of Kimi, said in [this interview](https://www.youtube.com/watch?v=91fmhAnECVc), these models have moved on from just brains in a vat operating in an isolated view to agents that are now able to reason, learn from the world and make changes to it.

## Where do we go from here?

The techniques that once made our products work are now the very things holding them back.

If your edit file tool is broken, a modern agent doesn't just fail — it falls back to terminal commands, using `cat`, `sed`, or `echo` to accomplish the task. It routes around damage. Ask it to scrape Hacker News, and it already knows an API exists.

The constraints we used to add to "help" now often just block the model from using what it already knows. Your evaluations too need to change.

While old habits die hard, today the real moat is taste — knowing when to step in and when to let the model shine. Your competitive edge isn't more scaffolding but rather architecting around the model's native strengths.

Michelangelo said of sculpting David: "I saw the angel in the marble and carved until I set him free." The same applies here.

The models are the foundation. Learn what they can do. Build wisely on top of them.

Let them cook.
