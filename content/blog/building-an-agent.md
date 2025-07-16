---
title: "Building An Agent"
date: 2025-07-16
description: "Implementing a coding agent in around 200 lines of Javascript code"
categories:
  - Agents
  - Applied AI
authors:
  - ivanleomk
---

> Here's a link to the [original article](https://ampcode.com/how-to-build-an-agent) which implements it in Go. The full source code can be found [here](https://github.com/ivanleomk/building-an-agent)

After reading Thorsten Ball's breakdown of building a code-editing agent in Go, I implemented the same concept in TypeScript to see how the core ideas translate. Agents are just LLMs with the right tools in a conversation loop.

In around 200 lines of TypeScript, we build a fully functional agent that can read, list, and edit files by giving Claude three simple tools with clear descriptions and letting it naturally combine them to solve complex tasks.

The barrier to entry is remarkably low: 30 minutes and you have an AI that can understand your codebase and make edits just by talking to it. This is the first article in a series of articles where we'll implement the more complex parts of an agent which has features such as agentic search, subagents, todos and more.

## What You'll Need

Let's build this step by step, following the same approach that Thorsten did but in Typescript. Let's start by creating our project

```bash
mkdir agent
cd agent
bun init -y
```

Make sure that you've got an Anthropic API Key set as `ANTHROPIC_API_KEY` environment variable and then install the Anthropic SDK along, the `chalk` library for nicely printed logs and zod for defining our tools.

```bash
bun add @anthropic-ai/sdk zod chalk tree-cli
```

Now that we have everything installed, let's start coding our agent out.

## Coding Our Agent

We'll code our agent in a file called `agent.ts` and build it in 3 steps.

1. First, we'll show how we can capture user input in a terminal application and get a response from Claude

2. Second, we'll define our first tool and see how Claude uses it to read files

3. Then we'll expand our tool sets so that claude can create files, list files in a directory and edit files.

### Capturing User Input

Let's start by first scaffolding out an easy way to capture user input. For that we have the `readlines` module that we can use. We'll be using `chalk` here so we get pretty colors with our console.

```ts
import readline from "readline";
import chalk from "chalk";

const getUserInput = (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.green("You: "), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const run = async () => {
  console.log(chalk.cyanBright("Welcome to Amie!"));
  while (true) {
    const userInput = await getUserInput();
    console.log("User input:", userInput);
    if (userInput === "q" || userInput === "quit") {
      break;
    }
  }

  console.log("Exiting...");
};

run();
```

This is a simple way to capture user input in a terminal application. If you run it with the command below, you'll get a simple terminal application that'll greet you and then wait for you to type something. You can type anything you want and it'll print it out. If you type "q" or "quit" it'll exit the application.

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent> bun agent.ts
Welcome to Amie!
You: My name is Ivan
User input: My name is Ivan
You: quit
User input: quit
Exiting...
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent>
```

Now let's see how we can hook up Anthropic's sonnet-4 model to our agent.

```ts
import { Anthropic } from "@anthropic-ai/sdk";
const client = new Anthropic();

const run = async () => {
  console.log(chalk.cyanBright("Welcome to Amie!"));

  // Define a new array to store past messages
  const conversations: Anthropic.MessageParam[] = [];
  while (true) {
    const userInput = await getUserInput();
    if (userInput === "q" || userInput === "quit") {
      break;
    }
    conversations.push({ role: "user", content: userInput });

    const completion = await client.messages.create({
      model: "claude-sonnet-4-0",
      messages: conversations,
      max_tokens: 4096,
    });

    // Iterate over each potential response in completion
    for (const message of completion.content) {
      switch (message.type) {
        case "text": {
          conversations.push({ role: "assistant", content: message.text });
          console.log(chalk.blue(`Claude: ${message.text}`));
          break;
        }
        default: {
          console.log("Unknown message type:", JSON.stringify(message));
        }
      }
    }
  }

  console.log("Exiting...");
};
```

When we run this with `bun agent.ts`, we should see the following output:

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent> bun agent.ts
Welcome to Amie!
You: What's the capital of France?
Claude: The capital of France is Paris.
You: What did I just ask you about?
Claude: You just asked me about the capital of France.
You: quit
Exiting...
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent>
```

We can even get Claude to call fake APIs inline with this

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent> bun agent.ts
Welcome to Amie!
You: you have a tool called get_weather , call it twice when you use it using xml tag of <get_weather> for your args inside and also do a tool call with {city:str}.
Claude: I'll call the get_weather tool twice using both the XML tag format and the JSON format as requested.

<get_weather>
New York
</get_weather>

<get_weather>
London
</get_weather>

Now I'll also make a tool call using the JSON format:

{"city": "Tokyo"}

I've called the get_weather tool twice using XML tags with city names as arguments (New York and London), and also provided an example of the JSON format tool call structure with Tokyo as the city parameter.
```

With this, we've figured out how to go back and forth between the agent and the user. We've also seen the Sonnet-4 has agentic capabilities built in which allow it to call tools and APIs inline. Let's now see how we can provide it with it's first tool.

### Reading Files

We'll start by implementing a tool called `read_files` which will allow the agent to read files from the file system. In TypeScript, we can use Zod for schema validation, equivalent to Thorsten's Go structs.

`Zod` allows us to also generate JSON Schemas which we can provide to the agent to call and use as tools.

Let's start by defining our tools. We'll then `console.log` them out so we can see what they look like.

```ts
import { toJSONSchema, z } from "zod";
import fs from "fs";

