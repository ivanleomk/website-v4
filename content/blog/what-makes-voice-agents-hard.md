---
title: Why are voice agents hard to build?
date: 2025-04-20
description: Three key things making it tough to build reliable voice agents
categories:
  - Voice
  - LLM
  - Deployment
authors:
  - ivanleomk
---

Voice interfaces feel inevitable: they promise hands‑free, universally accessible computing that matches the cadence of ordinary conversation. Yet building production‑grade voice agents remains stubbornly difficult.

This comes in the form of three specific constraints that make building these interfaces challenging

1. The strict 500ms response window to keep responses feeling natural that creates fundamental UX limitations
2. Complex end-to-end latency optimization challenges across the entire processing pipeline
3. The lack of established UX patterns for different conversational contexts

## The Unforgiving 500ms Response Window

Current voice UX patterns assume a one-to-one relationship between users and agents, creating severe technical constraints that don't exist with text-based interfaces.

Human conversation has a natural rhythm - we expect responses within approximately 500ms. Any longer, and the interaction feels awkward and unnatural. This creates a fundamental limitation that shapes everything about voice agent design.

That expectation shapes every downstream design choice:

1. Time‑to‑first‑token (TTFT) matters more than total latency. A snappy “Sure—looking that up now…” can buy another second of computation.
2. Users subconsciously predict turn endings; if the agent overlaps or hesitates, the conversation derails.
3. Tasks that require multi‑step retrieval or reasoning must hide—or parallelize—them.

The result is a difficult tradeoff between capability and responsiveness that doesn't exist with text interfaces. Voice agents must either limit their functionality or find creative ways to manage user expectations during longer operations.

It's important to start working and building these agents such that we stream partial speech synthesis as soon as the ASR hypothesis stabilises (typically ~120 ms).

Follow with progressive disclosure—short acknowledgements first, fuller answers once ready.

## The End-to-End Latency Challenge

Optimizing the complete latency pipeline presents enormous technical hurdles when working within a 500ms constraint.

Consider a typical voice agent pipeline:

1. Speech recognition (100-200ms)
2. Intent classification (50-100ms)
3. Context processing (50-100ms)
4. Knowledge retrieval if needed (300-1000ms)
5. Response generation (100-500ms)
6. Text-to-speech synthesis (50-200ms)

The math simply doesn't work - these operations often total well over a second, making truly responsive voice agents extraordinarily difficult to build with current technology.

This explains why infrastructure companies like LiveKit have raised significant funding - they're tackling the fundamental technical challenges of making this pipeline viable. Without solving these core infrastructure challenges, voice agents will continue to feel unnaturally slow or functionally limited compared to their text-based counterparts.

## Undefined UX Patterns for Different Contexts

Perhaps the most underappreciated challenge in voice agent development is the lack of established UX patterns for different interaction contexts.

Text interfaces have evolved clear patterns over decades, but voice interaction design remains in its infancy. Consider these unresolved questions:

- When should agents allow interruptions? Educational contexts benefit from interruptions ("What's an orchid?"), while transactional flows like banking often shouldn't be interrupted.

- How should agents handle background operations? Unlike text interfaces where multiple operations can happen visibly, voice agents must maintain conversation while processing.

- How do we signal different interaction modes? Text interfaces use visual cues that don't exist in voice-only interactions.

- When should agents proactively ask questions versus waiting for user direction?

These UX questions lack standardized solutions, forcing each implementation to solve them independently. The result is inconsistent experiences across voice applications and frustrated users who can't develop transferable mental models.

## Moving Forward: The Next Generation of Voice Interaction

Despite these challenges, the potential of voice agents remains enormous. The most promising approaches involve rethinking fundamental assumptions:

1. **Decoupling interaction from processing**: "Let me check that for you. While I'm looking, what else can I help with?" This creates natural conversation while allowing background operations.

2. **Context-specific interaction patterns**: Educational agents might encourage interruptions while transactional ones maintain flow.

3. **Proactive assistance models**: Rather than just responding to queries, voice agents can work in the background and proactively offer help when ready.

As these patterns mature, voice agents will become increasingly capable of natural, helpful interactions that work within human conversational expectations while still leveraging the power of AI systems.

Companies building in this space face significant challenges, but the rewards for solving these problems will be substantial as voice becomes an increasingly important interface for AI interaction.
