This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick start
- Install: `pnpm install`
- Run dev server: `pnpm dev` (Next.js App Router, Turbo)
- Build: `pnpm build` (runs DB migrate via `tsx lib/db/migrate` then `next build`)
- Start production build: `pnpm start`

## Linting & formatting
- Check: `pnpm lint` (Ultracite)
- Fix/format: `pnpm format` (Ultracite)
- Ultracite rules are strict on a11y, no `console`, React/TS best practices (see .cursor/rules/ultracite.mdc). Expect failures if patterns are violated.

## Environment
Copy `.env.example` to `.env.local` and fill:
- `AUTH_SECRET`
- `GOOGLE_GENERATIVE_AI_API_KEY` (direct @ai-sdk/google)
- `POSTGRES_URL`
- `REDIS_URL`

## Architecture overview
- **Framework**: Next.js 16 App Router in `app/` with server components and server actions.
- **Auth**: NextAuth.js config in `app/(auth)/auth.ts` & `auth.config.ts`; routes under `app/(auth)/api/auth/*`; pages for login/register in `app/(auth)/*`.
- **Chat experience**: UI pages under `app/(chat)` with shared layout. Chat API at `app/(chat)/api/chat/route.ts` streams responses via `ai` SDK `streamText`, enforces per-user entitlements, and persists messages.
- **AI layer**: Model catalog in `lib/ai/models.ts`; providers and system prompt in `lib/ai/providers.ts` and `lib/ai/prompts.ts`; tool definitions in `lib/ai/tools/*` (weather, document CRUD, suggestions); default model `gemini-2.5-flash-lite`.
- **Data layer**: Drizzle ORM schemas/queries in `lib/db/schema.ts` and `lib/db/queries.ts`; migrations under `lib/db/migrations`; migration runner `lib/db/migrate.ts` (also invoked by `pnpm build`).
- **Artifacts & streaming**: Resumeable streams via `resumable-stream`; Redis-backed stream IDs in chat API; artifact helpers in `lib/artifacts/server.ts`.
- **UI components**: Comprehensive component library in `components/`, including AI/graph elements (`components/ai-elements/*`), chat/message surfaces, editors (CodeMirror/ProseMirror in `components/text-editor.tsx`, `lib/editor/*`), shadcn/Radix primitives in `components/ui/*`, theming in `components/theme-provider.tsx`.
- **Styling & assets**: Global styles in `app/globals.css`; Tailwind/shadcn stack; Next image remote patterns set in `next.config.ts` for Vercel avatar and blob storage hosts.

## Database & migrations
- Generate: `pnpm db:generate`
- Apply latest (local): `pnpm db:migrate` (or `pnpm db:up` for incremental)
- Studio: `pnpm db:studio`
- Pull/push/check: `pnpm db:pull`, `pnpm db:push`, `pnpm db:check`

## Notable folders
- `app/(auth)` auth routes/views; `app/(chat)` chat pages & APIs
- `lib/ai` AI models/providers/prompts/tools
- `lib/db` Drizzle schema, queries, migrations
- `components/` UI/AI elements and editors
- `public/app/(chat)/opengraph-image.png` etc. for social cards

## Production notes
- Redis URL enables resumable SSE streams; without it, streaming still works but resumes are disabled.
- Provide direct provider keys if customizing `lib/ai/providers.ts`.
