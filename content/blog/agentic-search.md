---
title: "Agentic Search"
date: 2025-10-11
description: "Models can't do much without the right context, agentic search does just that"
categories:
  - Agents
  - Applied AI
authors:
  - ivanleomk
series:
  - Building an Agent
---

> If you'd like to see the final result of this article, you can check out the [code](https://github.com/ivanleomk/building-an-agent/commit/028117d) on Github.

What separates a simple command-line tool from a true AI assistant? The ability to find its own answers.

A simple tool can edit a file when told; an assistant can figure out which file to edit and what changes to make. This capacity for autonomous information gathering is the essence of agentic search, and it's a critical step in building a useful agent.

We will implement the core features of agentic search by equipping our agent with the tools it needs to be self-sufficient. Specifically, we will build:

1. A web search integration for external knowledge using the `exa` sdk
2. Support for Grep/Glob operations to quickly find relevant files/content
3. Bash support so that it can execute bash commands to verify its work, test builds and ensure its changes actually work.

The result is an agent that can research and understand the context it needs to give you better answers. We'll do so in three main portions

1. First we'll improve our current UI by building a simple auto-complete component. This helps us to pull in relevant context in our prompt more easily
2. Then we'll implement simple grep/glob support along with a bash tool for our model to use
3. Lastly, we'll then add in support for web search using the `exa` Typescript SDK

By the end of this article, we'll have a fully functional agent that can research and understand the context it needs to give you better answers.

Before continuing, make sure that you've got `rigrep` and `ast-grep` installed on your system.

```bash
// Install Ast grep
npm install --global @ast-grep/cli
pip install ast-grep-cli
brew install ast-grep

// Install Rigrep
brew install ripgrep
```

## Building Autocomplete

Before we dive into building the core agentic search tools, let's solve a practical problem that impacts every interaction with our agent: referencing files.

Typing out long, nested file paths like `src/components/user/profile/UserProfileSettings.tsx` is tedious and error-prone. A simple autocomplete feature can make our command-line interface feel responsive and intelligent.

We'll build this in three clear steps:

1.  **Generating Suggestions:** We'll use the lightning-fast `ripgrep` tool to find files that match the user's input.
2.  **Creating the UI:** We will build a React Ink component to display the suggestions and handle keyboard navigation.
3.  **Integrating with the Main Input:** Finally, we'll tie the autocomplete component to our main text input, allowing it to appear, disappear, and update the text seamlessly.

### Using Rigrep

The heart of our autocomplete system is its ability to quickly search for files. For this, we'll use `ripgrep` (`rg`), a command-line search tool that is significantly faster than traditional tools like `grep`. First, ensure it's installed on your system.

```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt-get install ripgrep

# Windows (using Chocolatey)
choco install ripgrep
```

With `ripgrep` installed, we can write a function that takes the user's current input and returns a list of matching file paths. We'll trigger this search whenever the user types an `@` symbol, which signals an intent to reference a file.

This `generateSuggestions` function is the core of our search logic.

```ts
import { execSync } from "child_process";

const generateSuggestions = (input: string): string[] => {
  // We only care about the last word, assuming it's the one being typed.
  const lastWord = input.split(" ").at(-1);
  if (!lastWord?.includes("@")) {
    return [];
  }

  // Extract the search term after the "@" symbol.
  const searchTerm = lastWord.split("@")[1] || "";
  if (!searchTerm) {
    return [];
  }

  try {
    // Execute the ripgrep command.
    const result = execSync(`rg --files | rg -i "${searchTerm}"`, {
      encoding: "utf-8",
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "ignore"], // Suppress errors in the console.
    });
    // Clean up the output and return the top 5 matches.
    return result.trim().split("\n").filter(Boolean).slice(0, 5);
  } catch (error) {
    // If the command fails (e.g., no matches), return an empty array.
    return [];
  }
};
```

The magic happens in the `execSync` call, which chains two `ripgrep` commands together:

1.  `rg --files`: This command lists every file `ripgrep` knows about in the current directory, respecting rules in `.gitignore`. It doesn't search file contents, just lists paths.
2.  `|`: The pipe operator sends the output of the first command (the full file list) as the input to the second command.
3.  `rg -i "${searchTerm}"`: This second command searches the list of file paths it received for lines containing our `searchTerm`. The `-i` flag makes the search case-insensitive.

This pipeline gives us a simple yet powerful way to generate relevant file suggestions in milliseconds.

### Creating our UI

Now that we have a way to generate suggestions, we need a component to display them. This component will manage two key pieces of state: the list of suggestions from our `generateSuggestions` function and the `selectedIndex` to track which suggestion the user has highlighted with the arrow keys.

We use Ink's `useInput` hook to listen for keyboard events. `upArrow` and `downArrow` will cycle through the suggestions, while `Tab` or `Return` will select the highlighted one.