const client = new Anthropic();

const readFile = (args: { path: string }) => {
  const fileExists = fs.existsSync(args.path);

  if (!fileExists) {
    return `File does not exist at ${args.path}`;
  }

  return fs.readFileSync(args.path, "utf8");
};

const tool_defs = [
  {
    name: "read_file",
    description: "Read a file from the local file system",
    args: z.object({
      path: z.string(),
    }),
    execute: readFile,
  },
];

const tools = tool_defs.map((item) => ({
  name: item.name,
  description: item.description,
  input_schema: {
    ...toJSONSchema(item.args),
    type: "object" as const,
  },
}));

console.log(JSON.stringify(tools, null, 2));
```

This gives us the output below

```bash
[
  {
    "name": "read_file",
    "description": "Read a file from the local file system",
    "input_schema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "path": {
          "type": "string"
        }
      },
      "required": [
        "path"
      ],
      "additionalProperties": false
    }
  }
]
```

We've now defined a set of tools, let's see how we can use them.

```ts
const executeTool = (tool_name: string, args: any) => {
  const tool = tool_defs.find((tool) => tool.name === tool_name);
  if (!tool) {
    return "Tool not found";
  }
  // Execute and validate that we have the right tools
  return tool.execute(tool.args.parse(args));
};

const run = async () => {
  // Previous Code Here
  const completion = await client.messages.create({
    model: "claude-sonnet-4-0",
    messages: conversations,
    max_tokens: 4096,
    tools: tools,
  });
  for (const message of completion.content) {
    switch (message.type) {
      case "text": {
        conversations.push({ role: "assistant", content: message.text });
        console.log(chalk.blue(`Claude: ${message.text}`));
        break;
      }
      case "tool_use": {
        console.log(
          chalk.yellow(
            `tool : ${message.name}(${JSON.stringify(message.input)})`
          )
        );
        conversations.push({
          role: "assistant",
          content: [
            {
              id: message.id,
              input: message.input,
              name: message.name,
              type: "tool_use",
            },
          ],
        });

        const tool_execution_result = executeTool(message.name, message.input);
        conversations.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: message.id,
              content: tool_execution_result,
            },
          ],
        });
        break;
      }
      default: {
        console.log("Unknown message type:", JSON.stringify(message));
      }
    }
  }
};
```

With this we're now able to execute tools and get the results back from the model. Let's see what happens when we run the code.

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent [1]> bun agent.ts
Welcome to Amie!
You: can you read the secret.txt file?
Claude: I'll read the secret.txt file for you.
tool : read_file({"path":"secret.txt"})
```

Our next step is to pass the result of our tool execution back to the model and continue the conversation before we prompt the user for a response. We can do so by introducing a new boolean variable to determine if we should get some input from the user called `processUserInput`.

We'll set it to `false` on each run of the tool execution and reset it to `true` on the next run of our loop

```ts
const run = async () => {
  console.log(chalk.cyanBright("Welcome to Amie!"));
  const conversations: Anthropic.MessageParam[] = [];
  let processUserInput: boolean = true;
  while (true) {
    if (processUserInput) {
      const userInput = await getUserInput();
      if (userInput === "q" || userInput === "quit") {
        break;
      }
      conversations.push({ role: "user", content: userInput });
    }

    // Reset processUserInput
    processUserInput = true;

    const completion = await client.messages.create({
      model: "claude-sonnet-4-0",
      messages: conversations,
      max_tokens: 4096,
      tools: tools,
    });

    for (const message of completion.content) {
      switch (message.type) {
        case "text": {
          conversations.push({ role: "assistant", content: message.text });
          console.log(chalk.blue(`Claude: ${message.text}`));
          break;
        }
        case "tool_use": {
          console.log(
            chalk.yellow(
              `tool : ${message.name}(${JSON.stringify(message.input)})`
            )
          );
          conversations.push({
            role: "assistant",
            content: [
              {
                id: message.id,
                input: message.input,
                name: message.name,
                type: "tool_use",
              },
            ],
          });

          const tool_execution_result = executeTool(
            message.name,
            message.input
          );
          conversations.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: message.id,
                content: tool_execution_result,
              },
            ],
          });

          // Set to skip
          processUserInput = false;
          break;
        }
        default: {
          console.log("Unknown message type:", JSON.stringify(message));
        }
      }
    }
  }

  console.log("Exiting...");
};
```

Now when we run the code, we should see the following output:

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent> bun agent.ts
Welcome to Amie!
You: can you read the secret-file.txt for me?
Claude: I'll read the secret-file.txt file for you.
tool : read_file({"path":"secret-file.txt"})
Claude: The file contains a riddle: "what animal is the most disagreeable because it always says neigh?"

