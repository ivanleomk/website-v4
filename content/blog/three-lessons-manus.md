---
title: Three Lessons I've Learned at Manus
date: 2025-12-22
description: Lessons learnt from going from zero to $100M ARR in 8 months
categories:
  - Reflections
  - Advice
authors:
  - ivanleomk
---

I joined Manus on July 27th. Just under five months later, on December 17th, we announced that we had crossed [$100M in ARR](https://manus.im/blog/manus-100m-arr) in 8 months after launch — the fastest startup to ever reach that milestone.

Making this work has been intense. I've been in the office five days a week, often from 10 AM to midnight. And I've shipped more in this period than any other time in my life"

- [Mail Manus](https://manus.im/features/mail)
- File Suggestions
- [The Manus API](https://open.manus.ai/docs) to use Manus programatically
- [A new Stripe integration for websites](https://manus.im/blog/manus-stripe)
- Forking [Kura](https://github.com/567-labs/kura) for my own use to analyse customer support tickets internally
- [A talk at the AI Engineer summit in New York](https://www.linkedin.com/posts/manus-im_ran-a-manus-ai-workshop-at-the-ai-engineer-activity-7398144407205683200-QcN7/) showcasing how you could ship working products on the API

and a few more internal projects that I can't talk about

## What is Manus?

Manus is a general-purpose AI agent. You give it a task—research a topic, build a website, analyze a dataset, automate a workflow—and it figures out how to get it done across multiple steps, tools and domains without needing you to micromanage.

At Manus, a feature has to be 屌 (diào)—fucking sick or it doesn't ship. Any model with a basic harness can build a landing page. We're chasing the tasks that make you go "holy shit." High ceiling, complicated, the kind of thing that seems like it shouldn't work until it does.

## What I've Learnt

When things move that fast, you learn a few things. Here are three lessons that I've learnt over the last few months.

1. Your Responsibility Doesn't End When You Ship
2. Prototypes over Plans
3. Don't Pigeonhole Yourself

### Your Responsibility doesn't end when you ship

It's tempting to think your job is done once the feature is live. Code works, tests pass, PR merged—time to move on. But that's only half the job.

When I shipped Mail Manus, I didn't just push code and walk away. I filmed a [demo video](https://www.youtube.com/watch?v=VU28Afcnm7U) showing the feature in action. I followed up with marketing to make sure the documentation was updated. I answered questions on Twitter when users ran into issues.

When I was taked with building out a Stripe integration for Manus, I ran transactions with my actual credit card—not just test mode—to verify the production flow worked end to end when manus built a website with our integration.

![Stripe Integration](/stripe-integration.webp)

But the less obvious part of ownership is internal. I sat with people from GTM and marketing to understand where they got confused. I watched them try to use the product.

As the developer, you know the system inside out—but someone in another department just wants to use a small piece of what you built. Their confusion tells you where the product actually breaks. These details only surface when you create space for people to share what's not working—when you actively seek out feedback from frontend engineers, designers, and teammates in other departments.

Your responsibility extends from the first commit to the last user who touches the feature. The code is just the beginning.

### Prototypes over Plans

On my first day—a Friday—I was asked to build a demo for triggering Manus via email. My first instinct was to hack it together with a script. My boss, 潘潘, pushed back: if it's not real, what's the point?

So by the end of that Friday, the demo was actually live. You could email an address and watch a task get triggered. It wasn't feature-complete. But people could use it and that really got everyone excited for this feature.

And that really set the tone for everything that followed. By putting a working prototype in the dev environment as soon as possible, no matter how rough it is, lets people say "yes, we should invest in this" or "actually, I want it to do something different." That feedback is worth more than any document.

The same "ship it and see" approach shaped file suggestions. The first version worked, but the UX was painful: upload a file, wait for confirmation, then watch it process in a sequential loop. Seven seconds of staring at a spinner. It felt broken.

![File Upload](/file-uploads.gif)

So I spent a few days reworking the entire flow to make it feel instant. We also used the feature for discovery: when you uploaded slides, videos, or websites, the model would surface specific suggestions based on the content type. The result felt snappy, and users liked it.

This is especially true when you're working with language models. Models have base tendencies—they prefer certain frameworks, certain patterns, certain ways of writing code. You only discover these by testing prompts and watching what the model produces. What is the model prone to doing? Where does it struggle?

Sometimes you find the model can't get the code exactly where you need it. So you package help—a specific dependency, a function it can call, a particular structure. But there's a fine line.

Too much scaffolding constrains what the model can do. Too little and it flails. Finding that balance is a huge part of AI engineering, and you can only find it by building prototypes fast and iterating quickly.

### Don't Pidgeonhole Yourself

About a week after file suggestions launched, we released an API for customers who wanted to automate their manus workflows.

It was rough — you could start a task but couldn't use any of the connectors you'd provisioned. I found bugs in attachment handling and connection logic, submitted fixes over the weekend, and without quite realizing it, became the main developer on the project.

I was maintaining changes to our internal agent framework while also writing production Go for the first time. I learned Go on the job—not from a course, but from immersion. I'd read through PRs to understand how the codebase worked. I'd use AI models to help me parse unfamiliar patterns. I'd try to rebuild things myself just to see if I understood them. And I asked a lot of stupid questions—questions that probably had obvious answers, but asking them got me unstuck faster than pretending I knew what I was doing.

Getting productive in a new language comes down to a few things: read the code before you try to write it, seek feedback constantly, and be wrong fast. A small PR that gets corrected teaches you more than a big PR you agonized over in isolation.

And ask good questions. Not "I don't know how to do this," but "I'm trying to build X, I noticed we usually do Y in the codebase, should I follow that pattern here?" That framing lets someone with totally different context answer you immediately.

The broader point is this: your job title might be "AI engineer," but your actual job is to achieve the desired effect. Sometimes that means learning how to write better frontend code so that Manus can build better websites. Sometimes it means picking up a new language. Sometimes it means building your own tools — I brought Kura, a clustering library I'd built before joining, and it became essential for understanding failure modes across our 17+ locales.

There are no real boundaries to your responsibilities. You see a problem, you solve it. You see an opportunity, you take it. That's how it works at a company moving this fast.

## Join us!

Working at Manus has been the most competitive, demanding, fulfilling experience of my career. The hours are long. But you ship constantly. You own what you build. You push the limits of what's possible with models that are genuinely capable.

The range of what you touch here is absurd and every night when I go home, I'm excited for what the next day holds.

If any of this sounds like what you're interested, [we're hiring](https://manus.im/careers).

Come join us :)
