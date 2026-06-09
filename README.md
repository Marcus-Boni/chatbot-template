# Meeting Copilot

A replicable **Next.js + CopilotKit** chatbot template that answers questions grounded in **Microsoft Teams `.docx` meeting transcripts**. Every answer is backed by retrieved meeting excerpts and **always cited** (meeting + date, and speaker/timestamp when helpful), powered by an agentic `searchMeetings` RAG tool over **pgvector on Neon Postgres**.

The reference deployment is **Marca Ambiental**, an environmental-services validating use case: staff ask natural-language questions about past meetings and get grounded, citation-backed answers in Portuguese. The template is config-driven, so you can re-skin and re-point it at any other client's transcript corpus.

> Note: the application UI and the assistant's responses are **PT-BR** (per `appConfig.systemPrompt`), because that is the Marca Ambiental use case. This README is in English; the assistant itself replies in Portuguese unless you change the system prompt.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **CopilotKit** (`^1.59`) — chat UI (`@copilotkit/react-ui`), core (`@copilotkit/react-core`), and runtime (`@copilotkit/runtime`)
- **OpenAI** — chat (`gpt-4.1-mini`) + embeddings (`text-embedding-3-small`)
- **Neon Postgres** + **pgvector** (`@neondatabase/serverless`)
- **drizzle-orm** + **drizzle-kit** (schema, migrations)
- **mammoth** — extracts raw text from `.docx` Teams exports
- **Framer Motion** + **GSAP** — UI animation
- **Vitest** — unit + contract tests

---

## Prerequisites

- **Node.js** 20+
- **pnpm**
- A **Neon Postgres** database (connection string)
- An **OpenAI API key**

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in the three variables:

```bash
cp .env.example .env
```

