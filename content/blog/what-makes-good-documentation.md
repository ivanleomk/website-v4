---
title: What Makes Good Documentation
date: 2024-12-02
description: Lessons learnt from writing 40k lines of documentation of instructor
categories:
  - Advice
  - Documentation
authors:
  - ivanleomk
---

# What Makes Good Documentation

Over the past year, we've grown instructor's documentation to over 60,000 lines of content. This means for every line of code in our library, we've written 5 lines of documentation. Through this process, I've realized that great documentation isn't just about explaining features - it's about demonstrating value.

Alex Hormozi's value equation provides a perfect framework for thinking about documentation:

![Value Equation](./images/hormozi.png)

The equation tells us that value increases when we maximize the dream outcome and likelihood of achievement while minimizing time delay and effort required. Good documentation needs to optimize this equation through three key principles:

1. **Show Immediate Value** - Minimize the "Time Delay" and "Effort" factors by showing developers they can get started in minutes
2. **Focus on Problems** - Increase "Likelihood of Achievement" by demonstrating clear solutions to specific challenges
3. **Easy to Adapt** - Paint the "Dream Outcome" while providing support options to reduce risk and time investment

Let's break these down into greater detail.

## Showing Immediate Value

The fastest way to lose developers is to make them wade through theory before seeing results. Users don't care about your product at all at the start, they just want to know if it's worth their time to learn. After all, with every developer product, there's really two questions that you're asking yourself:

1. Is it worth my time to learn?
2. How much time will it take me to learn?

These two questions are what we want to tackle when we write documentation. Let me show you what I mean with Instructor's getting started example:

```python
import instructor
from pydantic import BaseModel
from openai import OpenAI

# Define your desired output structure
class User(BaseModel):
    name: str
    age: int

# Patch the OpenAI client
client = instructor.from_openai(OpenAI())

# Extract structured data from natural language
user_info = client.chat.completions.create(
    model="gpt-4o-mini",
    response_model=User,
    messages=[{"role": "user", "content": "John Doe is 30 years old."}],
)
```

In just 20 lines, a developer can see exactly what we do: define a structure, wrap a client, get validated data. No theory, no complex setup - just immediate results. I think you should aim for this as much as possible when writing your documentation.

Assume that your user has some level of technical ability, and make sure they can get everything set up within 10 minutes at most.

## Focusing on Problems

In the case of instructor, most people find us when they search for problems like "How do we extract tables from images" or "structured outputs from openai". This means that our documentation needs to focus on these specific problems.

1. Address common user problems directly
2. Show solutions in the first paragraph
3. Provide working examples that can be copied immediately

I'd argue that showing solutions quickly is incredibly important. Users have short attention spans and if they have to wade through 20 paragraphs of fluffy writing before they get to the solution, they'll just leave. So, make sure that your documentation is focused on the user's problems and show them the solution in the first paragraph when you're giving an example.

We've been working on doing a better job for this with instructor. We had a `concepts` section that explained key ideas around how instructor works that users could use to find specific solutions for their problems:

- `multimodal`: How do you use instructor with images and audio with examples
- `validation`: How do you use Pydantic to express validation logic
- `retrying`: How do you use the default retry logic and scale up to something like tenacity to measure custom retries

This was well received and recently we launched a new `integrations` section that shows how to use instructor with every single provider that we support after seeing a lot of questions about how to use instructor with different providers. But the key idea here is the same, have a simple example that shows you how to get started, then work towards more complex scenarios that are just a few scrolls down.

## Easy to Adapt

The final ingredient is making your documentation adaptable to different user needs. Think of it like Create React App - with a single command, developers can scaffold an entire React application in minutes. Good documentation should follow the same principle: make it dead simple to start, then provide clear paths for growth.

Once you've done the first two steps, you've demonstrated the value of the library and shown users that the time needed to learn the tricks is worth it. Now it's time to show them the dream outcome - or different ways to use the library.

It's very important here that examples should be simple enough for users to copy and adapt easily - but show them a glimpse of what is to come. I've been using instructor for over a year and I'm still discovering new things about how to use it. Now imagine someone discovering structured outputs for the first time and realising that it solves all of their problems and unlocks new doors.

They might think it's just an easier way to get JSON output but really it's a way of converting LLM calls into validated objects that you can also hook business logic into. You can be creative like adding a markdown table parser to extract data from a table so you know it's valid tabular data or even use gemini to generate structured metadata from podcasts and videos. Your job here is to show them the dream and make them want to use your library.

### Providing Support

The key is to provide clear next steps at every stage of the journey. When users hit common challenges, they should immediately know where to get help - whether that's joining a Discord community for open source users, scheduling a call for enterprise support, or finding examples for specific use cases.

This support system becomes a feedback loop for better documentation. As users share their challenges and use cases, you learn how to better document solutions to real-world problems. The documentation grows organically to cover the ways people actually use your tool, not just how you imagined they would use it.

By making your documentation adaptable, you're not just helping users solve today's problems - you're helping them discover new possibilities they hadn't even considered.

## Conclusion

Good documentation isn't about covering every feature - it's about helping users succeed quickly by optimizing every part of the value equation:

Spending time so that your documentation can:

1. Show immediate value through easy examples (minimize time and effort)
2. Clearly show users how to solve common problems (increase likelihood of success)
3. Demonstrate and inspire users how to use your library for more complex scenarios (paint the dream outcome)

Remember: if users can't see the value in 5 minutes, they'll move on to something else. Make those first 5 minutes count. Documentation is a marathon, not a sprint.
