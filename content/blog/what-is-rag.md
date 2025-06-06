---
title: Is RAG dead?
date: 2024-11-24
description: RAG isn't dead, it just got more complicated
categories:
  - RAG
authors:
  - ivanleomk
---

## What is RAG?

RAG is a fancy way of stuffing additional information into the prompt of a language model. By giving the model more information, we can get more contextual responses that are contextually relevant to what we need. But don't language models already have access to all of the world's information?

Imagine you're starting a new job. Would you rather:

1.  Have access to all of Wikipedia and hope the information you need is somewhere in there
2.  Have your company's specific documentation, procedures, and guidelines

<!-- more -->

Most of us would choose the second choice in a heartbeat, right?

This is exactly why RAG (Retrieval Augmented Generation) isn't just alive – it's more important than ever. But before we dive in, let's break down what RAG actually is in simple terms.

### Why did we need RAG?

Originally language models had a very limited context window. A context window is just the raw number of tokens that the model can see at once. If our model could only process 4 documents at once, then we'd try to find the most relevant 4 documents to include.

But that was much harder than it sounded, and for a while, we were stuck with this weird hybrid where people just used embeddings for everything.

With new models like Gemini coming out, we can feed the **entire harry potter series 10 times into the prompt** and still have additional tokens to use. This means that instead of having to pick and choose which documents to include, we could include all of the documents that we have access to.

So with that in mind, most people are asking, why bother with RAG? We don't need it anymore, right?

Well, not so fast.

## Beyond Simple Embedding Search

Many organizations today are still stuck in what we might call "naive RAG" - they're using basic embedding search and hoping it's enough.

Here's why that's problematic: embedding search essentially converts text into numbers, hoping these numbers somehow capture the meaning of your content. While this works as a starting point, it's far from ideal.

To make matters worse, these embedding models are trained on general internet data, not your specific use case. Think about it - if you're a healthcare provider, your understanding of terms like "patient care" or "treatment plan" is vastly different from how these terms are used in general web content.

The embeddings might find similar text, but they won't necessarily understand your specific context and requirements.

## The Importance of Metadata and Search Infrastructure

Let's look at a concrete example. Imagine you're building a system to handle customer queries about their orders. A customer asks: "What's the status of my order from last week?"

With simple embedding search, you might find similar text about orders and statuses. In a worst case scenario, you might start pulling in orders information from other customers or information that's outside of the time frame the user's looking for.

What we really need in this case is going to be

1. A metadata filter to only look at orders from the past week
2. A search index that can quickly find orders by date
3. Business logic to verify if this customer is authorized to view this order

Without these systems in place, your model is probably going to hallucinate, no matter how sophisticated your language model is. GPT3000 can't help you if you keep giving it the wrong information.

To give another example, if a user is asking questions about updates to a project or when a document was last updated, if your underlying data just doesn't track that bit of information, then no amount of context window expansion is going to help you.

## The Future of RAG

The evolution of RAG isn't just about handling more context - it's about building smarter, more specialized systems. This means:

1. Fine-tuning embedding models on your specific domain data when you have enough examples to make it meaningful
2. Building robust metadata systems that capture the information your users actually need
3. Creating specialized indexes based on common query patterns
4. Developing business logic layers that understand your specific requirements

Think of modern RAG as less of a technology and more of a system design philosophy.

It's about understanding your users' needs, analyzing your data infrastructure, and building systems that can effectively bridge the gap between what users ask and what information you have.

## Conclusion

The future of RAG isn't about throwing more data at larger models - it's about building intelligent systems that understand your specific use case. Whether you're dealing with customer service, technical documentation, or business analytics, success depends on thoughtfully designing systems that capture and retrieve the right information in the right way.

As language models continue to evolve, the differentiator won't be how much information you can feed them - it will be how well you understand and implement the specific information retrieval needs of your users. That's the true essence of modern RAG, and that's why it's more relevant than ever.
