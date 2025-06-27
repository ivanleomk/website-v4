---
title: Why Coding Agents Are Here to Stay
date: 2025-06-27
description: Why I Use Coding Agents (And Why You Should Too)
categories:
  - AI
  - Coding
  - Productivity
authors:
  - ivanleomk
---

# Why I Use Coding Agents (And Why You Should Too)

Coding agents are here to stay. You have 2-3 months to build trust with these tools before the learning curve becomes painful. Developers who wait struggle with steeper adoption. The choice isn't whether to use them, but whether to start now or later when everyone else has months of experience.

Six months ago, Claude transformed my writing. Instead of perfectionism about finding the perfect description, I focused on getting content out. Claude handled the initial pass, organizing ideas while I iterated on prompts. Output became more concise. I produced content faster.

Coding agents work the same way. Experienced developers tell me: "I don't write much code anymore, I prompt models to do it." This means focusing on the hard part of programming - figuring out what to build, not grinding out implementation.

## When Agents Excel (And When They Struggle)

Coding agents work best on clearly defined tasks from training data. Adding buttons, changing text, refactoring common patterns - these have thousands of examples across GitHub. The model has seen this work before.

Agents struggle with one-off debugging and edge cases. I learned this optimizing imports in a package. The model couldn't understand my `__getattr__` usage for exporting main modules - too rare a pattern. When debugging a build issue with `uv` package manager, multiple agents looped endlessly. I spent hours realizing I'd added static exports to `.gitignore`, preventing bundling. Cursor and other tools couldn't bridge this gap.

The pattern: agents excel when your problem resembles training data. They struggle in uncharted territory.

## My Workflow

Prompt iteration matters as much as code iteration. I identify where models struggle and provide context to prevent failures.

For complex projects, I maintain `agents.md` files with coding standards, architectural decisions, and common patterns. When models need more context, I add relevant MCPs or run multiple instances to compare outputs. Sometimes I ask directly: "What didn't I give you initially?"

Coding has two stages. Planning - deciding what code needs to accomplish. Implementation - writing it. For developers in large organizations, writing code is the easy part. The hard work is understanding requirements, considering edge cases, designing clean interfaces.

I've shifted to type-first development. After agents started generating 8,000-line PRs that were hard to review, I began defining types and interfaces early. This lets me refactor confidently and ship stable code. Agents handle implementation while I focus on architecture.

## The Verification Bottleneck

The bottleneck shifted from generating code to verifying it. Agents produce hundreds of lines in minutes. Human review capacity stays fixed. Volume of changes explodes.

Clear coding standards become essential. If you can't trust agent output, you can't work with it. Be explicit about patterns, establish consistent approaches, build confidence through incremental changes.

Don't limit agents to small changes. My biggest improvements come from agents running five minutes, changing types across files, handling complex refactors. Constraining PRs to 200 lines misses the point - you get stuck in local minima.

Focus on systems that help verify changes efficiently. Better tooling, clearer commit messages, structuring changes for easier review.

## What This Means for Junior Developers

Traditional junior developer paths are disappearing. Tasks we gave new hires - framework migrations, codebase updates, simple features - agents handle now. Junior roles aren't going away. Required skills are changing.

You need more agency. Instead of following detailed tickets, identify problems, propose solutions, think architecturally. The bar for "entry-level" work rises because mechanical programming gets automated.

This affects everyone. If you're not developing prompt engineering, AI collaboration, and high-level system design skills, you're falling behind regardless of experience.

## Beyond Coding

This transformation extends beyond programming. I use similar workflows for writing, research, problem-solving. The pattern stays consistent: AI handles initial heavy lifting while I focus on direction, refinement, verification.

Productivity gains are real. These tools make me 4x more productive on tasks that fit their capabilities. Time saved on implementation goes toward planning, architecture, problems requiring human insight.

## The Choice

Coding agents aren't perfect. They're here. The question isn't whether they'll improve your workflow - it's whether you'll start learning now or wait until adjustment becomes painful.

The 2-3 month learning curve is real. You need time to build trust, understand capabilities and limitations, develop collaboration patterns. Developers who started months ago have that experience. Those who wait face steeper climbs as tools improve and expectations shift.

Look at who's already using these tools. Michio Hashimoto, Jared Summers, Fly.io's CTO, Torsten Baum - god-tier programmers across the industry have adopted coding agents. I've spent $300 on Cursor already this month. When the best developers are investing heavily in these tools, that tells you something about where the industry is heading.

This isn't just about staying competitive in coding. It's about adapting to AI augmentation becoming standard across knowledge work. Start building these skills now.

*In future articles, I'll dive deeper into specific workflows, prompt techniques, and how I actually use these agents day-to-day. For now, the question is simple: will you start learning, or wait until everyone else has a head start?*