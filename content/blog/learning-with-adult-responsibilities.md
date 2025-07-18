---
title: "Learning with Adult Responsibilities"
date: 2024-01-20
description: "Lessons from trying to teach myself about AI over the past 6 months"
categories:
  - Advice
authors:
  - ivanleomk
---

## Introduction

Over the past 6 months, I've been trying to learn more about AI and LLMs. ChatGPT had me hooked when I tried it for the first time. Over the course of this period, I've been chatting to more people, shitposting on twitter and working to learn as much as I can in my spare time.

That amounts to roughly 10-20 hours a week since I don't have much of a social life which has been about 4-500 hours in total since the time I started exploring this space so take my experience with a grain of salt. I'm relatively new and you're probably 2-3 months behind me at most, much less if you do it full time.

I've had some people reach out to me for advice on what to do and I figured I'd write a longer blog post so that I could refer to it myself and consolidate some of my ramblings.

## Lessons

If I could summarize everything, I would say I had around 3 key takeaways on what I might do differently.

1. Show your work much earlier than you might want to
2. Start top down and learn when you need to
3. Read papers, even if you don't understand everything

### Show Your Work

I started blogging almost a year ago with my first article - new website who dis. I wanted to showcase that I could code and build nice websites and so I bought the domain `ivanleo.com` and got to work, publishing around 1 article every 2-3 weeks.

I was inspired by the [Coding Handbook](https://learninpublic.org/) which promoted this idea of learning in public. Before then, I had been coding for around 2 years and had mostly worked on full stack projects professionally but I had nothing much to show for it.

I didn't really have much to lose so I bought the course and boop the rest is history. I started tweeting every now and then about what I had done but I didn't really figure out how twitter worked until perhaps 6 months into it.

Now, what do I mean by showing your work. It's about thinking about projects in terms of short 1-2 week sprints with a tangible product to showcase. Here's an example - building a todo app for a portfolio

1. Approach 1 : I need to have a complete final finished product with authentication, user permissions and a nice animation

2. Approach 2 : My goal is to make sure I can interact with a database. I'll start by looking at some providers, finding one with a free tier and showing how I've built it. I'll tweet a bit about my thought process, what I experimented with and how **others can learn from my mistakes**. The last part is important since that's what people click into your tweets for.

That's been the biggest shift for me over the past 2-3 months, thinking about work in terms of intermediate outputs and tweets/articles as a demonstration of your thought process. Your ability to churn out prototypes/examples will improve significantly over time and so the things you can show will definitely improve with more progress.

For better ideas, examples and suggestions for twitter, I like Jason Liu's article - [The Anatomy Of A Tweet](https://jxnl.github.io/blog/writing/2024/01/11/anatomy-of-a-tweet/) which gives much better advice.

In short, show your work to demonstrate your abilities but also to attract/find others who like the same things you do. I've had friend who implemented their own SFT process with custom synthetic data and tokenizer with self-instruct who said ... it was too boring for people to see.

You'd be suprised honestly at what you get.

### Start Top Down

A lot of people I know want to do machine learning and their first step is to pull together a complex plan that spans 8 months where they'll do Gilbert Strang's Linear Algebra Course, then do maybe Karpathy's Zero To Hero course before embarking on 3 full college courses.

That's a great idea but the problem is that the runway is too long. If you've got a full time job, it's very easy to not be able to find the time to finish these. And if you leave too much of a gap between them, then you just lose the momentum to continue. That's my experience at least.

So, for those self-taught guys like me, I think it's always better to start top-down.

For instance, you want to build with LLMs, don't start by learning the entirety of pytorch, then building attention blocks before focusing on how to optimize batch size. That's... really difficult. Instead, find a problem you'd like to solve or a demo you want to fix and start there, picking up what you can along the way. So you might recognise that

1. I can feed text into a GPT model and get back text
2. Different models give me different outputs -> learn about how training data or architecture choices here differ between models and therefore models perform differently
3. I want a reliable model -> Biased here but start exploring instructor for structured outputs from OpenAI
4. I'm getting rate limited -> How can I transfer some of the load to an OSS model or other providers or consider smaller models for specific tasks

With each step of the project or the demo, you learn something new and by applying it, you gain a better knowledge of the challenges and difficulties associated with the problem. That's real knowledge, emboddied in your experience or as my favourite philosoper Wang Yangming likes to say, the unity of knowledge and action ( 知行合一 for those who want the original text ).

I'm not saying that you shouldn't do courses, just that you should try to work with simpler goals first and abstract away the complexities at the start. Once you've figured out the whole pipeline, then worry about the plumbing.

### Read Papers

A lot of people might have a contrarian take to this but I think most LLM papers are quite readable after you've done a few. Sure the math might be difficult and concepts tough, I don't understand the math 100% all of the time but it helps you to get a sense of two things - what is interesting in the space and what have people tried.

People writing papers spend months of their lives testing these ideas under strict conditions to publish them. You can reap the fruits of their labor with just 2 hours in the afternoon or less.

For me, it was joining the [Paper Club](https://lu.ma/llm-paper-club) led by [Eugene Yan](https://twitter.com/eugeneyan) that got me started with reading papers. I'd been trying to do it on my own and always struggled but having someone more experienced and a group to discuss these with helped a lot.

Did I have to wake up at 3am every thursday morning for 4 months just to do so? Yeah , but it was totally worth it and if I had to do it again I'd do so in a heartbeat.

Last year I estimate I read around 10-15 papers and I hope to double that amount this year, maybe more if I manage my time well. Another good aspect of papers is that they show you how certain things came to be and unique ideas people tried and failed.

If you're in an Asian timezone, I started a small [paper club](https://lu.ma/llm-paper-asia). I'm no expert but I've always wanted one in my time zone so I can do more papers. If you're intersted, do join us in the future! It's meant to be very beginner friendly.

Ultimately, it all boils down to finding a group of peers that can support your interests.

## Conclusion

With that, that's the end of my short rant and advice that I give to most people. Machine Learning is hard and I think it's not going to get easier with the explosion of ideas, models and research in 2024. I wish that I had read an article like this when I was just getting started back then and I hope it helps you on your journey.
