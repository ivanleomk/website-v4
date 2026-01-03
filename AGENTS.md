# AGENTS.md

Configuration and commands for AI agents working on this project.

## Build Commands

| Command       | Purpose                                |
| ------------- | -------------------------------------- |
| `pnpm build`  | Build website (required before deploy) |
| `pnpm dev`    | Start dev server                       |
| `pnpm lint`   | Run ESLint                             |
| `pnpm tc`     | TypeScript type check                  |
| `pnpm deploy` | Deploy to Cloudflare                   |

## Requirements

- Always run `pnpm build` before making PR or deploying
- Run `pnpm lint` to check code quality
- Run `pnpm tc` to check TypeScript types
- Verify changes locally with `pnpm dev` first

## Key Directories

- `/src` - Source code
- `/content` - Blog posts and markdown content
- `/public` - Static assets

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS
- Cloudflare Workers (deployment)
