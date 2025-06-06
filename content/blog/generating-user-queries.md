---
title: Why User Intent matters the most for Synthetic Data
date: 2024-11-29
description: The easiest thing you can do today to improve your synthetic data quality
categories:
  - Synthetic Data
  - Evals
authors:
  - ivanleomk
---

# Why User Intent matters the most for Synthetic Data

## Introduction

I've generated millions of tokens worth of synthetic data over the last few weeks, and I've learned something surprising: everyone talks about using different personas or complex question structures when creating synthetic data, but they're missing what really matters.

The most important thing is actually understanding why users are asking their questions in the first place - their intent.

Let's explore this concept using [Peek](https://peek.money), an AI personal finance bot, as our case study.

By examining how synthetic data generation evolves from basic documentation-based approaches to intent-driven synthesis, we'll see why focusing on user intent produces more valuable training data.

I've scraped their FAQ into a markdown document ahead of time and used it to generate some synthetic queries.

??? note "Download Peek's FAQ"

    Here is a FAQ that I generated for Peek based off their actual FAQ

    ```markdown
    ## What is Peek?

    Peek is an AI-powered personal finance platform to help you track, manage and grow your net worth.

    ## Security & Privacy

    ### Is my financial data secure with Peek?

    Your financial data is encrypted at-rest and in-transit. This means that your data is protected from unauthorized access. Even if the database files were to be stolen, the thieves wouldn't be able to decrypt the contents without the decryption keys. In addition, the decryption keys are secured by Amazon Web Service's Key Management Service, which makes use of industry standard hardware security modules.

    Data transfers between your browser and our servers are also encrypted with secured HTTPS connections, so your data will still be secured even if it was intercepted by a hacker.

    ### Does Peek.money sell or share my data with other financial institutions?

    No, we do not sell or share your data to other financial institutions. That is simply not our business model.

    ### Can Peek.money access my bank or brokerage accounts directly?

    No, Peek.money does not have direct access to your bank or brokerage accounts.

    ### Can I request to delete my data from Peek?

    Yes, you can request to delete your data from Peek.money at any time. Simply contact our customer support team at support@peek.money, and we will guide you through the process of permanently deleting your account and all associated data.

    ### Does Peek use my data internally?

    With your consent and opt-in, we use your data to provide anonymised benchmarking data and insights. Other than that, we do not use your data in respect of your privacy.

    ### What happens to my data if Peek.money is acquired or goes out of business?

    In the event that Peek.money is acquired or goes out of business, we will ensure that your data is protected and treated in accordance with our privacy policy. We will notify you of any changes to our business and provide you with the opportunity to delete your data if desired.

    ## Service & Features

    ### Is Peek providing financial advice?

    No, we are not. Think of Peek as your personal financial analyst. As such, it can analyse your data and give you new perspectives but it won't be able to buy or employ specific strategies.

    ### How many assets do you support?

    We support more than 70,000 assets across banks, exchanges, cryptocurrencies, and more in different markets.

    ### I can't find the asset that I am holding. What should I do?

    Please email us at support@peek.money and we'll figure out how best to support such assets.

    ### How often is my portfolio data updated?

    Portfolio data is updated daily for most assets. Cryptocurrency values are updated in near real-time, while traditional investment vehicles and bank accounts are typically updated at the end of each trading day.

    ### Can I track multiple currencies?

    Yes, Peek supports multiple currencies and automatically converts all values to your preferred base currency for consolidated reporting. Exchange rates are updated daily.

    ### Is there a mobile app available?

    Yes, Peek is available on both iOS and Android devices. You can download the app from the App Store or Google Play Store and access your portfolio on the go.

    ### What types of analytics and insights does Peek provide?

    Peek offers various analytical tools including:

    - Portfolio performance tracking and benchmarking
    - Asset allocation analysis
    - Risk assessment
    - Expense tracking and categorization
    - Net worth trending over time
    - Custom goal setting and tracking

    ### What is the subscription cost?

    Peek offers different subscription tiers to suit various needs. Please visit our pricing page at peek.money/pricing for current subscription options and features included in each tier.

    ### Can I export my data?

    Yes, you can export your portfolio data, transaction history, and analysis reports in various formats including CSV, PDF, and Excel files.

    ### How do I get started?

    Getting started with Peek is simple. Create an account at peek.money, verify your email, and begin adding your assets. We provide step-by-step guidance to help you set up your portfolio effectively.

    ### What kind of customer support do you offer?

    We offer customer support through multiple channels:

    - Email support at support@peek.money
    - In-app chat support during business hours
    - Comprehensive help center with guides and tutorials
    - Community forum for peer discussions and tips
    ```