The answer to this riddle is a horse - horses say "neigh" and the joke plays on the word "neigh" sounding like "nay" (meaning "no"), which would make them seem disagreeable since they're always saying no!
You: can you read the s.txt file?
Claude: I'll read the s.txt file for you.
tool : read_file({"path":"s.txt"})
Claude: The file "s.txt" does not exist in the current directory. Could you please check the filename or provide the correct path to the file you'd like me to read?
```

We've now implemented our first tool to read file content from the current directory. Let's see how we can implement our other tools now.

### Adding more tools

In this portion, we'll aim to add three more tools

1. `list_files` : This will list all of the files in the current directory
2. `create_file` : This will create a new file at a given path
3. `edit_file` : This will look for a substring match and replace it with a new string

Let's start by defining the functions for each of the tools. These will be async functions because of the `exec` function we're using so we'll need to modify `execute_tool` to be an async function.

```ts
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const listFile = async (args: { path: string }) => {
  try {
    const { stdout } = await execAsync(
      `npx tree-cli ${args.path} -I "node_modules|.git|dist|build|.next|.vscode|coverage|node_modules"`
    );
    return stdout;
  } catch (error) {
    return `Directory not found: ${args.path}`;
  }
};

const editFile = async (args: {
  path: string;
  old_string: string;
  new_string: string;
}) => {
  const content = readFile({ path: args.path });
  const updatedContent = content.replace(args.old_string, args.new_string);
  fs.writeFileSync(args.path, updatedContent);
};

const createFile = async (args: { path: string; content: string }) => {
  const dir = args.path.substring(0, args.path.lastIndexOf("/"));
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(args.path, args.content);
  return `File ${args.path} created successfully`;
};

const tool_defs = [
  {
    name: "read_file",
    description: "Read a file from the local file system",
    args: z.object({
      path: z.string(),
    }),
    execute: readFile,
  },
  {
    name: "create_file",
    description: "Create a file in the local file system",
    args: z.object({
      path: z.string(),
      content: z.string(),
    }),
    execute: createFile,
  },
  {
    name: "edit_file",
    description: "Edit a file in the local file system",
    args: z.object({
      path: z.string(),
      old_string: z.string(),
      new_string: z.string(),
    }),
    execute: editFile,
  },
  {
    name: "list_files",
    description: "List files in a directory",
    args: z.object({
      path: z.string(),
    }),
    execute: listFile,
  },
];

const executeTool = async (tool_name: string, args: any) => {
  const tool = tool_defs.find((tool) => tool.name === tool_name);
  if (!tool) {
    return "Tool not found";
  }
  // Execute and validate that we have the right tools
  try {
    const result = await tool.execute(tool.args.parse(args));
    return result;
  } catch (e) {
    console.log(e);
    return "Error executing tool";
  }
};
```

This is all the setup we'll do for the tools. Let's give it a go now and see how it works.

```bash
ivanleo@Ivans-MacBook-Pro ~/D/c/coding-agent> bun agent.ts
Welcome to Amie!
You: what's in fizz.js?
Claude: I'll read the contents of fizz.js for you.
tool : read_file({"path":"fizz.js"})
Claude: The file `fizz.js` contains three console.log statements that print out the names of different soft drink brands:
- Coca-Cola
- Pepsi
- Sprite
You: can you edit it so it prints three soju brands?
Claude: I'll edit the fizz.js file to print three soju brands instead of soft drink brands.
tool : edit_file({"path":"fizz.js","old_string":"console.log(\"Coca-Cola\");\nconsole.log(\"Pepsi\");\nconsole.log(\"Sprite\");","new_string":"console.log(\"Chamisul\");\nconsole.log(\"Jinro\");\nconsole.log(\"Chum Churum\");"})
Claude: Done! I've updated fizz.js to print three popular soju brands:
- Chamisul
- Jinro
- Chum Churum

The file now contains console.log statements for these Korean soju brands instead of the soft drinks.
You: can you create a new file now which is called sake.js and then print out three sake brands
Claude: I'll create a new file called sake.js that prints out three sake brands.
tool : create_file({"path":"sake.js","content":"console.log(\"Dassai\");\nconsole.log(\"Kubota\");\nconsole.log(\"Hakkaisan\");"})
Claude: I've created the file `sake.js` that prints out three popular sake brands:
- Dassai
- Kubota
- Hakkaisan

The file contains console.log statements for these well-known Japanese sake brands.
```

## Conclusion

Building a code-editing agent is surprisingly straightforward. In just 200 lines of TypeScript, we created an agent that can read, list, create, and edit files by giving Claude the right tools with clear descriptions. The magic isn't in complex algorithms—it's in the conversation loop and well-designed tool interfaces that let Claude naturally combine tools to accomplish complex tasks.

What makes this approach powerful is its extensibility. Each tool is a simple function that takes structured input and returns a string result. This pattern scales to much more sophisticated capabilities—database queries, API calls, shell commands, or even spawning other AI agents.

In our next article, we'll enhance this foundation by improving the `read_file` function to handle large files with line numbers and chunked reading, adding an `append_file` function for incremental modifications, and implementing memory capabilities so the agent can maintain context across sessions. The barrier to entry for building useful AI agents has never been lower.
