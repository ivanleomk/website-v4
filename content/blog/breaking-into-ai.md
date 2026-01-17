---
title: How I Broke Into AI Without a Roadmap
date: 2026-01-17
description: The messy, fast-changing path that took me from front-end engineering to LLMs.
categories:
  - Reflections
  - Advice
authors:
  - ivanleomk
---

A lot of folks ask me how to break into AI—what to learn, where to start, and which roadmap to follow.

The uncomfortable truth is that there isn’t one. The space changes every month, and by the time a roadmap is written, it’s already outdated.

I didn’t plan my way into working with LLMs. I built a history of curiosity, work, and momentum by trying tools early, showing up consistently, and sharing what I learned in public. This is how I did it—and the advice I normally give.

## How I got here

Just two years ago I was still working at Credit Suisse as a front-end software engineer. I had a good amount of work-life balance and even managed to get my French to a B2 level just for fun.

My first brush with machine learning in college had been a disaster. It took me months to create a dataset of 2,000 image pairs to train a GAN that didn’t even work. I spent three hours every single night with a glass screen and a water spray to mock rainy screens.

Then a friend showed me ChatGPT and how you could use a model to edit paragraphs and generate ideas. Granted this was GPT-3.5 and it was pretty stupid, but I felt like things were going to be shaken up.

