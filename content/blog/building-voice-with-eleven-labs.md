---
title: Building Voice Agents with ElevenLabs Conversational AI
date: 2025-04-22
description: Lessons from building a voice-based chatbot for customer service training
categories:
  - Voice
  - LLM
  - Deployment
authors:
  - ivanleomk
---

# Building Voice Applications with ElevenLabs Agents

Voice-based AI applications represent the next frontier in customer service training, offering a more natural and effective alternative to traditional methods. They create consistent, risk-free practice environments where trainees can master complex interactions before facing real customers.

To build great user experiences with these voice agents, there are three critical design principles to keep in mind

- Thoughtful Context Design: Creating authentic scenarios using real-world data like actual menus and service protocols
- Strategic Randomization: Implementing controlled variability that builds adaptability rather than rote responses
- Skill-Targeted Scenarios: Focusing on specific competencies rather than general conversation abilities

This article unpacks the practical lessons learned while building a voice-based training solution with ElevenLabs's new conversational AI that enables flight attendants to perfect premium cabin service interactions—without risking passenger satisfaction or airline reputation during the learning process.

## Thoughtful Context Design

Unlike text interfaces, voice applications demand authentic context to create meaningful interactions. My flight attendant training simulator succeeded largely because it was grounded in real-world data and scenarios.

The goal is to think carefully about what customers would actually need or request in real-world situations. For business class service, this means considering:

- **Menu details**: Including 3-4 different wines, 4 different main courses, appetizers, entrees, and snacks
- **Dietary information**: Common allergens, ingredient details, and alternative options
- **Customization requests**: Such as vegetarian meals not pre-ordered or special preparations
- **Common inquiries**: "Is this dish spicy?", "Does this contain nuts?", "Can my family get something different?"

This grounding in reality creates authentic interaction contexts that matter more than technical sophistication. Trainees reported that the scenarios felt genuinely similar to their daily passenger interactions precisely because the prompts incorporated these real-world elements.

To implement effective context design:

1. **Map the actual customer journey**: Identify the specific problems flight attendants face in real service situations
2. **Incorporate authentic reference materials**: Use real airline menus, service protocols, and flight schedules
3. **Design flexible prompt structures**: Allow for customization based on the specific training goal for the day

This thoughtful context design enables trainees to practice responding to authentic scenarios rather than generic conversations, preparing them for the true complexity of premium cabin service.

## Strategic Randomization

Voice applications become far more effective when they introduce controlled variability. This creates diverse scenarios that build adaptability rather than rote responses.

### Dynamic Persona Generation

Large language models, when prompted repeatedly with the same input, tend to generate similar outputs - for example, asking for a joke repeatedly might yield the same 5-10 jokes. To overcome this limitation, I injected strategic sources of entropy that made sense for the training context.

Using faker.js, I generated random passenger profiles with realistic variations:

```javascript
Name: ${faker.person.fullName()}
Job Title: ${faker.person.jobTitle()}
Age: ${faker.number.int({ min: 25, max: 60 })}
Purpose: ${Math.random() > 0.5 ? "Business" : "Leisure"}
Last Visited Country: ${faker.location.country()}
Flights per year: ${faker.number.int({ min: 1, max: 10 })}
```

This provided the AI with different contextual elements to condition its responses on. Importantly, the user interface allowed trainees to modify these attributes, creating a collaborative process for designing practice scenarios that mapped to real customer types they wanted to prepare for.

### Varied Conversation Starters

The second form of randomization came through dynamically selected first messages. I created an array of potential opening lines that a passenger might use:

```javascript
const potentialFirstMessages = [
  "Hi there, when is the meal service going to start?",
  "Excuse me, I'm wondering about the meal service timing",
  "I have some dietary restrictions. Could you tell me which meal options are vegetarian?",
  "I'd love to try the Pork Cheek Au Jus. Is that available on this flight?",
  "I'm interested in trying some of your signature cocktails. What do you offer?",
  "Could I get an extra pillow and blanket for the flight?",
  // Many more variations...
];
```

By randomly selecting from these options and injecting them as the first message, I forced the agent to respond as a passenger with varying needs and requests. This approach expanded the range of conversations trainees would encounter, preventing them from developing scripted responses to predictable scenarios.

The key insight is finding the right balance of randomization for your specific use case - enough variation to build adaptability, but constrained within realistic parameters that align with the actual challenges users will face in their roles.

### Applied Randomization in Production

This strategic randomization approach extends beyond training scenarios to production applications as well. For example, when building a voice bot for a restaurant or gym:

1. Analyze common requests: Study what actual customers typically ask for when they call
2. Craft targeted first messages: Rather than generic greetings like "How's your day?" or irrelevant information, design contextually appropriate starters
3. Guide the conversation flow: For an order-taking bot, consider something like: "Thanks for calling our restaurant! We have a great promotion today on General Tso's chicken with a new side. Would you be interested in that, or can I help you with something else?"

By carefully managing the context and deliberately directing the conversation flow, you can build much richer experiences not just for voice agents but for chatbots and any interactive application. The goal isn't complete randomness but rather thoughtful variation within appropriate boundaries that move interactions in productive directions.

## Skill-Targeted Scenarios

The most effective voice applications focus on developing specific competencies rather than general conversation abilities. This approach requires understanding the actual skills users need to master in their real-world context.

### Identifying Core Competencies

For flight attendants training for business class service, the key competencies include:

- **Offering appropriate recommendations** from menu options
- **Handling difficult interactions** with professionalism
- **Using proper language and phrasing** ("Good evening Mr. Tan, is there anything I can help you with today?" rather than casual speech)
- **Delivering service with the expected formality** ("It's my pleasure, sir")

By analyzing the specific skills that define success in a role, you can design targeted scenarios that build these competencies rather than generic conversational ability.

### Designing for Skill Development

This means creating different system prompts or scenarios that focus on particular skill areas:

- Scenarios for practicing menu recommendations
- Scenarios for de-escalating passenger complaints
- Scenarios that test knowledge of service procedures

These can be generated randomly or hard-coded based on the training needs, but each should target a specific competency rather than general conversation.

### Refining Through Production Data

After deploying to production, you can further refine these targeted scenarios by:

- **Topic modeling** to identify clusters of common interactions
- **Categorizing conversations** into general request types
- **Identifying pain points** where users struggle most

This data-driven approach allows you to build specialized paths or competencies for your voice agents. For example, if location questions dominate customer inquiries ("Are you near Baker Street?"), you can create dedicated modules that excel at handling geographical information.

The key insight is that voice agents should not aim for general conversational ability, but rather master the specific competencies that matter most in their application context. This targeted approach delivers more effective training outcomes and creates more useful production applications.

## Conclusion

The success of voice applications depends far more on thoughtful interaction design than on technical implementation. By focusing on authentic context, strategic randomization, and targeted skill development, I created an effective flight attendant training simulator that delivers genuine value.

ElevenLabs dramatically simplifies the technical implementation, allowing developers to focus on what matters most: creating voice experiences that feel natural, responsive, and valuable to users. The platform's constraints actually encourage more thoughtful design choices, focusing energy on creating meaningful content rather than wrestling with technical implementation.

For applications like training simulations, customer service practice, or voice interfaces requiring quick deployment, success depends on thoughtful design that considers the specific skills being developed, the context needed for authentic experiences, and the strategic introduction of variability to build adaptability.

The most valuable insight from this project is that voice agents aren't a panacea - they're a tool that requires deliberate planning and user empathy to create truly effective experiences. With careful context design, strategic randomization, and skill-targeted scenarios, voice applications can create powerful, immersive learning experiences that translate directly to real-world skills.
