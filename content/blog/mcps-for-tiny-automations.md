---
title: MCPs for Tiny Automations
date: 2025-07-01
description: If you're not working with MCPs, you're missing out on a powerful tool for rapid prototyping and automation.
categories:
  - MCP
  - Agents
authors:
  - ivanleomk
---

# Building MCPs for Tiny Automations

> If you're unfamiliar with MCPs, I wrote a longer [post](/blog/simple-mcps) about them.

What if you could turn a 3-hour manual workflow into a 5-minute conversation with Claude? My [Korean learning MCP](https://github.com/ivanleomk/Jishik) did exactly that, automatically creating flashcards with AI-generated audio and importing them into Anki. The time investment to build this automation was roughly the same as doing the manual work once—but now it saves hours every week.

MCPs are bridges between tools you already use. Instead of building entire applications to test integration ideas, you can prototype automations in a single afternoon and discover what actually works. The key insight is using MCPs for rapid discovery of valuable use cases, not perfect solutions.

In this article, I'll talk briefly of how I scoped out my MCP framework with Claude and used Amp to build my Korean learning MCP. I'll try my best to link to the relevant sections of the Amp documentation.

## MCPs as Discovery Tools

MCPs excel at revealing automation opportunities you didn't know existed. Rather than planning elaborate systems upfront, you can quickly test whether specific integrations add real value to your workflow.

The traditional approach requires building entire applications to validate integration ideas. MCPs flip this model. You create simple bridges between existing tools, test them in real workflows, and iterate based on what actually saves time. This discovery-first approach prevents over-engineering solutions to problems that don't matter.

When you install a Gmail MCP and start using it with Claude Desktop, you quickly discover which email tasks benefit from AI assistance and which don't. You find the boundaries of what works well versus what feels clunky. These insights guide where to invest deeper automation effort.

## Why the Time Investment Makes Sense

Building an MCP takes roughly the same time as doing the manual work once. The difference is that manual work stays manual, while the MCP saves time on every future iteration.

For my Korean learning workflow, creating flashcards manually took 2-3 hours after each lesson: transcribing vocabulary, finding pronunciation audio, formatting everything in Anki, and adding contextual notes. Building the MCP took about the same time investment, but now the entire process takes 5 minutes of conversation with Claude.

This creates a simple decision framework. If you do something manually that takes more than a few hours, and you'll need to repeat it regularly, an MCP prototype is worth the experiment. You're not risking months of development time—you're investing a single afternoon to potentially save hours every week.

The math becomes compelling quickly. Even if the MCP only works 80% of the time and requires occasional manual cleanup, you're still saving significant time while learning what automation patterns work for your specific needs.

## How I Built This: A Three-Part Process

> Here's the [link to the chat](https://claude.ai/share/994e73d0-14ca-459a-9b81-3d2581604352) where I sketched it out using the [vibeallcoding MCP](https://github.com/essencevc/vibeallcoding) as a starting point.

Building an MCP with AI assistance follows a predictable pattern:

1. Scope carefully
2. Allocate work to agents effectively
3. Iterate quickly

The most critical step is scoping—breaking down the project into small, validatable pieces that agents can handle independently.

### Planning and Scoping

Good scoping means creating 4-5 focused issues instead of one broad "implement MCP server" task. For example:

- Bootstrap project using the TypeScript MCP SDK
- Set up publishing workflow
- Create the core server structure with tool definitions
- Implement the first tool with proper error handling

Each issue should take 3-5 minutes to validate and involve roughly 300-400 lines of code. This keeps the feedback loop tight and prevents agents from going down rabbit holes. When issues are too broad, agents make assumptions that compound into larger problems.

### Work Allocation Strategy

I use the [vibe-all-coding MCP](https://github.com/essencevc/vibeallcoding) to break down projects into manageable issues. This MCP learns from past successful breakdowns using ChromaDB, improving its suggestions over time. The key insight is that AI agents excel at implementation but need clear, specific guidance on what to build.

The workflow looks like this: Claude creates issues based on examples of successful breakdowns, saves them for future reference, and then implements each piece. This creates a compound learning effect. Each project improves the breakdown quality for future projects, while building a repository of working patterns that agents can reference.

### Rapid Iteration and Testing

For manual testing, I run two versions of the MCP simultaneously—the latest published version and the local development version. I label the development one using a suffix of `dev` so it's easy to toggle between them and test new functionality immediately. This means that for me it's just `Jishik` vs `Jishik-dev`. Once I've validated a change that I like, I just push it up, publish a new release and fix it.

This quick local iteration cycle works better than complex deployment setups. When building the Korean learning MCP, I could test vocabulary generation, audio synthesis, and Anki integration in real conversations with Claude. Each iteration took minutes, not hours.

The development process became: make changes locally, test with real Korean vocabulary, identify what worked or broke, and iterate. This tight feedback loop meant I could validate each piece of functionality as I built it, preventing larger integration issues later.

## What I'd Do Differently

The biggest lesson from building this MCP is that agent workflows need better tooling and context from day one. Traditional single-agent monitoring doesn't scale when you want autonomous development with proper discovery and research phases.

### Add GitHub Integration Earlier

I would integrate the GitHub MCP immediately and force agents to do extensive discovery before writing any code. The goal is making agents research existing patterns, understand library APIs, and scope tasks based on actual code examples rather than assumptions.

This means agents would spend time reading documentation, examining similar implementations, and understanding the full context before proposing solutions. Tools like Notion and Linear become essential for consolidating the implicit knowledge we carry about our projects.

Creating dedicated test projects also accelerated development. I created one project specifically for testing the MCP in Claude Desktop and another for tracking planning improvements. This let me measure how my task scoping was improving over time and identify which breakdown patterns worked best.

### Design APIs for AI Consumption

Initially, my MCP was just a wrapper around existing APIs. This created unnecessary complexity for AI agents to navigate. I learned to reduce scope and optimize for agent usage patterns.

For the Korean learning MCP, I focused only on front and back cards since everything else could be handled with HTML. This simplified the API dramatically—smaller payloads, better error handling, and automatic file system integration for approved directories.

The principle is designing tools that agents can use effectively rather than trying to expose every possible feature. When you constrain the scope appropriately, you can add smart defaults, better validation, and context-aware behavior that makes the tools much more reliable for AI consumption.

## The Future of personal Automation

MCPs represent a shift in how we think about automation. Instead of grand plans and months of development, we can now validate ideas in an afternoon. The real power isn't in the technology—it's in lowering the barrier to experimentation so dramatically that trying becomes easier than not trying.

Start small. Pick one workflow that annoys you—something you do weekly that takes an hour or two. Build an MCP for it this weekend. Even if it only half-works, you'll learn something valuable about what automation patterns fit your actual needs. And if it does work? You just bought yourself hours of time every week.

The tools are ready. The only question is what will you automate first?