## The Evolution of Synthetic Data Generation

### Level 1: Documentation-Based Generation

Most teams start with their product documentation, using it to generate questions they think users might ask. Here's a basic implementation:

```python
async def generate_synthetic_questions(context, num_questions=10, model="gpt-4o-mini"):
    class SyntheticQuestion(BaseModel):
        chain_of_thought: str
        question: str
        answer: str

    client = instructor.from_openai(openai.AsyncOpenAI())
    async def generate_question():
        return await client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": "Generate a hypothetical question based off the following context {{ context }}"
            }],
            context={"context": context},
            response_model=SyntheticQuestion,
            model=model,
        )
```

Using Peek's FAQ as input, this approach generates questions like:

- "What rights do I have regarding the deletion of my data?"
- "What measures does Peek take to ensure my financial data remains secure?"
- "What happens if the company undergoes significant operational changes?"

While these questions are technically valid, they're almost one-to-one mappings from the documentation. They don't reflect how users naturally interact with a financial application.

If all we needed was to answer documentation-based questions, a simple search system using BM25 or embeddings would suffice.

### Level 2: Adding Personas and Context

The next evolution introduces personas and contextual variations:

```python
personas = [
    "A student looking to improve their finances",
    "A working adult managing finances for the first time",
    "A retiree looking to maximize retirement income",
    "A working adult saving for their first home",
]
```

This approach produces more specific questions like:

- "As a student using Peek to track my expenses and savings, how secure is my financial data?"
- "As a working adult, is my financial data safe with Peek while I save for my first home?"

We see more variation in tone and context, and the questions become more personalized. However, this approach still doesn't fully capture why users come to the application in the first place.

### Level 3: Intent-Based Generation

> Since I don't know that much about how people actually use Peek I just asked O1 to [generate potential user intents in this chat](https://chatgpt.com/share/67492038-3770-8011-bd5d-d916161bf3b7). It's been a very helpful tool for me for brainstorming, highly recommend!

The real breakthrough comes from focusing on user intents. When we examine how people actually use a personal finance application like Peek, we see questions like:

- "Is there a guide on how to use the asset allocation feature?"
- "Can you help me find all my expenses over $200 for the past month?"
- "How can I adjust my savings plan to retire five years earlier without sacrificing my current lifestyle?"

These questions reflect specific user intents:

- Learning to use platform features
- Understanding spending trends
- Planning for major life changes

By thinking carefully about how users are going to interact with our product, we can randomly sample from these intents or even combine different intents together to generate more complex queries.

This allows us to stress test different aspects of our application's capabilities in a way that simple personas cannot.

```python
intents = {
    "Feature Discovery": {
        "description": "Users learning platform features",
        "examples": ["How do I use the asset allocation tool?"]
    },
    "Investment Analysis": {
        "description": "Users analyzing portfolio composition",
        "examples": ["Show me my investment diversity"]
    },
    "Life Planning": {
        "description": "Users planning major financial changes",
        "examples": ["How can I retire 5 years earlier?"]
    }
}
```

The key is mapping these intents to the actual capabilities of an application like peek for instance

- Transaction Retrieval Functions
- Portfolio Analysis Tools
- Financial Planning calculators

While you can use any framework of your choice, using instructor we can convert these intents to Pydantic objects that have executable methods. This abstracts away the complexity of orchestrating different tools and separates the planning of the response from the execution.

```python
class FinancialQuery(BaseModel):
    intent: str
    query: str

    def execute(self):
            return self.fetch_feature_documentation()
```

### Level 4: Grounding in Real User Data

While understanding user intent helps generate better synthetic data, there's no substitute for real user interactions. The most effective approach is to regularly sample actual user queries and evaluate how your system performs.

This helps you identify new patterns in how users phrase questions, areas where your system struggles, and whether your synthetic data still reflects reality. By grounding your synthetic data in real usage patterns, you ensure your testing remains relevant to what users actually care about.

The goal isn't to have perfect synthetic data, but rather to have synthetic data that helps you build and test the capabilities your users actually need

## Conclusion

While personas and query variations are useful tools, the key to generating valuable synthetic data lies in understanding user intent. By focusing on why users interact with your application and mapping those intents to specific capabilities, you can create synthetic data that truly helps improve your application's performance.

Remember: synthetic data is just a tool. The goal isn't to generate massive volumes of queries, but to create focused test cases that verify your application can understand and respond to real user needs effectively.