I started devouring online courses and sending links to [@karpathy](https://twitter.com/karpathy)’s courses to my friends so we could work through them together—until they threatened to block me. Things really picked up when I stumbled upon the [@latentspacepod](https://twitter.com/latentspacepod) podcast where [@swyx](https://twitter.com/swyx) mentioned an online paper club on Discord that met every week to discuss machine learning papers.

The only catch: it was at 3 AM every Wednesday for me in Singapore. But I figured I had nothing to lose and decided to set my alarm for six months and joined that 3 AM call whenever I could.

I ended up making great friends like [@vibhuuuus](https://twitter.com/vibhuuuus), [@eugeneyan](https://twitter.com/eugeneyan), [@YoungPhlo\_](https://twitter.com/YoungPhlo_), and [@FanaHOVA](https://twitter.com/FanaHOVA), and we worked through concepts I never could have figured out alone. I later ran an Asian edition for a while with [@bryanblackbee](https://twitter.com/bryanblackbee), meeting more friends like [@gabrielchua](https://twitter.com/gabrielchua) and [@aimuggle](https://twitter.com/aimuggle).

## Open source

At this point I really wanted to pivot to work with language models and a friend I spoke to told me to try working on open source software. After seeing [@jxnlco](https://twitter.com/jxnlco) speak at the [@aiDotEngineer](https://twitter.com/aiDotEngineer) summit online, I learned about Instructor.

When Jason asked for help to build out the docs for Instructor, I immediately messaged him and offered to help write articles. That cold DM kicked off a stretch of nights where I would work my banking job from 9 to 6 writing React code, then come home and keep working until midnight to try to land my first PRs.

![My first cold DM to Jason about writing for Instructor.](/jxnl.png)

Three days later, I had my first PR merged into Instructor where I manually corrected and rewrote some docs. It was pure fun—working with new friends I met on the internet and reverse-engineering the API of every foundation lab to figure out how to force them to work with Instructor.

My early pull requests were covered in comments and critiques. It was tough, but it was also the fastest I’ve ever learned. I forget the exact words, but when I was worried about posting my first few articles (especially the Chain of Density article we did a while later), Jason gave me great advice:

> While it’s scary to put your work out there for criticism, it’s better to be in the open so people can correct your mistakes faster.

After a few months of doing this, I texted Jason and asked if he wanted to hire me full time to work on Instructor and help with the consulting stuff. He agreed to hire me and I sent in my notice at my banking job a few days later.

My parents honestly thought I was crazy—quitting a stable banking job to work for a guy I had only ever spoken to on Twitter. During this period, I was fortunate enough that the library took off, and it eventually grew from 300k to 3M+ downloads during the time I was the core maintainer. Today that number is more than 5M monthly downloads, which is a strong testament to the fact that with a good and simple API that people can trust, products can go pretty far.

## AI agents

In early 2025, after attending the [@aiDotEngineer](https://twitter.com/aiDotEngineer) conference in New York, I realized something had profoundly changed. The models were getting smarter and were evolving from brains in a vat to free agents that could interact with the world.

Claude Code had just started to come out around then and was actually incredible. These models could now read files, call APIs, and work semi-reliably across long horizons.

That’s when I knew I had to go all-in. The consulting work was great, but I wanted to be on the front lines, building agents at scale.

During this whole time I had been active on Twitter, writing articles for Instructor and engaging with the community. A friend eventually connected me with a company called [@manusai](https://twitter.com/manusai) and I vibed with the CTO Pan instantly.

We both believed that models shouldn’t be constrained like humans and that there was so much more that we could squeeze out of them. I ended up chatting again with [@roxasorag](https://twitter.com/roxasorag) and Lu Lu in another interview about my experience working on open source. I was sold honestly—the vibes were immaculate—but the product at that point was already pretty good.

I joined in July, and for the next few months, I worked from 9:30 AM to midnight nearly every day. At Manus things moved fast, a principle I experienced on my first day. I was tasked with building a demonstration for triggering Manus tasks via email. By the end of the day, a functional prototype was deployed to our test environment to play around with.

I ended up building out other projects like Mail Manus, the Manus API, and our Stripe integration. When we announced our $100M ARR it felt like an amazing milestone in what was up to that point the most intense and rewarding period in my life working with [@hidecloud](https://twitter.com/hidecloud), [@peakji](https://twitter.com/peakji), and [@gr00vyfairy](https://twitter.com/gr00vyfairy).

## Advice

I was lucky to be in the right place at the right time, but I also made sure my work was visible. [@aarondfrancis](https://twitter.com/aarondfrancis) likes to talk about how luck is doing things × telling people about it, and I think it’s very true.

If you want to break into AI, you need to find a way to differentiate yourself when companies are receiving thousands of AI-generated resumes and have no idea what’s next.

Here are some things you can do:

- Get on Twitter and start finding your tribe of similar friends.
- Build in public and showcase wild demos like what [@zaidmukaddam](https://twitter.com/zaidmukaddam) did with Scira.
- Contribute to open source and build things that others want.

The truth is that you just need to follow your curiosity and see what sparks joy. After all, the real challenge now isn’t just coding, it’s about learning how to steer the model.

You should play with all of the models and any tool you can get your hands on. How is [@cursor_ai](https://twitter.com/cursor_ai) different from [@AmpCode](https://twitter.com/AmpCode)? How are the Gemini models different from the Anthropic models? Why do we even care about function calling?

The Chinese philosopher Wang Yangming spoke of the “unity of knowledge and action”—only the man who has been mauled by a tiger can truly understand what it means.

By building a demonstrated history of work, you create stickiness. You send out a signal to people interested in the same weird things, and you make incredible friends.

If you don’t have a local community, then build it. The hacker events I wanted didn’t exist in Singapore, so with [@agrimsingh](https://twitter.com/agrimsingh), [@SherryYanJiang](https://twitter.com/SherryYanJiang), [@gabrielchua](https://twitter.com/gabrielchua), [@unprofeshme](https://twitter.com/unprofeshme), and [@aimuggle](https://twitter.com/aimuggle) we created a little collective called [65Labs](https://www.65labs.org/) ([@65labslah](https://twitter.com/65labslah)).

Since then we’ve organized the largest Cursor Hackathon in the world (we even landed in the local news for it), another one with [@GoogleDeepMind](https://twitter.com/GoogleDeepMind) just yesterday which had almost 700 signups, and ran local coworking events with [@posthog](https://twitter.com/posthog) and [@Zaltsman](https://twitter.com/Zaltsman) supporting us. We even appeared in the Straits Times.

![The Cursor Hackathon organizers featured in The Straits Times.](/st.png)

I’m just an API boy who got here by being curious and consistent. And if I can do it, so can you.