```ts
import React, { useState } from "react";
import { Text, Box, useInput } from "ink";

export default function Autocomplete({
  searchTerm,
  updateUserInput,
}: {
  searchTerm: string;
  updateUserInput: (newInput: string) => void;
}) {
  const suggestions = generateSuggestions(searchTerm);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_, key) => {
    // Handle navigation
    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    }
    if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    }
    // Handle selection
    if ((key.tab || key.return) && suggestions[selectedIndex]) {
      const inputParts = searchTerm.split(" ");
      inputParts[inputParts.length - 1] = `@${suggestions[selectedIndex]}`;
      updateUserInput(inputParts.join(" "));
    }
  });

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan">
      {suggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={index}>
            <Text>{isSelected ? "> " : "  "}</Text>
            <Text bold={isSelected}>{suggestion}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
```

This component is now self-contained. It takes the user's current input as a `searchTerm`, generates and displays suggestions, and calls `updateUserInput` when a selection is made.

### Integrating with our Application

The final step is to connect our `<Autocomplete>` component to the main application state. In our primary component (e.g., `App.tsx`), we need to decide _when_ to show the autocomplete box.

Instead of managing a separate `showAutocomplete` state with `useState`, we can derive it directly from the user's input on every render. This is a cleaner approach in React that avoids complex state synchronization.

```ts
// In your main App.tsx component

const [input, setInput] = useState("");

// Derive the state directly from the current input value.
const lastTerm = input.split(" ").at(-1) || "";
const showAutocomplete = lastTerm.includes("@");

return (
  <Box flexDirection="column">
    {/* Other UI elements */}
    <TextInput value={input} onChange={setInput} />
    {showAutocomplete && (
      <Autocomplete searchTerm={input} updateUserInput={setInput} />
    )}
  </Box>
);
```

Here, `showAutocomplete` is not a value we manually set; it's a boolean that is recalculated on every render based on the `input` state. If the last word contains `@`, the component shows. If it doesn't, it hides. This makes our UI a direct and predictable function of the application's state.

With these three steps, we have a fully functional autocomplete system that makes our CLI tool smarter and more user-friendly.

## Making Search Fast

Now that we've got simple autocomplete working, let's move on to the next step: integrating grep/glob functionality. This will allow users to search for files and directories using patterns, making the tool even more powerful and flexible.

### Understanding the Tools

We'll implement three essential search tools that our agent can use to navigate codebases efficiently:

**Grep** is the classic line-oriented search tool that scans files for textual patterns and reports matching lines with line numbers and file context. It's perfect for finding specific strings or regular expressions across multiple files.

**Glob** works differently—it doesn't look inside files at all. Instead, it matches file and directory paths against shell-style wildcard patterns (like `src/**/*.ts`). This makes it ideal for discovering which files exist in a project before diving into their contents.

**AST-Grep** is the most sophisticated of the three. It operates on the abstract syntax tree of code, meaning it understands the actual structure of the programming language. This allows it to find all function calls named `foo`, even if they're formatted differently or appear in contexts that would confuse a text-based grep.

### How They Work Together

Let's walk through a practical example. Imagine we're in a new repository and want to add a feature to the user authentication system. By combining these three tools, our agent can efficiently navigate and understand the codebase without manually opening every file.

First, we use **glob** to discover where authentication logic might live:

```bash
glob('**/*{auth,user}*')
src/auth/login.ts
src/middleware/authMiddleware.js
src/components/UserProfile.jsx
src/utils/userHelpers.ts
```

Next, we use **grep** to search within those files for specific keywords:

```bash
grep('login', 'src/auth/login.ts', 'src/middleware/authMiddleware.js')
src/auth/login.ts:12: export function handleLogin(credentials) { ... }
src/middleware/authMiddleware.js:5: // This middleware checks if a user is logged in
```

Finally, we use **ast-grep** to find the exact code structure we need:

```bash
ast_grep('function handleLogin($credentials) {}', 'src/auth/login.ts')
src/auth/login.ts:12: export function handleLogin(credentials) { ... }
```

By combining these three tools, our agent can quickly narrow down from an entire repository to the exact function it needs to modify, making it incredibly efficient to work with unfamiliar codebases.

### Implementing Grep and Glob

By having a standardized set of tool interfaces, it's easy to add new capabilities that complement our existing file system operations.

Our executeGrep function handles both operations via a single interface. The grepArgsSchema uses a type field to switch between 'normal' and 'ast' modes, each with its own set of arguments.

```ts title="Grep Tool Definition"
export const grepArgsSchema = z.object({
  type: z.enum(["normal", "ast"]),
  arguments: z.union([
    z.object({
      pattern: z.string(),
      filePath: z.string().describe("File or directory path to search from"),
      caseSensitive: z.boolean().default(false),
    }),
    z.object({
      pattern: z.string(),
      filePath: z.string().describe("File or directory path to search from"),
      lang: z
        .string()
        .optional()
        .describe(
          "Language of the pattern (e.g., typescript, javascript, python)"
        ),
      selector: z
        .string()
        .optional()
        .describe("AST kind to extract sub-part of pattern to match"),
      context: z
        .number()
        .optional()
        .describe("Show NUM lines around each match"),
      strictness: z
        .enum(["cst", "smart", "ast", "relaxed", "signature", "template"])
        .optional()
        .describe("The strictness of the pattern matching"),
    }),
  ]),
});
```

#### AST-Grep Walkthrough

