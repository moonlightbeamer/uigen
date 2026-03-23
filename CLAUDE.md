# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # First-time setup: install deps, generate Prisma client, run migrations
npm run dev            # Start dev server with Turbopack
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Run all tests with Vitest
npm run db:reset       # Reset SQLite database
```

To run a single test file:
```bash
npx vitest run src/path/to/__tests__/file.test.ts
```

## Environment

Copy `.env.example` to `.env` and optionally set `ANTHROPIC_API_KEY`. Without an API key, the app runs with a `MockLanguageModel` that returns static demo code.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface; Claude generates code using tool calls against a virtual file system; the output renders live in an iframe.

### Request Flow

1. User sends message → `/api/chat` (streaming via Vercel AI SDK `streamText()`)
2. Claude calls `str_replace_editor` / `file_manager` tools to create/modify files
3. Client-side `handleToolCall()` intercepts tool calls and updates `FileSystemContext`
4. `PreviewFrame` detects file changes, Babel-transforms JSX, and re-renders in an iframe via blob URLs + import maps

### Key Layers

**AI Integration** (`src/lib/provider.ts`, `src/app/api/chat/route.ts`)
- Model: Claude Haiku-4.5 (or `MockLanguageModel` when no API key)
- Two tools defined with Zod schemas: `str_replace_editor` (view/create/str_replace/insert) and `file_manager` (rename/delete)
- `maxTokens: 10000`, `maxSteps: 40`

**Virtual File System** (`src/lib/file-system.ts`, `src/lib/contexts/file-system-context.tsx`)
- In-memory `Map<string, FileNode>` — no disk I/O
- Serialized to JSON for persistence in SQLite
- All file operations go through `FileSystemContext`

**Preview** (`src/components/preview/PreviewFrame.tsx`, `src/lib/transform/jsx-transformer.ts`)
- Babel (`@babel/standalone`) transforms JSX to executable JS in the browser
- Import map resolves virtual module paths to blob URLs
- Rendered in a sandboxed iframe

**Auth** (`src/lib/auth.ts`, `src/actions/index.ts`, `src/middleware.ts`)
- JWT in HTTP-only cookies (7-day expiry)
- `getSession()` used in server actions and middleware
- Anonymous users get a session cookie with no database record; authenticated users have a `User` + `Project` row in SQLite

**State Management**
- `FileSystemContext` — file tree and operations
- `ChatContext` — wraps Vercel AI SDK's `useChat()` hook
- No Redux/Zustand; React Context only

### Database (Prisma + SQLite)

Models: `User`, `Project`. Projects store messages and file system state as serialized JSON strings. Run `npx prisma studio` to inspect data locally.

### Testing

Tests live in `__tests__/` directories next to source files. Uses Vitest with jsdom. Coverage includes chat components, `FileSystemContext`, and `jsx-transformer`.
