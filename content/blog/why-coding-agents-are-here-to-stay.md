---
title: Coding is the New Writing
date: 2025-06-27
description: Turns out I never liked coding all along
categories:
  - LLM
  - Personal Development
  - Agents
authors:
  - ivanleomk
---

> The most common sentiment that I've heard over the past few months has been "I don't write code anymore, I just prompt models".

Six months ago, Claude transformed my writing. Instead of perfectionism about finding the perfect description, I focused on getting content out. Claude handled the initial pass, organizing ideas while I iterated on prompts. Output became more concise and I produced content faster. More importantly, this allowed me to focus on what I enjoyed the most - bringing my ideas to life.

The same could be said for coding agents. They allow you to focus on the hard part of programming - figuring out what to build, not grinding out implementation.

Coding agents are here to stay - you need 2-3 months to build trust with these tools, get comfortable with the learning curve and then start getting productive with them. It's very much similar to when you learn a new programming language, except this time you're learning a new way of thinking.

I hope that through this article, you'll be convinced of two things

1. You need to start thinking of how to ratchet up your spend on Coding Agents - or whatever domain you're working on.
2. If you're not already using them, you should start now.

## When Agents Excel (And When They Struggle)

Agents tend to excel best on easy and common tasks and struggle with one-off debugging and edge cases.

For instance, adding a button, changing some text or refactoring to fit common patterns are tasks which have thousands of examples across Github and in the training dataset. Models don't struggle on this.

What they tend to struggle with are more unique tasks. I'll give a few examples here where coding agents like Amp, Cursor etc all struggled and looped endlessly

1. Adding diskcaching using custom keys on Pydantic models and keyword arguments : I wanted to use the diskcache module and cache cases whereby the user had asked for a specific pydantic response model and passed in a specific prompt.
2. Optimising exports in a package using the `__getattr__` function in Python : I was importing everything in my package's `__init__.py` file and wanted to speed up what was otherwise 16s of imports.
3. Static Assets not being included in `uv` : It tooks me 2 hours of looping before I realized I'd added static exports to `.gitignore`, preventing bundling.

In short, agents excel when your problem resembles training data. They struggle in uncharted territory.

## Three Essential Tips for Using Coding Agents

By now, you've hopefully become curious about coding agents or realized they're indeed incredible tools. Based on months of experience, here are three key takeaways that will transform how you work with them:

### Treat Coding Agents Like Tunable Slot Machines

It's often useful to think of coding agents as slot machines that can be tuned to produce better results. **Your best strategy is either rerunning the model with the same prompt or iterating on the prompt itself.**

This approach requires clarity and precision:

- Have a clear idea of what you want before you start
- Use version control to track all changes and iterations
- Be specific about which files you want the model to edit
- Communicate the scope of changes clearly so the agent understands boundaries
- This precision becomes crucial when multiple coding agents work on the same repository

The key insight: instead of accepting the first output, treat each generation as one pull of the slot machine. Keep pulling (or adjust your approach) until you hit the jackpot.

### Verification Has Become the Expensive Part

The bottleneck has shifted from writing code to verifying it. Where I used to spend an hour coding, I now spend 30-40 minutes thinking about the code, reviewing tests, and considering types before writing anything.

This happens because:

- Generating code is now cheap and fast
- Verifying code quality remains expensive and time-consuming
- Human review capacity stays fixed while AI output volume explodes

The solution is front-loading your verification systems. Build comprehensive tests that guarantee functionality for the interfaces you care about. When you have robust testing infrastructure, getting agents to write more concise, abstract code becomes trivial. You can trust the output because your safety nets catch any issues.

### Don't Limit Agents to Small Changes

This might be counterintuitive, but constraining agents to small changes misses the point entirely. You'll get stuck in local minima, making incremental improvements instead of meaningful progress.

My biggest improvements come from agents running for five minutes and:

- Changing types across multiple files
- Handling complex refactors
- Managing large-scale architectural changes

The traditional approach of limiting PRs to 200 lines doesn't apply here. Agents can handle 8,000-line changes that would take humans weeks. The challenge isn't the size of the change—it's having systems in place to verify those changes efficiently.

## What This Means for You

These principles extend far beyond coding. Whether you're writing, researching, or problem-solving, the pattern remains consistent: AI handles the initial heavy lifting while you focus on direction, refinement, and verification.

The productivity gains are real—these tools make me 4x more productive on tasks that fit their capabilities. Time saved on implementation goes toward planning, architecture, and problems requiring human insight.

For developers, this shift is particularly significant. Traditional junior developer paths are disappearing as agents handle framework migrations, codebase updates, and simple features. The bar for "entry-level" work rises because mechanical programming gets automated. Success now requires more agency: identifying problems, proposing solutions, and thinking architecturally.

## Conclusion

Coding agents aren't perfect, but they're here to stay.

The evidence is everywhere:

- [Thorsten Ball now lets agents write 70-80% of his code]().
- [Jared Summers from Bun talking about how the bun redis client was written mostly by claude code](https://x.com/jarredsumner/status/1911277883810783744)
- [Mitchell Hashimoto who co-founded HashiCorp](https://x.com/zeddotdev/status/1935802037301649634)

All of these programmers have fundamentally changed how they work. What used to require hours of tutorial-diving and careful implementation now happens in minutes through well-crafted prompts. This makes **exploration trivial and experimentation cheap**.

If you need to spin up load testing scripts, different architectures, try a new library, these are just a prompt away. If anything, the barrier to trying new ideas has collapsed.

The choice is simple: will you start learning, or wait until everyone else has a head start?
