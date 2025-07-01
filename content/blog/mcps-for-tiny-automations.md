---
title: MCPs for Tiny Automations
date: 2025-07-07
description: If you're not working with MCPs, you're missing out on a powerful tool for rapid prototyping and automation.
categories:
  - MCP
  - Agents
authors:
  - ivanleomk
---

# Building MCPs for Tiny Automations

Model Context Protocol (MCP) servers represent a fundamental shift in how we build personal automation. Instead of creating entire applications, you can prototype and extend functionality in hours, not weeks. My experience building an [Anki MCP for Korean learning](https://github.com/ivanleomk/Jishik) demonstrates this potential: what used to take 3 hours of manual flashcard creation after each lesson now takes 5 minutes of AI-assisted automation.

## Two Key Insights About MCPs

### MCPs as Rapid Prototyping Tools

MCPs excel as simple ways to extend core functionality and prototype new features. The traditional development cycle of planning, building, deploying, and iterating gets compressed into rapid experimentation cycles. You can test integration ideas, validate workflows, and refine functionality without the overhead of full application development.

The Korean learning MCP exemplifies this. Rather than building a complete language learning platform, I created a bridge between existing tools: Claude for content generation, ElevenLabs for pronunciation, and Anki for spaced repetition. This approach leverages each tool's strengths while adding the specific automation I needed.

### Universal Integration Layer

If you're building any chat application or AI workflow, MCP integration comes out of the box with major providers. This should be something you actively seek rather than an afterthought. MCPs provide a standardized way to expose functionality that any MCP-compatible client can consume.

This universality means you can build once and integrate everywhere. A well-designed MCP works with Claude Desktop, custom applications, or any system that supports the protocol. You're not locked into a specific platform or framework.

## The Development Reality: 90% AI-Generated Code

The Jishik (Korean learning) MCP is roughly 80-90% AI-generated code. This isn't a limitation—it's a feature. The real work involves finding the right context, understanding library APIs, and providing specific functionality requirements for the model to implement.

My actual time investment was 2-3 hours of monitoring a coding agent while learning how the YankiConnect library works. The AI handled the boilerplate, error handling, and API integration patterns. I focused on architecture decisions and workflow design.

This development pattern reveals something important about modern software building: the bottleneck isn't writing code, it's understanding requirements and system boundaries. MCPs optimize for this reality.

## From Hours to Minutes: The Korean Learning Case Study

Learning Korean highlighted a specific automation opportunity. After each lesson, I'd spend 2-3 hours creating flashcards:

1. Transcribe new vocabulary and phrases
2. Find or create pronunciation audio
3. Format everything correctly in Anki
4. Add contextual notes and tags

The MCP collapses this into a 5-minute conversation with Claude:

```typescript
// Core handler that orchestrates the entire workflow
export const addBasicCardHandler = async ({
  front,
  back,
  deckName,
  media,
  tags,
}) => {
  const client = new YankiConnect();

  // Store media files first
  const storedMedia: string[] = [];
  if (media?.length > 0) {
    for (const mediaPath of media) {
      const filename = mediaPath.split("/").pop() || mediaPath;
      const fileBuffer = await fs.readFile(mediaPath);
      const base64Data = fileBuffer.toString("base64");

      await client.media.storeMediaFile({
        filename,
        data: base64Data,
      });
      storedMedia.push(filename);
    }
  }

  // Create note with embedded media references
  const noteData = {
    note: {
      deckName,
      modelName: "Basic",
      fields: { Front: front, Back: back },
      tags: tags || [],
    },
  };

  return await client.note.addNote(noteData);
};
```

Now I simply tell Claude: "Create flashcards for today's lesson" and provide the vocabulary list. Claude generates appropriate cards, ElevenLabs synthesizes pronunciation audio, and everything appears in Anki ready for study.

## The 5-Hour Weekly Investment Strategy

This experience suggests a broader strategy: invest 5 hours per week building tiny automations. Each small tool compounds with others, creating increasingly powerful personal systems.

Current automations in development:

**Call Transcription Pipeline**: Automatically convert meeting recordings into study material and flashcards

**Project Planning Assistant**: The [vibe-all-coding MCP](https://github.com/essencevc/vibeallcoding) that breaks down coding projects into manageable issues with ChromaDB learning from past successful breakdowns

**Email Automation**: Context-aware response generation based on sender patterns and conversation history

The pattern is consistent: identify repetitive tasks, build minimal automation, iterate based on usage.

## Current Limitations and Workarounds

MCPs aren't perfect. Current pain points include:

**No Audio Preview**: I can't preview generated pronunciation before adding cards. The workaround is generating audio files first, manually reviewing them, then proceeding with card creation.

**Manual Media Management**: Images still require downloading to a local folder and referencing individual files. This is faster than pure manual work but not seamless.

**Authentication Complexity**: Managing credentials across multiple services creates friction, especially for team or shared automations.

**Resource Sharing**: MCPs run as separate processes, making it difficult to share context or resources between different automation tools.

Despite these limitations, the time savings are dramatic. What took 3 hours now takes 5 minutes of setup plus minimal manual cleanup.

## Why MCPs Matter for Personal Systems

Traditional automation required building entire applications. You needed authentication systems, databases, user interfaces, and deployment infrastructure. This overhead killed most personal automation projects before they started.

MCPs flip this model. They're lightweight service processes that expose specific functionality to any compatible client. The model decides whether to use available tools based on context and user intent.

This architecture enables emergent behavior. As you build more MCPs, they create a personal ecosystem of capabilities that compound in unexpected ways. The language learning MCP might integrate with the project planning MCP to help learn technical vocabulary for coding projects.

## The Broader Vision

MCPs represent a new category of personal computing. Instead of monolithic applications, we're moving toward composable tool ecosystems. Each MCP does one thing well, and AI orchestrates them based on context and goals.

Imagine logical groupings of tools around different life areas:

**Learning Stack**: Language MCPs, note-taking integration, spaced repetition systems
**Productivity Stack**: Task planning, email automation, calendar integration  
**Development Stack**: Code generation, issue tracking, deployment automation

The power comes from composition. These tools work together in ways their individual creators never anticipated, mediated by AI that understands your specific context and goals.

## Getting Started

Building your first MCP takes a weekend, not months. Start with a single annoying task in your daily workflow. Build the smallest possible automation that eliminates that specific friction.

The key insight is that personal automation doesn't need to be perfect or comprehensive. It needs to save time on tasks you do repeatedly. MCPs make this accessible to anyone willing to spend a few hours experimenting with AI-assisted development.

The future of personal productivity isn't one application that does everything. It's many small tools that each excel at specific tasks, orchestrated by AI that learns your patterns and preferences. MCPs make this future available today.
