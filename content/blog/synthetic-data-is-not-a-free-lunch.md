---
title: Synthetic Data is no Free Lunch
date: 2024-11-23
description: "Hard-earned lessons from generating millions of synthetic data points and why validation matters more than volume"
categories:
  - LLMs
  - Synthetic Data
authors:
  - ivanleomk
---

I spent some time playing with a new framework called Dria recently that uses LLMs to generate synthetic data. I couldn't get it to work but I did spend some time digging through their source code, and I thought I'd share some of my thoughts on the topic.

Over the past few weeks, I've generated a few million tokens of synthetic data for some projects. I'm still figuring out the best way to do it but I think it's definitely taught me that it's no free lunch. You do need to spend some time thinking about how to generate the data that you want.

## The Premise

### An example

When I first started generating synthetic data for question-answering systems, I thought it would be straightforward - all I had to do was to ask a language model to generate a few thousand questions that a user might ask.

<!-- more -->

The questions I got back were technically correct but felt artificial:

- "How do I initiate the account reset procedure?"
- "What is the timeline for processing refund requests?"
- "Could you explain the steps for merging multiple accounts?"

but real user questions are more messy and varied. Users have a large variation in terms of phrasing, general english ability, spelling and intent. They're not always clear and concise.

If they were, they honestly wouldn't need a chatbot or your help in the first place. I'd imagine that most of them would be something like:

- "wtf my face ID stopped working???"
- "tried resetting pw 4 times already not working help"
- "sent item back 2 weeks ago store confirmed receipt where's my $$$"

### Pitfalls of Simple Generation

My bro-science explanation for this is that LLMs tend to generate a certain distribution of outputs, even with prompt variations. Ultimately they're trained on messy and often badly formatted data so they need to be able to map these large variations to their internal representations.

For instance, most of the time I mistype every single word in my prompts to language models when I chat with them - this is especially true as I've switched over to use transcription more often to save on typing. There's at least 5-10% of the time where I'll say a short phrase that's transcribed wrongly and the model still gets my underlying intent very very well.

This means that even with prompt variations, you'll still get formally structured questions that don't capture the diversity of real user behavior if these variations aren't going to impact the model's interpretation of what you're asking for.

This is especially true if you're varying stuff that just doesn't matter - like a random number inside the prompt.

### Classic Domains

There are a few areas where synthetic data is used a lot and for good reason - for instance code generation. When you're generating code, you have clear validation criteria - does it compile? Does it pass the test cases? Are there linting issues? And I think that makes it slightly easier to work with synthetic data, especially if we want to augment our training sets with low resource coding languages.

## Dria's Approach

But when it comes to more open ended domains like query generation, it's a lot more difficult to validate. I did find some parts of Dria's codebase that I liked and so I thought I'd share some of them here. These were the use of

1. Varying Personas to guide the style and tone of the generated data
2. Multi-Hop reasoning questions to generate more diverse question types

### Varying Personas

This isn't a very new idea and often times this is the easiest way to introduce variations initially. A lot of people tend to use personas as a way to guide the style and tone of the generated data.

Take this [article](https://www.answer.ai/posts/2024-10-15-how-to-synthesize-data.html) by Nathan Cooper for instance where he used different personas as a way to augment a training dataset. What was interesting wasn't the personas here but the use of a second model to grade the generated outputs.

Here's an excerpt of an equivalent prompt with Dria:

> Your task is to generate a creative and coherent backstory based on the provided persona traits and simulation description.
>
> Input:
>
> - A set of persona traits that define key characteristics of the character.
> - A detailed description of the simulation outlining the context and environment.
>
> Responsibilities:
>
> - Carefully read and understand the provided persona traits and simulation description.
> - Create a detailed backstory that incorporates all given persona traits naturally...

They also try to add some variation ahead of time with another step before this

> Your task is to analyze the provided setting and identify the relevant random variables required to generate a diverse and representative backstories, that feels like real life, with a strong emphasis on capturing dependencies between variables.

### Multi-Hop Reasoning

They also try to use some multi-hop reasoning to guide more diverse outputs.

> Given these documents:
>
> Document 1: "Dunkirk is a 2017 historical war thriller film written, directed, and produced by Christopher Nolan."
>
> Document 2: "Interstellar is a 2014 epic science fiction film directed by Christopher Nolan."
>
> Document 3: "Kip Thorne, an American theoretical physicist, consulted on the science fiction film 'Interstellar'."
>
> <answer>Dunkirk</answer>
>
> <1hop>What is the title of the war film directed by Christopher Nolan?</1hop>
>
> <2hop>What is the title of the war film directed by the director of Interstellar?</2hop>
>
> <3hop>What is the title of the war film directed by the filmmaker who worked with physicist Kip Thorne on a science fiction movie?</3hop>

Ultimately, this is a simple way to generate more diverse and complex questions that are challenging for a model to answer without factoring in specific knowledge about the domain.

## My Process

Often times, what I've found has helped for me was to actually think very carefully about the process that I want the model to go through. And even so, I often find that I need to go back and refine these questions multiple times. My process tends to follow something around this process:

1. Start Small and Curate: Generating small batches of data and manually reviewing them to get a good sense of what the model is capable of.
2. Generating more: Once I'm happy with the quality of the data, I'll scale up the number of questions I ask the model to generate.
3. Refining: As I start to get more questions, I'll find that some types of questions are a lot more common than others. I'll go back and refine the prompts to generate more of the questions that I want.
4. Redo everything - send over for review and realise I've missed something obvious.

But more often than not this is a iterative process which takes some time to nail. Ideally if you're using this for a production system, you must iterate and blend in user queries at some point.

This ensures that the synthetic data doesn't get too far away from what you want and you're still sampling from the same distribution as your user queries to some degree.

## Limitations and Considerations

One area however that I'm a bit skeptical of for synthetic data is low-resource languages. While it might seem like an easy solution, I believe you often need more curation and real-world input. For example, if you're trying to generate data for a low-resource language, you might be better off paying a small group of native speakers to spend a few hours generating content. While this might seem more expensive upfront, you'll get:

- Authentic local expressions and slang
- Natural language variations
- Cultural context and nuances
- Real-world usage patterns

This human-generated content, though smaller in volume, often provides more value than a larger synthetic dataset that might miss these crucial elements. That's what Singapore did for singlish - which is a variation of english that's unique to Singapore which combines chinese grammatical structures with english along with slang from other languages like malay and tamil.

[There's a new 6 hour audio and text dataset avaliable if you're interested in this space.](https://huggingface.co/datasets/mesolitica/IMDA-STT)

## Conclusion

Synthetic data isn't magic - it's a tool that requires careful thought and systematic validation. Success comes from building robust generation pipelines that incorporate business logic and real-world constraints, not just generating large volumes of data.

The goal isn't to generate perfect data, but to create useful data that helps improve your systems in meaningful ways. I personally like to think about it like a fuzzer of sorts.

Whether you're using frameworks like Dria or building your own pipeline, the key is to think carefully about how to introduce meaningful variation while maintaining quality and relevance to your use case.