Let's demonstrate how we can refine our search using `ast-grep` on a sample file, `src/api/user.ts`. Our goal is to find all direct `fetch` API calls within this file.

First, we'll run a broad search for any calls to the `fetch` function.

```bash
$ ast-grep --pattern 'fetch($$$)' --lang typescript src/api/user.ts
src/api/user.ts:3:10
  return fetch(`/api/users/${id}`);
         ~~~~~~~~~~~~~~~~~~~~~~~~~

src/api/user.ts:8:10
  return fetch(`/api/admins/${id}`);
         ~~~~~~~~~~~~~~~~~~~~~~~~~~
```

This is useful, but we only want the URLs. We can use the `--selector` flag to extract just the part of the pattern named `$URL`.

```bash
$ ast-grep --pattern 'fetch($URL)' --selector URL --lang typescript src/api/user.ts
src/api/user.ts:3:17
  return fetch(`/api/users/${id}`);
                 ~~~~~~~~~~~~~~~~~~~

src/api/user.ts:8:17
  return fetch(`/api/admins/${id}`);
                 ~~~~~~~~~~~~~~~~~~~~
```

Finally, to understand where these calls are located, we can add the `--context` flag to see the surrounding lines of code.

```bash
$ ast-grep --pattern 'fetch($URL)' --context 2 --lang typescript src/api/user.ts
src/api/user.ts:1:1
  function getUser(id: string) {
    // A simple function to fetch user data.
    return fetch(`/api/users/${id}`);
  }

--
src/api/user.ts:6:1
  function getAdmin(id: string) {
    // A simple function to fetch admin data.
    return fetch(`/api/admins/${id}`);
  }
```

This sequence shows how you can progressively narrow a search from a broad pattern to a highly specific and contextualized result.

#### Glob

Now that we've implemented the grep functionality, let's take a look at how we can do glob. We can start by defining our tool as

```ts title="Defining Our Glob Tool"
export const globArgsSchema = z.object({
  pattern: z.string(),
  directory: z.string(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});
```

We can then use the `fast-glob` library to implement the glob functionality

```ts
async function executeGlob(
  args: z.infer<typeof globArgsSchema>
): Promise<ContentBlock[]> {
  const files = await globby(args.pattern, {
    cwd: args.directory,
    gitignore: true,
    dot: false,
  });

  const start = args.offset || 0;
  const end = args.limit ? start + args.limit : undefined;
  const paginatedFiles = files.slice(start, end);

  const result = paginatedFiles.join("\n");
  return [{ type: "text" as const, text: result }];
}
```

With this our model now has the ability to search for files in a directory using a glob pattern.

## Providing a Bash Shell

To give our agent the ability to execute shell commands, we need a robust and safe way to run bash operations. Our bash tool implementation uses the execa library, which provides a more secure and feature-rich alternative to Node.js's built-in child_process.exec.

```ts
export const bashArgsSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
});

async function executeBash(
  args: z.infer<typeof bashArgsSchema>
): Promise<ContentBlock[]> {
  const result = await execa(args.command, {
    shell: process.env["SHELL"],
    cwd: args.cwd,
    reject: false,
  });
  const output = result.stdout + (result.stderr ? "\n" + result.stderr : "");
  return [{ type: "text" as const, text: output }];
}
```

The tool is then exported in our standardized `BASH_TOOLS` array format, making it easy to integrate with our agent's tool registry system.

```ts
export const BASH_TOOLS = [
  {
    name: "bash",
    description:
      "Execute a shell command and return the output. Note: Use absolute paths, as tilde (~) expansion is not supported.",
    input_schema: bashArgsSchema,
    execute: executeBash,
  },
] as const;
```

This gives our agent the ability to verify its work, test builds, run linters, or execute any other shell commands needed to ensure its changes actually work in practice.

## Adding Web Search with Exa

To equip our agent with the ability to access external knowledge, we integrate the Exa web search API.

Exa provides sophisticated search capabilities that go beyond traditional keyword matching, offering neural search that understands semantic meaning and context.

```ts
import { z } from "zod";
import type { ContentBlock } from "../types.js";
import Exa from "exa-js";

//@ts-ignore
const exa = new Exa(process.env["EXA_API_KEY"] || "");
```

There are two tools that the model can call

- `search_web` – finds pages, papers, news, or whatever the agent asks, and can fetch the full text if needed.
- `query` – gives a direct, summarized answer to a question and includes links for verification.

All results come back tidy and ready to use—titles, links, dates, and the actual content snippets—so the agent can quickly pull facts in and keep moving.

## Conclusion

In this article, we've implemented a simple agent which has access to different tools to gather context before making any edits in your codebase.

With these new capabilities, we can now ask our agent to handle more complex and ambiguous tasks. We can pose queries like, "Find the main user authentication component," or issue commands such as, "Can you fix the failing build script?".

The agent now has the means to tackle these requests—it can use glob to find candidate files, grep to search their contents, bash to run scripts, and then run searches against the web to research problems when it gets stuck.

This is a great place for us to be in before we move on to implementing subagents in the next article in this series. We've got an agent with serious capabilities, and we're ready to take it to the next level.