| Variable          | Description                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`  | OpenAI API key, used for chat completions and embeddings.                                    |
| `DATABASE_URL`    | Neon Postgres connection string (used by the app, the migration script, and drizzle-kit).    |
| `TRANSCRIPTS_DIR` | Absolute path to the folder containing your `.docx` Teams transcript exports.                |

### 3. Create the database schema (Neon + pgvector)

The generated drizzle migration (`src/db/migrations/0000_*.sql`) **already includes `CREATE EXTENSION IF NOT EXISTS vector;` as its first statement** (hand-added), so applying the migration sets up both the pgvector extension and all tables in one step:

```bash
pnpm exec drizzle-kit migrate
```

That single command is sufficient for a clean setup.

**Optional / belt-and-suspenders:** `pnpm db:migrate` runs `scripts/migrate.ts`, which only ensures the extension exists (`CREATE EXTENSION IF NOT EXISTS vector`). It does **not** create tables. You can run it before `drizzle-kit migrate` if you want the extension guaranteed independently (useful in CI where roles differ), but it is not required because the migration SQL handles it.

**If you change the schema** (`src/db/schema.ts`), regenerate and re-apply:

```bash
pnpm db:generate            # drizzle-kit generate → writes new SQL to src/db/migrations
pnpm exec drizzle-kit migrate   # applies pending migrations
```

> Summary of the moving parts:
> - `pnpm db:generate` → `drizzle-kit generate`: turns the drizzle schema into SQL migration files.
> - `pnpm exec drizzle-kit migrate`: applies those SQL files to your Neon DB (extension + tables).
> - `pnpm db:migrate` → `scripts/migrate.ts`: standalone helper that only ensures the pgvector extension.

### 4. Add your transcripts

Place your `.docx` Microsoft Teams transcript exports into the folder you set as `TRANSCRIPTS_DIR`. The loader scans that directory for `.docx` files (ignoring Office lock files like `~$...`).

### 5. Ingest

```bash
pnpm ingest
```

This runs the ingestion pipeline: **load** (`.docx` → text via mammoth) → **chunk** → **embed** (OpenAI) → **upsert** into pgvector, while recording each source in the `documents` table.

### 6. Run the app

```bash
pnpm dev
```

Open <http://localhost:3000>:

- **`/`** — the CopilotKit chat (ask grounded, cited questions about your meetings).
- **`/sources`** — manage/reindex transcript sources.

---

## How it works

This is a **config-driven template**. The single source of truth for branding and behavior is `src/config/app.config.ts` (brand name/logo/accent, LLM models, system prompt, and suggested questions).

Request flow:

1. The **CopilotKit chat UI** sends the conversation to the runtime at **`/api/copilotkit`**.
2. That route hosts a **CopilotRuntime** with the **OpenAIAdapter**, and exposes an agentic **`searchMeetings`** action.
3. `searchMeetings` queries a **`ContextStore`** — the default is **`PgVectorStore`** backed by Neon pgvector.
4. The store was populated by a **`Loader`** (`TeamsTranscriptDocxLoader`) through the ingestion pipeline.
5. The model answers **grounded** in the retrieved excerpts and **cites** its sources, rendered via the **CitationCard** generative UI.
6. Conversations and messages are persisted to Postgres (`conversations`, `messages` tables); the ingestion API lives at **`/api/ingest`**.

---

## Replicate for another client

The template is built to be cloned and re-skinned:

1. **Copy the repo.**
2. **Edit `src/config/app.config.ts`:**
   - `brand` → `{ name, logo, accent }`
   - `systemPrompt` (tone, language, citation rules)
   - `suggestedQuestions`
   - `llm` → `{ model, embeddingModel }`
3. **Drop the client's logo** at `public/logo.svg` (matches `brand.logo`).
4. **Point `TRANSCRIPTS_DIR`** at the new client's `.docx` transcripts.
5. **Run `pnpm ingest`** to index the new corpus.
6. **Redeploy.**

> Deployment note: the **build works without DB/OpenAI env vars** (DB init is lazy), so it deploys cleanly to **Vercel**. `OPENAI_API_KEY`, `DATABASE_URL`, and `TRANSCRIPTS_DIR` are only needed at **runtime** (and `TRANSCRIPTS_DIR` only when running `pnpm ingest`).

---

## Swap the context provider

The retrieval layer is abstracted behind the `ContextStore` interface, so you can replace pgvector with another backend (e.g. a `graphify` graph store, or an in-memory `memory` provider).

1. **Implement the `ContextStore` interface** from `src/core/context-store/types.ts`:

   ```ts
   interface ContextStore {
     upsert(chunks: ContextChunk[]): Promise<void>;
     search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]>;
     clear(sourceId?: string): Promise<void>;
   }
   ```

2. **Validate it with the reusable contract suite** in `src/core/context-store/contract.ts`. Call `runContextStoreContract(makeStore)` from a Vitest file to assert the three behavioral guarantees (similarity ordering, clear-by-sourceId, upsert-replaces-by-id). See `src/core/context-store/memory-store.test.ts` for a working example using `InMemoryStore`.

3. **Add it to the provider switch** in `src/core/context-store/factory.ts`. Today the factory is hardwired to `PgVectorStore`; the comment marks exactly where to branch on `appConfig.contextStore.provider`:

   ```ts
   // provider switch: add "graphify" / "memory" here as adapters land.
   return new PgVectorStore(embedder);
   ```

---

## Scripts reference

| Script             | Command                  | What it does                                                            |
| ------------------ | ------------------------ | ----------------------------------------------------------------------- |
| `pnpm dev`         | `next dev`               | Start the Next.js dev server (<http://localhost:3000>).                 |
| `pnpm build`       | `next build`             | Production build.                                                       |
| `pnpm start`       | `next start`             | Serve the production build.                                             |
| `pnpm lint`        | `eslint`                 | Lint the codebase.                                                      |
| `pnpm test`        | `vitest run`             | Run the test suite once.                                                |
| `pnpm test:watch`  | `vitest`                 | Run the test suite in watch mode.                                       |
| `pnpm ingest`      | `tsx scripts/ingest.ts`  | Load → chunk → embed → upsert transcripts into the context store.       |
| `pnpm db:generate` | `drizzle-kit generate`   | Generate SQL migration files from the drizzle schema.                   |
| `pnpm db:migrate`  | `tsx scripts/migrate.ts` | Ensure the pgvector extension exists (`CREATE EXTENSION IF NOT EXISTS`).|

> To apply generated migrations (extension + tables), use `pnpm exec drizzle-kit migrate`.

---

## Testing

```bash
pnpm test
```

Runs **Vitest** (17 tests): the Teams parser, chunking, the context stores (via the shared contract suite), the embedder, `searchMeetings`, and the `.docx` loader.

`PgVectorStore`'s behavioral correctness is validated by the **same contract suite** (`runContextStoreContract`) run against a real Neon database in integration — the unit suite exercises the contract with the in-memory store, keeping `pnpm test` fast and DB-free.
