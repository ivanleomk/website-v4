# AGENTS.md

Configuration and commands for AI agents working on this project.

## Build Commands

| Command       | Purpose                                |
| ------------- | -------------------------------------- |
| `bun build`  | Build website (required before deploy) |
| `bun dev`    | Start dev server                       |
| `bun lint`   | Run ESLint                             |
| `bun tc`     | TypeScript type check                  |
| `bun deploy` | Deploy to Cloudflare                   |

## Requirements

- Always run `bun build` before making PR or deploying
- Run `bun lint` to check code quality
- Run `bun tc` to check TypeScript types
- Verify changes locally with `bun dev` first

## Key Directories

- `/src` - Source code
- `/content` - Blog posts and markdown content
- `/public` - Static assets

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS
- Cloudflare Workers (deployment)
