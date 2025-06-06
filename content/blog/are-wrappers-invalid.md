---
title: Is there value in a wrapper
date: 2024-12-14
description: Why infrastructure, user experience, and data create lasting competitive advantages in AI applications
categories:
  - AI Engineering
  - LLMs
authors:
  - ivanleomk
---

# Is there any value in a wrapper?

I'm writing this as I take a train from Kaohsiung to Taipei, contemplating a question that frequently surfaces in AI discussions: Could anyone clone an LLM application if they had access to all its prompts?

In this article, I'll challenge this perspective by examining how the true value of LLM applications extends far beyond just a simple set of prompts.

We'll explore three critical areas that create sustainable competitive advantages

1. Robust infrastructure
2. Thoughtful user experience design
3. Compounding value of user-generated data.

<!-- more -->

Every successful software product has been a "wrapper" around lower-level components. Facebook wraps web technologies, Google wraps web crawling, and ultimately everything wraps silicon - interestingly, French silicon from Fontainebleau is particularly prized for its quality.

The value lies not in the base components but in how we build upon them. As they like to say, a wagon is more than the sum of its parts.

## Building Reliable Infrastructure

The most basic form of value that a good LLM application has is the infrastructure that we have around it.

On the simplest level, it's just purely about how to deal with user traffic. Often times when your application goes viral, your rate limits do not follow. Teams need to plan for sudden bursts of requests without compromising their latency. This means implementing efficient load balancing and queing systems that can act as contigency systems when things go wrong.

For enterprise use cases, there's additional complexity in managing role permissions and access controls when serving different user groups with varying requirements.

At the same time, because your application now depends heavily on model providers to work, there's an additional need to work around issues such as detecting and dealing with sudden outages, having the infrastructure/tooling in place to migrate from deprecated modes and experiment with newwer models.

Lastly, there's the added need to start thinking about logging and collecting user data to improve your application. This could be in the form of selected citations, model tool calls and even user satisfaction data.

These infrastructure components often represent the majority of an application's codebase and the design decisions behind an application.

While prompts might be the visible surface, the engineering underneath ensures reliable, scalable service delivery.

## Creating Valuable User Experiences

When it comes to user experience, successful AI applications excel in two distinct ways:

1. As components in larger workflows
2. As standalone products solving specific problems

Let's look at how this works by looking at some of the UX of Circleback, Talkio and GPTForWork

### Building Workflow Components

Circleback is a note-taking software which provides an easy integration. Users sign up for an account and the circleback meeting bot joins meeting calls to record what was said.

Users then recieve a summary of the meeting as an email along with clear actionables for each party involved in the meeting. But what makes Circleback useful is that it offers a webhook integration.

![](./images/circleback.webp)

With their webhooks, we can build out simple automations that can be built into whole workflows. We can imagine that users could pipe these meeting notes/transcripts into a structured format that can be inserted into a CRM which the rest of the company can use to prioritize/store information on deal flow.

### Crafting Product Experiences

Now that we've seen how providing a simple primitive ( in the form of a webhook ) can help, let's see some good examples of user experiences on a product level by taking a look at Granola, GPTForWork and Talkio.

#### Granola

Similar to Circleback, Granola is a piece of software for users that helpers users take better meeting notes. Users have the app open during a meeting and it records the system audio.

Throughout the meeting, users type out messy notes and these get transformed into neat structured summaries using the meeting transcript.

![](./images/granola.png)

What makes Granola particularly effective is its template system. Users can customize how their meeting notes are structured and formatted:

![](./images/granola_template_edits.png)

The app itself ships with a few predefined templates which users can use. If they want to customise them to their specific use cases, they provide a simple drag and drop editor which allows them to customise the defined structure and format.

This is great for two main reasons

1. Users can get started immediately, all they need to do is setup the app and their first meeting summary is generated relatively quickly
2. When their use cases start to get a bit more specific in terms of formatting or content, users have the ability to fork existing templates or create new ones from scratch.

At $10/month for unlimited meetings they've made the product relatively cheap and customisable for different use cases.

My one gripe with them is that they don't have any in built support for adding additional context at the moment whether it's by referencing previous meetings or pulling in websites/pdfs that should be considered.

#### GPTForWork

GPTForWork is a great example of meeting users where they're at by integrating directly into Microsoft Office Tools and Google docs/sheets.

![](./images/gpt_for_work.png)

This is great because it significantly reduces the initial learning curve that users need to bridge in order to get started. All they need to do is to install an extension and they can start using the different tools that the extension provides. These include things such as classifiers, using prompts to rewrite stuff in bulk and more.

The genius here is the ease at which users can get started.

#### Talkio

Talkio, an AI language learning application, shows how thoughtful UX can enhance learning:

![](./images/talkio.png)

They provide automatic translation options and suggested responses, making it easier for users to maintain conversations in their target language. These features not only help users learn but also generate valuable training data through user interactions.

## The Power of User Data

The most overlooked advantage of well-designed LLM applications is their ability to generate valuable training data through user interactions. When your UX is well-designed, every user interaction provides signals about what works and what doesn't.

Consider how applications can gather weak but valuable signals: When users interact with generated citations or select from suggested responses, they're indicating what content is most relevant. These interactions create ranking data that helps improve future recommendations.

Over time, this user data helps identify system weaknesses and enables teams to build private evaluation datasets. These datasets become crucial when evaluating new models or features, providing real-world validation that synthetic data can't match.

Take Peek, a finance chatbot, as an example. Their advantage isn't just in answering financial questions - it's in the wealth of user data they accumulate. They have access to brokerage data, conversation histories about financial goals, and detailed patterns of user concerns. This data enables them to provide increasingly personalized and relevant recommendations.

If someone were to just take their prompts and generate the same suggestions, it just wouldn't be as good.

## Building Lasting Advantages

As language models continue to improve and become more accessible, the key differentiators won't be the models themselves but rather:

1. The infrastructure teams build to serve them reliably and efficiently.
2. The experiences they create that integrate seamlessly into user workflows.
3. The data they collect that enables continuous improvement.

Facebook wasn't valuable because it used HTML, and Google wasn't valuable because it indexed web pages. They created value through the experiences they built and the network effects they generated. The same principles apply to AI applications - the prompts might be replicable, but the ecosystem of value created around them is not.

Long-term success in AI applications comes from thoughtfully building systems that create compounding value through infrastructure, experience, and data. The model is ultimately just a means to an end - it's how we extend and build upon these capabilities that creates lasting value.
