---
title: Why you're missing out on not building with streaming UIs in mind
date: 2025-03-25
description: Key considerations when building UIs that rely on streaming LLM content
categories:
  - UI/UX
  - LLMs
authors:
  - ivanleomk
---

# Use streaming UIs and customers are willing to wait 5x longer

If you're not building your application with streaming in mind, you're making two major mistakes

1. You're going to have to spend months refactoring your code to adapt to streaming once you make this decision
2. You're missing out on a major opportunity to improve the user experience.

I've built a fair bit of user interaces that rely on streaming content with tools like the [`ai-sdk` by `vercel`](https://sdk.vercel.ai/docs/introduction) and I've found that there are three main considerations to think about when building out your application.

In this article we'll cover

1. Why streaming becomes increasingly important
2. You need to think carefully about the type of streaming content you're relying on - whether you can use intermediate states, require a complete object or are trying to chain together a series of streaming LLM calls.
3. Some practical techniques for smooth animations and layouts

Here's a great example of how streaming can help make a UI seem much more responsive that I coded up over the weekend.

![](https://r2-workers.ivanleomk9297.workers.dev/generative_ui.mp4)

## Why care about streaming?

As we move towards more complex LLM applications, response times are increasing significantly. This is especially true as we start using reasoning models more heavily that will spend a long time spinning on their wheels to reason through different approaches. This means that users will start to deal with longer waiting periods before seeing a response to their question.

By implementing proper streaming, we can transform a frustrating waiting period into an interactive experience. By seeing immediate feedback, we provide a responsive feedback and make a long operation feel more engaging. By starting with streaming interfaces from the get-go, we can help avoid a world of pain when we have to migrate back and implement support for intermediate states and other intricacies around streaming.

## What Type Of Streaming Content are you using?

In general, I tend to find that there are three kinds of streaming UIs that I've seen out in the wild. These are

1. Formatted responses where we have some sort of chatbot response streamed in as markdown
2. Dependent API Calls where we might want to chain different LLM api calls together - Eg. we get cheaper LLMs to pre-process some information or query then get a reasoning LLM to generate a final response
3. Iterable Objects - Where we might want to stream out UI content based on specific fields or objects that need to be completely generated before we can take downstream action

Let's take a look at each of them.

### 1. Formatted Responses

The simplest form of streaming is when we display markdown or formatted text directly to users. However, getting consistent formatting requires careful consideration of both prompting and rendering.

For reliable formatting:

```typescript
const { completion } = useCompletion({
  api: "/api/stream/content",
  system: `Always structure your response with:
  1. A main title using # 
  2. Clear paragraph breaks with blank lines
  3. Consistent header hierarchy`,
});

// Use React Markdown for consistent rendering
return (
  <ReactMarkdown
    components={{
      // Custom components for better formatting control
      h1: ({ children }) => (
        <h1 className="text-2xl font-bold mb-4">{children}</h1>
      ),
      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
    }}
  >
    {completion}
  </ReactMarkdown>
);
```

Note that with something like React Markdown we can also provide the model with the ability to generate custom components using simple markdown and IDs with features such as XML tags which are incredibly useful.

I implemented an example [here](https://github.com/ivanleomk/xml-experiments) that shows how to implement this with react markdown for custom components to display chain of thought and citations using XML tags such as `<citations>` and `<thinking>`.

![](https://r2-workers.ivanleomk9297.workers.dev/citations.mp4)

You can enhance the user experience during generation by adding interstitial states:

```typescript
function StreamingResponse({ completion, isLoading }) {
  return (
    <div>
      {completion}
      {isLoading && !completion && (
        <div className="text-gray-500 italic">
          {getRandomThinkingMessage()} // "Pondering...", "Analyzing..."
        </div>
      )}
    </div>
  );
}
```

### 2. Chained API Calls

For more complex applications, we often need to chain multiple LLM calls together. This might involve using cheaper models for initial processing before engaging more expensive models for final reasoning.

```typescript
const { completion, isLoading } = useCompletion({
  api: "/api/initial-analysis",
  onFinish: (result) => {
    // Chain to more expensive model for deeper analysis
    completeWithExpensiveModel({
      context: result.completion,
    });
  },
});
```

### 3. Processing Iterable Objects

The most complex case involves streaming UI components that depend on specific fields being complete. Models stream fields in different orders - OpenAI follows schema order while Gemini uses alphabetical order (unless configured otherwise).

Here's how to handle this with a content carousel:

```typescript
const ContentCarousel = ({ items, isLoading }) => {
  // Don't render until we have enough items
  if (!items || (isLoading && items.length <= 1)) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="carousel">
      {items.map((item, index) => {
        // Check required fields based on streaming order
        // OpenAI streams in schema order, so if title exists
        // we know previous fields are complete
        if (!item?.title) {
          return null;
        }

        return (
          <div className="w-full h-[400px]" key={index}>
            {/* Only render image once title/description ready */}
            {item.title && item.description && (
              <img
                src={`/api/images/${item.banner_slug}`}
                className="w-full h-full object-cover"
              />
            )}
            <ContentDetails item={item} />
          </div>
        );
      })}
    </div>
  );
};
```

## Practical tips

To prevent layout shifts, establish clear dimensions early:

```typescript
function StreamingCard({ content }) {
  return (
    <div
      className="min-h-[200px] w-full transition-all duration-300"
      style={{
        // Set fixed initial dimensions
        height: content ? "auto" : "200px",
        maxHeight: "600px",
      }}
    >
      {/* Content placeholder while streaming */}
      {!content && (
        <div className="animate-pulse bg-gray-200 h-full w-full rounded" />
      )}
      {content}
    </div>
  );
}
```

This is something that I often see people not doing and it makes the UIs a bit jarring. I often forget too so this is a small reminder to myself too.

## Conclusion

In conclusion, streaming UIs are no longer just a nice-to-have feature but a critical component of modern LLM-powered applications. By designing with streaming in mind from the start, developers can avoid painful refactoring later while dramatically improving user experience through immediate feedback and responsive interfaces.

Whether you're working with formatted markdown responses, chained API calls, or complex iterable objects, implementing proper dimension constraints, thoughtful loading states, and careful field handling will ensure your UI feels polished and responsive even when processing complex LLM operations.

If you're experimenting or building UIs like this, would love to chat!
