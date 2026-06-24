# CLAUDE.md

Config-driven **Next.js + CopilotKit** RAG template: answers questions grounded in Microsoft Teams `.docx` meeting transcripts, with **always-cited** answers. Reference deployment = Marca Ambiental (PT-BR). Re-skin per client by editing one config file.

For human setup/replication docs see `README.md`. This file is the agent-facing context — read it before touching the CopilotKit, RAG, or DB layers.

## Commands

```bash
pnpm dev                      # dev server on http://localhost:3000
pnpm build                    # production build (works WITHOUT env vars — DB/OpenAI init is lazy)
pnpm test                     # vitest run (fast, DB-free: ~17 unit/contract tests)
pnpm test:watch
pnpm exec vitest run src/core/ingestion/chunk.test.ts   # single test file
pnpm exec tsc --noEmit        # typecheck (strict)
pnpm lint                     # eslint

pnpm ingest                   # load → chunk → embed → upsert transcripts (needs OPENAI_API_KEY, DATABASE_URL, TRANSCRIPTS_DIR)
pnpm exec drizzle-kit migrate # apply migrations: pgvector extension + all tables
pnpm db:generate              # regenerate SQL migration after editing src/db/schema.ts
pnpm db:migrate               # ONLY ensures `CREATE EXTENSION vector` — does NOT create tables
```

Windows + PowerShell + **pnpm**. Node 20+. Env vars (`.env`): `OPENAI_API_KEY`, `DATABASE_URL` (Neon), `TRANSCRIPTS_DIR`.

## Architecture

Request flow: **CopilotKit chat UI** → `POST /api/copilotkit` (v2 runtime + `BuiltInAgent`) → agent calls the **`searchMeetings`** tool (and **`listMeetings`** for temporal/overview questions) → tools query a **`ContextStore`** (`PgVectorStore` on Neon) / the `documents` table → model answers grounded in retrieved excerpts → **`CitationCard`** generative UI renders the citations.

```
src/
├── config/
│   ├── app.config.ts             # SINGLE source of truth: brand, llm params, retrieval tuning, suggestedQuestions
│   └── system-prompt.ts          # buildSystemPrompt(brandName) — pure builder composed into appConfig.systemPrompt
├── app/
│   ├── (chat)/page.tsx           # "/" route (route group); sources/page.tsx = "/sources"
│   ├── api/copilotkit/route.ts   # CopilotKit V2 runtime (see gotchas)
│   ├── api/ingest/route.ts       # GET lists docs, POST triggers re-ingest
│   └── api/conversations/...      # conversation + message persistence
├── core/
│   ├── context-store/            # ContextStore abstraction (types, memory, pgvector, factory, contract)
│   ├── loaders/                  # Loader abstraction: teams-parser (pure) + teams-docx-loader (mammoth I/O)
│   ├── ingestion/                # chunk (transcript-aware) → embed (OpenAI) → pipeline
│   └── rag/                      # search-meetings (semantic, dedup+score floor) + list-meetings (date-ordered) + prompt
├── db/                           # drizzle schema, neon client, migrations
└── components/                   # chat/ (ChatPanel, CitationCard, SearchMeetingsRender), layout/AppShell, sources/
```

Path alias: `@/*` → `src/*`. TS strict. To replicate for a new client, edit only `src/config/app.config.ts` + drop `public/logo.svg` + point `TRANSCRIPTS_DIR` (see README "Replicate for another client").

## CopilotKit — CRITICAL (installed: 1.59.5, **v2 API**)

The README and `docs/superpowers/plans/*` describe the **v1** API (`CopilotRuntime` + `OpenAIAdapter` + `actions`). **That is stale — the code uses v2. Trust the code, not those docs.** When changing anything here, verify against installed 1.59.5 via Context7 (`/copilotkit/copilotkit`) — the API moves fast.

- **Backend** (`src/app/api/copilotkit/route.ts`): imports from `@copilotkit/runtime/v2` — `BuiltInAgent` + `defineTool` (Zod params) + `createCopilotRuntimeHandler({ mode: "single-route" })`. Tools use `execute`, not `handler`.
- **Provider/handler pairing**: `layout.tsx` sets `<CopilotKit useSingleEndpoint={true}>` which MUST match the handler's `mode: "single-route"`. Change one → change the other.
- **Model id needs the `openai/` prefix** for the v2 `BuiltInAgent` (e.g. `openai/gpt-4o-mini` in `app.config.ts`). A bare `gpt-4o-mini` will not resolve.
- **System prompt is set in two places**: backend `BuiltInAgent.prompt` AND client `<CopilotChat instructions={...}>`. In 1.59 the backend `properties.systemMessage` does NOT reliably set the LLM system prompt, so the client `instructions` prop is the supported mechanism — keep both pointed at `appConfig.systemPrompt`.
- **Generative UI** (`SearchMeetingsRender.tsx`): uses `useRenderTool` from `@copilotkit/react-core/v2`. Status is `"inProgress" | "executing" | "complete"`; the `result` arrives as a **JSON string** (parse it) shaped as `SearchResponse`.
- **Message persistence** (`ChatPanel.tsx`): reads `visibleMessages` from `useCopilotChat()` (no publicApiKey needed) and POSTs each completed message. Gate on `message.status?.code === "Success"` — `Pending` messages are streaming partials and would persist truncated content. Dedupe via a ref `Set` of message ids.

## Testing & adding a ContextStore

- TDD project — tests were written before implementations (see plan). Keep that: write the failing test first.
- `pnpm test` runs in the **node** env and is **DB-free**. `PgVectorStore` has no live unit test; it's validated by the shared **contract suite** (`runContextStoreContract` in `src/core/context-store/contract.ts`) against a real Neon DB in integration. `InMemoryStore` runs the same contract with a fake embedder.
- **New store adapter**: implement `ContextStore` (`src/core/context-store/types.ts`), validate with `runContextStoreContract`, add a `case` to the switch in `factory.ts`, and set `contextStore.provider` in `app.config.ts`. The factory throws on unknown providers.

## Gotchas

- **Build works without env vars** (DB/OpenAI init is lazy; the route creates the store at module scope but no I/O happens until a tool runs). Deploys cleanly to Vercel — env is runtime-only.
- **Migrations**: the generated SQL (`src/db/migrations/0000_*.sql`) has a **hand-added** `CREATE EXTENSION IF NOT EXISTS vector;` as its first statement. After regenerating with `pnpm db:generate`, re-add it if drizzle-kit drops it. `pnpm db:migrate` (the tsx script) only ensures the extension — it does NOT create tables; use `pnpm exec drizzle-kit migrate` for that.
- **Ingest is idempotent**: `runIngestion` calls `store.clear(doc.id)` before re-upserting, keyed by a sha1 of the file path. Renaming a transcript file creates a new document.
- **Teams parser is pure** (`teams-parser.ts`) — fully unit-testable without docx I/O. Keep docx/mammoth concerns in `teams-docx-loader.ts`.
- **Known gaps before deploy** (intentional template gaps): API routes have **no auth** (`POST /api/ingest` costs OpenAI spend; conversation routes write unauthenticated, no input validation); conversation history is **write-only** (refresh starts a new chat — `GET .../messages` isn't wired into `ChatPanel`); **stored citations are empty** (`citations: []`) because 1.59 doesn't surface the tool result on the message object — live UI citations work, persisted ones don't.
