---
title: "You're probably using LLMs wrongly"
date: 2024-11-28
description: Get 10x the results with LLMs in 3 simple steps
categories:
  - LLMs
authors:
  - ivanleomk
---

# You're probably using LLMs wrongly

In this post, I'll share three simple strategies that have transformed how I work with language models.

1. Treat working with language models as an iterative process where you improve the quality of your outputs over time.
2. Collect good examples that you can use as references for future prompts.
3. Regularly review your prompts and examples to understand what works and what doesn't.

Most complaints I hear about language models are about hallucinations or bad outputs. These aren't issues with the technology itself. It's usually because we're not using these models the right way. Think about the last time you hired someone new. You didn't expect them to nail everything perfectly on day one.

The same principle applies to language models.

## It's an Iterative Process

Most of the tasks we do daily have unwritten rules about what makes them good or bad. Whether it's writing emails, coding, or creating documentation, we carry these implicit standards in our heads. We often can't explain these rules clearly, but we know when something doesn't feel right. Working with language models forces us to make these hidden rules explicit.

When I first started using Claude for writing, I would take entire project documents and throw them at the model, repeatedly prompting it to improve various aspects. This approach was inefficient and inconsistent. I found myself asking for the same improvements over and over, essentially starting from scratch each time.

The breakthrough came when I started maintaining a Claude project where I could:

1. Store examples of my preferred writing style
2. Keep track of prompts that worked well
3. Iteratively refine these prompts based on results

This systematic approach dramatically improved the quality of generated content. Instead of getting maybe 20% of the way there on the first try, I was consistently hitting 60-70% of my target quality in just the first couple of messages.

The key wasn't just better prompts – it was having a reliable reference point for what "good" looks like.

Each time you review a model's output, you're discovering and documenting these unconscious standards. You'll start asking questions like:

1. What bothers you about that email draft?
2. Why does that code snippet feel off?
3. What did I like about the last email it generated?

These reactions help you build better prompts. Through this process, you're not just getting better outputs - you're systematically uncovering your own evaluation criteria. This makes each new interaction more precise and effective.

## Collect Good Examples

Every time you get output from a language model, take a moment to analyze what works and what doesn't. This critical evaluation helps you build a collection of high-quality examples over time. If we keep collecting the best outputs from our model, then these become the new baseline for future examples that the model sees.

This approach has been particularly valuable in my coding work. When exploring new libraries or implementations, I use o1-mini as a collaborative partner. I'll share my code and thoughts about potential approaches, and the model helps scaffold different possibilities. The real value isn't just in the code it generates – it's in how it helps identify issues or alternatives I hadn't considered.

For example, during data analysis projects, I treat the model as a second pair of eyes when reviewing Jupyter notebooks. While it's not perfect, it consistently helps spot patterns, suggest optimizations, or identify potential issues that might take hours or days to discover otherwise. Even when some suggestions aren't relevant, having them surfaced lets me make conscious decisions about what to pursue or dismiss.

This helps us to refine and show the model what exceptional outputs look like over time and raises the average quality of everything you generate. And when we have these good examples, pulling them into something like Cursor becomes invaluable because we can show the model what we like.

This is essentially what we call a positive feedback loop.

The better our examples get, the better our outputs become. The better the outputs, the stronger our example collection grows.

For tasks where quality really matters, this systematic collection of good examples is invaluable. Each new generation builds on the successes of previous ones, leading to consistently better results.

## Regularly Review

Your idea of what makes something "good" will evolve over time. What you thought was great writing last month might not meet your standards today. When I first started working with language models for my writing, I discovered criteria I hadn't even considered. Some articles that I initially thought were good had issues I hadn't noticed before.

This is where having a structured approach to maintaining prompts and examples becomes crucial. Instead of reinventing the wheel each time, you can refine your existing prompts and examples based on new insights. It's like maintaining a living style guide that evolves with your understanding.

Regular review isn't just about checking old examples - it's about refining your understanding of quality. Each piece of feedback you get, whether criticism or praise, helps you develop sharper evaluation criteria.

This process reveals blind spots in your own work. You might discover that your writing could be more concise, or that your code could be better structured. These insights improve everything you create.

## Conclusion

Working effectively with language models isn't about finding the perfect prompt or having advanced technical knowledge. It's about adopting a systematic approach focused on continuous improvement.

By treating LLM interactions as an iterative process, building a library of strong examples, and regularly reviewing your work, you'll see dramatic improvements in output quality. These practices help bridge the gap between what you want and what the model delivers.

As much as vibe checks are a meme, the only way we get better at working with language models is through practice. Vibe checks are just our initial gut feelings that we haven't systematized yet. The key is turning those gut feelings into concrete examples and criteria that you can use consistently.
