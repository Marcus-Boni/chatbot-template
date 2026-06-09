# Meeting Copilot Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a replicable Next.js chatbot template that answers questions grounded in Microsoft Teams `.docx` meeting transcripts, with always-cited answers, validated by the Marca Ambiental use case.

**Architecture:** Next.js (App Router) UI with CopilotKit chat; a `CopilotRuntime` API route using `OpenAIAdapter`; an agentic `searchMeetings` tool that queries a pluggable `ContextStore` (pgvector on Neon for v1) populated by a pluggable `Loader` (`TeamsTranscriptDocxLoader`). Everything is parameterized by a single `app.config.ts` so the template replicates per client.

**Tech Stack:** Next.js, TypeScript (strict), Tailwind v4, shadcn/ui, Framer Motion, GSAP, CopilotKit, Vercel AI / OpenAIAdapter, OpenAI embeddings, Neon Postgres + pgvector, drizzle-orm, mammoth, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-meeting-copilot-template-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                         # root layout + CopilotKit provider
│   ├── (chat)/page.tsx                    # main chat page
│   ├── sources/page.tsx                   # ingestion management UI
│   ├── api/copilotkit/route.ts            # CopilotRuntime + OpenAIAdapter + actions
│   └── api/ingest/route.ts                # POST triggers ingestion; GET lists sources
├── core/
│   ├── context-store/
│   │   ├── types.ts                       # ContextStore, ContextChunk, RetrievedChunk, ChunkSource
│   │   ├── memory-store.ts                # InMemoryStore (tests)
│   │   ├── pgvector-store.ts              # PgVectorStore (v1)
│   │   └── contract.test.ts               # reusable contract test suite
│   ├── loaders/
│   │   ├── types.ts                       # Loader, RawDocument, TranscriptTurn
│   │   ├── teams-docx-loader.ts           # mammoth + Teams parser
│   │   └── teams-parser.ts                # pure parse fns (title/date/turns)
│   ├── ingestion/
│   │   ├── chunk.ts                       # transcript-aware chunking
│   │   ├── embed.ts                       # OpenAI embeddings
│   │   └── pipeline.ts                    # load → chunk → embed → upsert
│   └── rag/
│       ├── prompt.ts                      # system prompt builder
│       └── search-meetings.ts             # action handler (embed query → store.search)
├── db/
│   ├── schema.ts                          # drizzle tables
│   ├── client.ts                          # neon + drizzle client
│   └── migrations/                        # generated SQL
├── components/
│   ├── chat/ChatPanel.tsx                 # CopilotChat wrapper + suggestions
│   ├── chat/CitationCard.tsx              # renders a ChunkSource citation
│   └── sources/SourcesTable.tsx           # indexed documents + reindex button
└── config/app.config.ts                   # per-deploy config
scripts/
└── ingest.ts                              # CLI entry (tsx) → pipeline
test/
└── fixtures/teams-sample.docx             # reduced real Teams export
```

---

## Task 0: Scaffold project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/app/layout.tsx`, `src/app/(chat)/page.tsx`

- [ ] **Step 1: Create Next.js app**

Run:
```bash
cd "C:/Users/mgalv/Projetos-Programacao/Projetos-Treino/Marca-Chatbot"
pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```
Expected: project files created in current dir (confirm overwrite of existing folder; keep `docs/` and `.git/`).

- [ ] **Step 2: Install runtime deps**

Run:
```bash
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime openai drizzle-orm @neondatabase/serverless mammoth framer-motion gsap clsx tailwind-merge class-variance-authority lucide-react
pnpm add -D drizzle-kit tsx vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/node
```
Expected: deps added to `package.json`.

- [ ] **Step 3: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "ingest": "tsx scripts/ingest.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx scripts/migrate.ts"
  }
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", globals: true, include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 5: Create `.env.example`**

```
OPENAI_API_KEY=
DATABASE_URL=
TRANSCRIPTS_DIR=
```

- [ ] **Step 6: Verify dev server boots**

Run: `pnpm dev`
Expected: server starts on http://localhost:3000 with no errors. Stop it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + deps + vitest"
```

---

## Task 1: Context store types

**Files:**
- Create: `src/core/context-store/types.ts`

- [ ] **Step 1: Write the types**

```typescript
export interface ChunkSource {
  meetingTitle: string;
  date: string; // ISO
  path: string;
  chunkIndex: number;
  speakers: string[];
  startTime: string; // mm:ss
  endTime: string; // mm:ss
}

export interface ContextChunk {
  id: string;
  sourceId: string;
  text: string;
  embedding?: number[];
  source: ChunkSource;
}

export interface RetrievedChunk {
  text: string;
  score: number;
  source: ChunkSource;
}

export interface ContextStore {
  upsert(chunks: ContextChunk[]): Promise<void>;
  search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]>;
  clear(sourceId?: string): Promise<void>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/core/context-store/types.ts
git commit -m "feat: context store types"
```

---

## Task 2: InMemoryStore + reusable contract tests

The contract suite is reused for every `ContextStore` adapter. `InMemoryStore` uses a
fake embedder injected via constructor so search is deterministic.

**Files:**
- Create: `src/core/context-store/memory-store.ts`
- Create: `src/core/context-store/contract.ts` (exported test suite fn)
- Test: `src/core/context-store/memory-store.test.ts`

- [ ] **Step 1: Write the contract suite (shared)**

`src/core/context-store/contract.ts`:
```typescript
import { expect, it } from "vitest";
import type { ContextChunk, ContextStore } from "./types";

function chunk(id: string, sourceId: string, text: string): ContextChunk {
  return {
    id,
    sourceId,
    text,
    source: {
      meetingTitle: "m",
      date: "2026-06-03T12:03:09.000Z",
      path: "/m.docx",
      chunkIndex: 0,
      speakers: ["A"],
      startTime: "0:00",
      endTime: "0:10",
    },
  };
}

// Runs the shared behavioral contract against any ContextStore factory.
export function runContextStoreContract(makeStore: () => Promise<ContextStore> | ContextStore) {
  it("returns the most similar chunk first", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "cat dog"), chunk("2", "s1", "invoice tax")]);
    const results = await store.search("animals cat", { topK: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("cat dog");
  });

  it("clears chunks by sourceId only", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "alpha"), chunk("2", "s2", "beta")]);
    await store.clear("s1");
    const results = await store.search("alpha beta", { topK: 5 });
    expect(results.map((r) => r.text)).toEqual(["beta"]);
  });

  it("upsert replaces a chunk with the same id", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "old")]);
    await store.upsert([chunk("1", "s1", "new")]);
    const results = await store.search("new", { topK: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("new");
  });
}
```

- [ ] **Step 2: Write `memory-store.test.ts` (fails: no implementation)**

```typescript
import { describe } from "vitest";
import { InMemoryStore } from "./memory-store";
import { runContextStoreContract } from "./contract";

// Deterministic fake embedder: bag-of-words vector over a fixed vocab.
const vocab = ["cat", "dog", "animals", "invoice", "tax", "alpha", "beta", "old", "new"];
const fakeEmbedder = {
  embed: async (texts: string[]) =>
    texts.map((t) => {
      const words = t.toLowerCase().split(/\s+/);
      return vocab.map((v) => (words.includes(v) ? 1 : 0));
    }),
};

describe("InMemoryStore", () => {
  runContextStoreContract(() => new InMemoryStore(fakeEmbedder));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/core/context-store/memory-store.test.ts`
Expected: FAIL with "Cannot find module './memory-store'".

- [ ] **Step 4: Implement `InMemoryStore`**

`src/core/context-store/memory-store.ts`:
```typescript
import type { ContextChunk, ContextStore, Embedder, RetrievedChunk } from "./types";

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class InMemoryStore implements ContextStore {
  private chunks = new Map<string, ContextChunk>();
  constructor(private embedder: Embedder) {}

  async upsert(chunks: ContextChunk[]): Promise<void> {
    const missing = chunks.filter((c) => !c.embedding);
    const vectors = missing.length ? await this.embedder.embed(missing.map((c) => c.text)) : [];
    missing.forEach((c, i) => { c.embedding = vectors[i]; });
    for (const c of chunks) this.chunks.set(c.id, c);
  }

  async search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]> {
    const [q] = await this.embedder.embed([query]);
    const topK = opts?.topK ?? 5;
    return [...this.chunks.values()]
      .map((c) => ({ text: c.text, score: cosine(q, c.embedding ?? []), source: c.source }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async clear(sourceId?: string): Promise<void> {
    if (!sourceId) { this.chunks.clear(); return; }
    for (const [id, c] of this.chunks) if (c.sourceId === sourceId) this.chunks.delete(id);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/core/context-store/memory-store.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/context-store/
git commit -m "feat: InMemoryStore + reusable ContextStore contract tests"
```

---

## Task 3: Loader types + Teams transcript parser (pure functions)

The parser is pure (string in → structured out), so it is fully TDD-able without docx I/O.

**Files:**
- Create: `src/core/loaders/types.ts`
- Create: `src/core/loaders/teams-parser.ts`
- Test: `src/core/loaders/teams-parser.test.ts`

- [ ] **Step 1: Write loader types**

`src/core/loaders/types.ts`:
```typescript
export interface TranscriptTurn {
  speaker: string;
  startSec: number;
  text: string;
}

export interface RawDocument {
  id: string;
  title: string;
  date?: string; // ISO
  content: string;
  turns: TranscriptTurn[];
  metadata: Record<string, unknown>;
}

export interface Loader {
  load(): Promise<RawDocument[]>;
}
```

- [ ] **Step 2: Write parser tests (fails)**

`src/core/loaders/teams-parser.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseTitle, parseDateFromTitle, timestampToSeconds, parseTurns } from "./teams-parser";

describe("parseTitle", () => {
  it("strips the UTC + Meeting Recording suffix", () => {
    expect(parseTitle("[Marca] - Validação.-20260603_120309UTC-Meeting Recording"))
      .toBe("[Marca] - Validação.");
  });
  it("returns the raw title when no suffix present", () => {
    expect(parseTitle("Reunião X")).toBe("Reunião X");
  });
});

describe("parseDateFromTitle", () => {
  it("parses the UTC timestamp into ISO", () => {
    expect(parseDateFromTitle("x-20260603_120309UTC-Meeting Recording"))
      .toBe("2026-06-03T12:03:09.000Z");
  });
  it("returns undefined when no timestamp", () => {
    expect(parseDateFromTitle("no timestamp here")).toBeUndefined();
  });
});

describe("timestampToSeconds", () => {
  it("parses mm:ss", () => { expect(timestampToSeconds("7:38")).toBe(458); });
  it("parses h:mm:ss", () => { expect(timestampToSeconds("1:02:05")).toBe(3725); });
});

describe("parseTurns", () => {
  const body = [
    "576072292608Júnio Inácio Rosa | OPTSOLV   0:09Bom dia, Bruno.Bom dia, pessoal.",
    "576072292608Bruno Francklin de Faria   0:17Bom dia, tudo bom?",
  ].join("\n");

  it("extracts speaker, seconds and text, discarding numeric prefix", () => {
    const turns = parseTurns(body);
    expect(turns).toEqual([
      { speaker: "Júnio Inácio Rosa | OPTSOLV", startSec: 9, text: "Bom dia, Bruno.Bom dia, pessoal." },
      { speaker: "Bruno Francklin de Faria", startSec: 17, text: "Bom dia, tudo bom?" },
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/core/loaders/teams-parser.test.ts`
Expected: FAIL with "Cannot find module './teams-parser'".

- [ ] **Step 4: Implement `teams-parser.ts`**

```typescript
const SUFFIX_RE = /-\d{8}_\d{6}UTC-Meeting Recording\s*$/;
const TIMESTAMP_IN_TITLE_RE = /-(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})UTC-/;
// numeric prefix? + speaker + 2+ spaces + timestamp + rest
const TURN_RE = /^(?:\d+)?\s*(.+?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)(.*)$/;

export function parseTitle(firstLine: string): string {
  return firstLine.replace(SUFFIX_RE, "");
}

export function parseDateFromTitle(firstLine: string): string | undefined {
  const m = firstLine.match(TIMESTAMP_IN_TITLE_RE);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

export function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function parseTurns(body: string): { speaker: string; startSec: number; text: string }[] {
  const turns: { speaker: string; startSec: number; text: string }[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(TURN_RE);
    if (!m) continue;
    const [, speaker, ts, text] = m;
    turns.push({ speaker: speaker.trim(), startSec: timestampToSeconds(ts), text: text.trim() });
  }
  return turns;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/core/loaders/teams-parser.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/loaders/
git commit -m "feat: Teams transcript parser (title/date/turns)"
```

---

## Task 4: TeamsTranscriptDocxLoader (docx I/O)

**Files:**
- Create: `src/core/loaders/teams-docx-loader.ts`
- Create: `test/fixtures/teams-sample.docx` (reduced from the real export — 2–3 turns)
- Test: `src/core/loaders/teams-docx-loader.test.ts`

- [ ] **Step 1: Create the fixture**

Build a small valid `.docx` from text using the docx-zip approach, or copy a trimmed real
export to `test/fixtures/teams-sample.docx`. Its first line must be
`Reunião Teste-20260603_120309UTC-Meeting Recording`, then a date line, a duration line,
then two turns like the real format.

Run (verify it exists):
```bash
ls test/fixtures/teams-sample.docx
```
Expected: file listed.

- [ ] **Step 2: Write loader test (fails)**

`src/core/loaders/teams-docx-loader.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { TeamsTranscriptDocxLoader } from "./teams-docx-loader";

describe("TeamsTranscriptDocxLoader", () => {
  it("loads a docx into a RawDocument with parsed turns", async () => {
    const dir = path.resolve(__dirname, "../../../test/fixtures");
    const loader = new TeamsTranscriptDocxLoader(dir);
    const docs = await loader.load();
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.title).toBe("Reunião Teste");
    expect(doc.date).toBe("2026-06-03T12:03:09.000Z");
    expect(doc.turns.length).toBeGreaterThanOrEqual(2);
    expect(doc.turns[0].speaker.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/core/loaders/teams-docx-loader.test.ts`
Expected: FAIL with "Cannot find module './teams-docx-loader'".

- [ ] **Step 4: Implement the loader**

```typescript
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import mammoth from "mammoth";
import type { Loader, RawDocument } from "./types";
import { parseTitle, parseDateFromTitle, parseTurns } from "./teams-parser";

export class TeamsTranscriptDocxLoader implements Loader {
  constructor(private dir: string) {}

  async load(): Promise<RawDocument[]> {
    const entries = await readdir(this.dir);
    const files = entries.filter((f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"));
    const docs: RawDocument[] = [];
    for (const file of files) {
      const full = path.join(this.dir, file);
      const buffer = await readFile(full);
      const { value: text } = await mammoth.extractRawText({ buffer });
      const lines = text.split("\n");
      const firstLine = lines[0] ?? "";
      const body = lines.slice(1).join("\n");
      docs.push({
        id: createHash("sha1").update(full).digest("hex"),
        title: parseTitle(firstLine),
        date: parseDateFromTitle(firstLine),
        content: text,
        turns: parseTurns(body),
        metadata: { path: full, fileName: file },
      });
    }
    return docs;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/core/loaders/teams-docx-loader.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/loaders/teams-docx-loader.ts test/fixtures/teams-sample.docx
git commit -m "feat: TeamsTranscriptDocxLoader (mammoth + dir scan)"
```

---

## Task 5: Transcript-aware chunking

**Files:**
- Create: `src/core/ingestion/chunk.ts`
- Test: `src/core/ingestion/chunk.test.ts`

Chunk groups consecutive turns until an approximate char budget is reached (never splits a
turn), with a 1-turn overlap. Output carries speakers + start/end timestamps for citations.

- [ ] **Step 1: Write chunk tests (fails)**

`src/core/ingestion/chunk.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { chunkDocument } from "./chunk";
import type { RawDocument } from "@/core/loaders/types";

const doc: RawDocument = {
  id: "doc1",
  title: "Reunião Teste",
  date: "2026-06-03T12:03:09.000Z",
  content: "",
  metadata: { path: "/m.docx" },
  turns: [
    { speaker: "A | X", startSec: 9, text: "a".repeat(300) },
    { speaker: "B", startSec: 17, text: "b".repeat(300) },
    { speaker: "A | X", startSec: 30, text: "c".repeat(300) },
  ],
};

describe("chunkDocument", () => {
  it("groups turns under the char budget into one chunk", () => {
    const chunks = chunkDocument(doc, { maxChars: 1000, overlapTurns: 0 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].source.speakers).toEqual(["A | X", "B"]);
    expect(chunks[0].source.startTime).toBe("0:09");
    expect(chunks[0].source.endTime).toBe("0:30");
  });

  it("splits into multiple chunks when budget is exceeded, never splitting a turn", () => {
    const chunks = chunkDocument(doc, { maxChars: 350, overlapTurns: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].text).toContain("a".repeat(300));
    expect(chunks.every((c) => c.id.startsWith("doc1:"))).toBe(true);
  });

  it("sets sequential chunkIndex and stable ids", () => {
    const chunks = chunkDocument(doc, { maxChars: 350, overlapTurns: 0 });
    expect(chunks[0].source.chunkIndex).toBe(0);
    expect(chunks[1].source.chunkIndex).toBe(1);
    expect(chunks[0].id).toBe("doc1:0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/core/ingestion/chunk.test.ts`
Expected: FAIL with "Cannot find module './chunk'".

- [ ] **Step 3: Implement `chunk.ts`**

```typescript
import type { ContextChunk } from "@/core/context-store/types";
import type { RawDocument, TranscriptTurn } from "@/core/loaders/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function turnText(t: TranscriptTurn): string {
  return `${t.speaker} (${fmt(t.startSec)}): ${t.text}`;
}

export interface ChunkOptions { maxChars?: number; overlapTurns?: number; }

export function chunkDocument(doc: RawDocument, opts: ChunkOptions = {}): ContextChunk[] {
  const maxChars = opts.maxChars ?? 2000;
  const overlap = opts.overlapTurns ?? 1;
  const chunks: ContextChunk[] = [];
  let group: TranscriptTurn[] = [];
  let size = 0;
  let index = 0;

  const flush = () => {
    if (group.length === 0) return;
    const speakers = [...new Set(group.map((t) => t.speaker))];
    chunks.push({
      id: `${doc.id}:${index}`,
      sourceId: doc.id,
      text: group.map(turnText).join("\n"),
      source: {
        meetingTitle: doc.title,
        date: doc.date ?? "",
        path: String(doc.metadata.path ?? ""),
        chunkIndex: index,
        speakers,
        startTime: fmt(group[0].startSec),
        endTime: fmt(group[group.length - 1].startSec),
      },
    });
    index++;
    group = overlap > 0 ? group.slice(-overlap) : [];
    size = group.reduce((acc, t) => acc + t.text.length, 0);
  };

  for (const turn of doc.turns) {
    if (size > 0 && size + turn.text.length > maxChars) flush();
    group.push(turn);
    size += turn.text.length;
  }
  flush();
  return chunks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/core/ingestion/chunk.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/ingestion/chunk.ts src/core/ingestion/chunk.test.ts
git commit -m "feat: transcript-aware chunking with speaker/time metadata"
```

---

## Task 6: OpenAI embedder

**Files:**
- Create: `src/core/ingestion/embed.ts`
- Test: `src/core/ingestion/embed.test.ts`

- [ ] **Step 1: Write embedder test (fails)** — inject a fake OpenAI client.

`src/core/ingestion/embed.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { OpenAIEmbedder } from "./embed";

describe("OpenAIEmbedder", () => {
  it("maps texts to vectors via the embeddings API", async () => {
    const create = vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2] }, { embedding: [3, 4] }] });
    const fakeClient = { embeddings: { create } } as never;
    const embedder = new OpenAIEmbedder(fakeClient, "text-embedding-3-small");
    const vectors = await embedder.embed(["a", "b"]);
    expect(vectors).toEqual([[1, 2], [3, 4]]);
    expect(create).toHaveBeenCalledWith({ model: "text-embedding-3-small", input: ["a", "b"] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/core/ingestion/embed.test.ts`
Expected: FAIL "Cannot find module './embed'".

- [ ] **Step 3: Implement `embed.ts`**

```typescript
import type OpenAI from "openai";
import type { Embedder } from "@/core/context-store/types";

export class OpenAIEmbedder implements Embedder {
  constructor(private client: OpenAI, private model: string) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await this.client.embeddings.create({ model: this.model, input: texts });
    return res.data.map((d) => d.embedding as number[]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/core/ingestion/embed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/ingestion/embed.ts src/core/ingestion/embed.test.ts
git commit -m "feat: OpenAI embedder"
```

---

## Task 7: DB schema + Neon client + migration

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`, `scripts/migrate.ts`

- [ ] **Step 1: Write `schema.ts`**

```typescript
import { pgTable, text, timestamp, integer, jsonb, vector, index } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }),
  path: text("path").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  source: jsonb("source").notNull(),
}, (t) => ({
  embIdx: index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
}));

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Nova conversa"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Write `client.ts`**

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Write `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Write `scripts/migrate.ts`**

```typescript
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  // drizzle-kit migrations applied via `drizzle-kit migrate` in CI/local after this.
  console.log("pgvector extension ensured.");
}
main();
```

- [ ] **Step 5: Generate migration**

Run: `pnpm db:generate`
Expected: SQL file created under `src/db/migrations/`. Open it and confirm it includes the
`vector` column and `hnsw` index. If drizzle-kit emits the extension separately, ensure
`CREATE EXTENSION IF NOT EXISTS vector;` is the first statement (add it by hand if missing).

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db/ drizzle.config.ts scripts/migrate.ts
git commit -m "feat: drizzle schema (neon + pgvector) + migration"
```

---

## Task 8: PgVectorStore

**Files:**
- Create: `src/core/context-store/pgvector-store.ts`

Note: behavioral correctness is covered by the contract suite in integration (needs a real
Neon DB). For the unit pass, we keep it typecheck-clean and rely on the contract suite when
`DATABASE_URL` is available.

- [ ] **Step 1: Implement `pgvector-store.ts`**

```typescript
import { sql, inArray, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks } from "@/db/schema";
import type { ContextChunk, ContextStore, Embedder, RetrievedChunk, ChunkSource } from "./types";

export class PgVectorStore implements ContextStore {
  constructor(private embedder: Embedder) {}

  async upsert(items: ContextChunk[]): Promise<void> {
    const missing = items.filter((c) => !c.embedding);
    if (missing.length) {
      const vectors = await this.embedder.embed(missing.map((c) => c.text));
      missing.forEach((c, i) => { c.embedding = vectors[i]; });
    }
    for (const c of items) {
      await db.insert(chunks).values({
        id: c.id,
        documentId: c.sourceId,
        chunkIndex: c.source.chunkIndex,
        text: c.text,
        embedding: c.embedding!,
        source: c.source,
      }).onConflictDoUpdate({
        target: chunks.id,
        set: { text: c.text, embedding: c.embedding!, source: c.source, chunkIndex: c.source.chunkIndex },
      });
    }
  }

  async search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]> {
    const [q] = await this.embedder.embed([query]);
    const topK = opts?.topK ?? 5;
    const distance = sql<number>`${chunks.embedding} <=> ${JSON.stringify(q)}`;
    const rows = await db.select({ text: chunks.text, source: chunks.source, distance })
      .from(chunks).orderBy(distance).limit(topK);
    return rows.map((r) => ({ text: r.text, score: 1 - Number(r.distance), source: r.source as ChunkSource }));
  }

  async clear(sourceId?: string): Promise<void> {
    if (!sourceId) { await db.delete(chunks); return; }
    await db.delete(chunks).where(eq(chunks.documentId, sourceId));
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/core/context-store/pgvector-store.ts
git commit -m "feat: PgVectorStore adapter"
```

---

## Task 9: Config + factory + ingestion pipeline + CLI

**Files:**
- Create: `src/config/app.config.ts`, `src/core/context-store/factory.ts`, `src/core/ingestion/pipeline.ts`, `scripts/ingest.ts`

- [ ] **Step 1: Write `app.config.ts`**

```typescript
export const appConfig = {
  brand: { name: "Marca Ambiental", logo: "/logo.svg", accent: "#16a34a" },
  dataSource: { type: "teams-docx" as const, transcriptsDir: process.env.TRANSCRIPTS_DIR ?? "" },
  contextStore: { provider: "pgvector" as const },
  llm: { model: "gpt-4.1-mini", embeddingModel: "text-embedding-3-small" },
  systemPrompt:
    "Você é o assistente da Marca Ambiental. Responda APENAS com base nos trechos de " +
    "reuniões recuperados pela ferramenta searchMeetings. SEMPRE cite a reunião e a data " +
    "(e o falante e o instante quando ajudar). Se não houver base suficiente nos trechos, " +
    "diga claramente que não encontrou essa informação nas reuniões.",
  suggestedQuestions: [
    "Quais decisões foram tomadas na última reunião?",
    "O que ficou definido sobre o fluxo do transportador?",
  ],
};
export type AppConfig = typeof appConfig;
```

- [ ] **Step 2: Write `factory.ts`**

```typescript
import OpenAI from "openai";
import { appConfig } from "@/config/app.config";
import { OpenAIEmbedder } from "@/core/ingestion/embed";
import { PgVectorStore } from "./pgvector-store";
import type { ContextStore } from "./types";

export function createContextStore(): ContextStore {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedder = new OpenAIEmbedder(client, appConfig.llm.embeddingModel);
  // provider switch: add "graphify" / "memory" here as adapters land.
  return new PgVectorStore(embedder);
}
```

- [ ] **Step 3: Write `pipeline.ts`**

```typescript
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { sql } from "drizzle-orm";
import { TeamsTranscriptDocxLoader } from "@/core/loaders/teams-docx-loader";
import { chunkDocument } from "./chunk";
import { createContextStore } from "@/core/context-store/factory";
import { appConfig } from "@/config/app.config";

export async function runIngestion(): Promise<{ documents: number; chunks: number }> {
  const loader = new TeamsTranscriptDocxLoader(appConfig.dataSource.transcriptsDir);
  const store = createContextStore();
  const docs = await loader.load();
  let chunkCount = 0;
  for (const doc of docs) {
    await store.clear(doc.id); // idempotent reindex
    const chunks = chunkDocument(doc);
    await store.upsert(chunks);
    chunkCount += chunks.length;
    await db.insert(documents).values({
      id: doc.id, title: doc.title, date: doc.date ? new Date(doc.date) : null,
      path: String(doc.metadata.path ?? ""), metadata: doc.metadata,
    }).onConflictDoUpdate({
      target: documents.id,
      set: { title: doc.title, indexedAt: sql`now()`, metadata: doc.metadata },
    });
  }
  return { documents: docs.length, chunks: chunkCount };
}
```

- [ ] **Step 4: Write `scripts/ingest.ts`**

```typescript
import "dotenv/config";
import { runIngestion } from "@/core/ingestion/pipeline";

runIngestion()
  .then((r) => { console.log(`Indexado: ${r.documents} documentos, ${r.chunks} chunks.`); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
```

Run: `pnpm add -D dotenv` (for the CLI to read `.env`).

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/ src/core/context-store/factory.ts src/core/ingestion/pipeline.ts scripts/ingest.ts package.json
git commit -m "feat: config, store factory, ingestion pipeline + CLI"
```

---

## Task 10: searchMeetings action + prompt + CopilotRuntime route

**Files:**
- Create: `src/core/rag/prompt.ts`, `src/core/rag/search-meetings.ts`, `src/app/api/copilotkit/route.ts`
- Test: `src/core/rag/search-meetings.test.ts`

- [ ] **Step 1: Write `prompt.ts`**

```typescript
import { appConfig } from "@/config/app.config";
export function systemPrompt(): string { return appConfig.systemPrompt; }
```

- [ ] **Step 2: Write search-meetings test (fails)**

`src/core/rag/search-meetings.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { searchMeetings } from "./search-meetings";
import { InMemoryStore } from "@/core/context-store/memory-store";

const vocab = ["coleta", "transportador", "boleto"];
const fakeEmbedder = {
  embed: async (texts: string[]) =>
    texts.map((t) => vocab.map((v) => (t.toLowerCase().includes(v) ? 1 : 0))),
};

describe("searchMeetings", () => {
  it("returns formatted results with citations", async () => {
    const store = new InMemoryStore(fakeEmbedder);
    await store.upsert([{
      id: "1", sourceId: "s1", text: "fluxo do transportador definido",
      source: { meetingTitle: "Reunião A", date: "2026-06-03T12:03:09.000Z", path: "/a.docx",
        chunkIndex: 0, speakers: ["Bruno"], startTime: "7:38", endTime: "8:00" },
    }]);
    const res = await searchMeetings(store, { query: "transportador", topK: 3 });
    expect(res.results).toHaveLength(1);
    expect(res.results[0].citation.meetingTitle).toBe("Reunião A");
    expect(res.results[0].text).toContain("transportador");
  });

  it("signals when nothing relevant is found", async () => {
    const store = new InMemoryStore(fakeEmbedder);
    const res = await searchMeetings(store, { query: "boleto", topK: 3 });
    expect(res.results).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/core/rag/search-meetings.test.ts`
Expected: FAIL "Cannot find module './search-meetings'".

- [ ] **Step 4: Implement `search-meetings.ts`**

```typescript
import type { ContextStore, ChunkSource } from "@/core/context-store/types";

export interface SearchArgs { query: string; topK?: number; }
export interface SearchResult { text: string; score: number; citation: ChunkSource; }
export interface SearchResponse { results: SearchResult[]; }

const MIN_SCORE = 0.01;

export async function searchMeetings(store: ContextStore, args: SearchArgs): Promise<SearchResponse> {
  const hits = await store.search(args.query, { topK: args.topK ?? 5 });
  const results = hits
    .filter((h) => h.score > MIN_SCORE)
    .map((h) => ({ text: h.text, score: h.score, citation: h.source }));
  return { results };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/core/rag/search-meetings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Implement the CopilotRuntime route**

`src/app/api/copilotkit/route.ts`:
```typescript
import {
  CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { createContextStore } from "@/core/context-store/factory";
import { searchMeetings } from "@/core/rag/search-meetings";
import { systemPrompt } from "@/core/rag/prompt";
import { appConfig } from "@/config/app.config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai, model: appConfig.llm.model });
const store = createContextStore();

const runtime = new CopilotRuntime({
  actions: () => [
    {
      name: "searchMeetings",
      description: "Busca trechos relevantes nas transcrições de reuniões para fundamentar a resposta.",
      parameters: [
        { name: "query", type: "string", description: "A pergunta ou termos de busca", required: true },
        { name: "topK", type: "number", description: "Quantos trechos retornar", required: false },
      ],
      handler: async ({ query, topK }: { query: string; topK?: number }) =>
        searchMeetings(store, { query, topK }),
    },
  ],
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, serviceAdapter, endpoint: "/api/copilotkit",
    properties: { systemMessage: systemPrompt() },
  });
  return handleRequest(req);
};
```

NOTE: Before coding, confirm the current CopilotKit runtime action + `OpenAIAdapter`
signature via Context7 (`/copilotkit/copilotkit`), since the API evolves. Adjust the
`actions`/`properties` shape to the installed version if needed.

- [ ] **Step 7: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/rag/ src/app/api/copilotkit/route.ts
git commit -m "feat: searchMeetings action + CopilotRuntime route"
```

---

## Task 11: Chat UI + provider + citations

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(chat)/page.tsx`, `src/components/chat/ChatPanel.tsx`, `src/components/chat/CitationCard.tsx`

- [ ] **Step 1: Wrap app with CopilotKit provider in `layout.tsx`**

```tsx
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create `ChatPanel.tsx`**

```tsx
"use client";
import { CopilotChat } from "@copilotkit/react-ui";
import { appConfig } from "@/config/app.config";

export function ChatPanel() {
  return (
    <CopilotChat
      labels={{
        title: appConfig.brand.name,
        initial: "Pergunte sobre as reuniões da " + appConfig.brand.name + ".",
      }}
      className="h-full"
    />
  );
}
```

- [ ] **Step 3: Create the chat page `src/app/(chat)/page.tsx`**

```tsx
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-screen max-w-3xl flex-col p-4">
      <ChatPanel />
    </main>
  );
}
```

- [ ] **Step 4: Verify it runs end-to-end (manual)**

Run: `pnpm dev` (with `OPENAI_API_KEY`, `DATABASE_URL`, `TRANSCRIPTS_DIR` set, after
`pnpm db:migrate`, `pnpm db:generate` applied, and `pnpm ingest` run once).
Expected: chat loads; asking "o que ficou definido sobre o transportador?" triggers
`searchMeetings` and the answer cites a meeting/date. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx "src/app/(chat)/page.tsx" src/components/chat/
git commit -m "feat: chat UI with CopilotKit provider"
```

NOTE: Visual polish (Linear/Vercel/Stripe aesthetic with Motion/GSAP) is done in Task 13
via the frontend-design skill. `CitationCard.tsx` is wired there once the generative-UI
render hook for the action is confirmed against the installed CopilotKit version.

---

## Task 12: Sources management UI + ingestion API

**Files:**
- Create: `src/app/api/ingest/route.ts`, `src/app/sources/page.tsx`, `src/components/sources/SourcesTable.tsx`

- [ ] **Step 1: Create `api/ingest/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { runIngestion } from "@/core/ingestion/pipeline";

export async function GET() {
  const rows = await db.select().from(documents).orderBy(desc(documents.indexedAt));
  return NextResponse.json({ documents: rows });
}

export async function POST() {
  const result = await runIngestion();
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Create `SourcesTable.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

interface DocRow { id: string; title: string; date: string | null; indexedAt: string; }

export function SourcesTable() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/ingest");
    const data = await res.json();
    setDocs(data.documents);
  };
  useEffect(() => { void load(); }, []);

  const reindex = async () => {
    setBusy(true);
    await fetch("/api/ingest", { method: "POST" });
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={reindex} disabled={busy}
        className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Indexando..." : "Reindexar transcrições"}
      </button>
      <ul className="divide-y rounded-md border">
        {docs.map((d) => (
          <li key={d.id} className="flex justify-between p-3 text-sm">
            <span className="font-medium">{d.title}</span>
            <span className="text-muted-foreground">{d.date?.slice(0, 10) ?? "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/sources/page.tsx`**

```tsx
import { SourcesTable } from "@/components/sources/SourcesTable";

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Fontes indexadas</h1>
      <SourcesTable />
    </main>
  );
}
```

- [ ] **Step 4: Typecheck + manual check**

Run: `pnpm exec tsc --noEmit` (PASS), then `pnpm dev` and open `/sources`; click reindex,
confirm the list populates from the DB.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ingest/ src/app/sources/ src/components/sources/
git commit -m "feat: sources management UI + ingestion API"
```

---

## Task 13: Conversation persistence

**Files:**
- Create: `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/messages/route.ts`
- Modify: `src/components/chat/ChatPanel.tsx` (persist via CopilotKit message hooks)

- [ ] **Step 1: Create conversations API**

`src/app/api/conversations/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  return NextResponse.json({ conversations: rows });
}
export async function POST() {
  const id = randomUUID();
  await db.insert(conversations).values({ id });
  return NextResponse.json({ id });
}
```

- [ ] **Step 2: Create messages API**

`src/app/api/conversations/[id]/messages/route.ts`:
```typescript
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(messages)
    .where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { role: string; content: string; citations?: unknown };
  const msgId = randomUUID();
  await db.insert(messages).values({
    id: msgId, conversationId: id, role: body.role, content: body.content,
    citations: body.citations ?? [],
  });
  return NextResponse.json({ id: msgId });
}
```

- [ ] **Step 3: Persist messages from `ChatPanel`**

Add the CopilotKit message-change hook to POST each new user/assistant message to
`/api/conversations/{id}/messages`. Confirm the exact hook name
(`useCopilotChat` / `onMessagesChange`) against the installed CopilotKit version via
Context7 before wiring; persist `role`, `content`, and any `citations` from the
`searchMeetings` action result.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { appConfig } from "@/config/app.config";

export function ChatPanel() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    void fetch("/api/conversations", { method: "POST" })
      .then((r) => r.json())
      .then((d: { id: string }) => setConversationId(d.id));
  }, []);

  // persistMessage(role, content, citations) -> POST /api/conversations/{conversationId}/messages
  return (
    <CopilotChat
      labels={{ title: appConfig.brand.name, initial: `Pergunte sobre as reuniões da ${appConfig.brand.name}.` }}
      className="h-full"
    />
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/conversations/ src/components/chat/ChatPanel.tsx
git commit -m "feat: conversation + message persistence"
```

---

## Task 14: Visual design pass (Linear/Vercel/Stripe aesthetic)

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, chat + sources components
- Create: `src/components/chat/CitationCard.tsx`, shared layout/nav components

- [ ] **Step 1: Invoke the frontend-design skill**

Use the `frontend-design` skill to design a distinctive dark, professional UI: refined
typography scale, restrained Motion microinteractions, a GSAP hero/transition accent, a
two-pane layout (nav + chat), and `CitationCard` rendering the `searchMeetings` citations
(meeting title, date, speaker, mm:ss). Keep shadcn primitives as the base. Respect
`prefers-reduced-motion`.

- [ ] **Step 2: Wire `CitationCard` to the action's generative UI**

Render the citations returned by `searchMeetings` beneath assistant answers, using the
CopilotKit render hook for the action (confirm the API — `useCopilotAction` `render` — via
Context7 for the installed version).

- [ ] **Step 3: Manual visual check at 375px and 1440px**

Run: `pnpm dev`. Confirm layout, animations, and citations look polished and responsive.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: professional UI pass + citation cards"
```

---

## Task 15: Replication README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the replication guide**

Document: prerequisites, `.env` setup, creating a Neon DB + enabling pgvector,
`pnpm db:generate && pnpm db:migrate`, placing `.docx` transcripts in `TRANSCRIPTS_DIR`,
`pnpm ingest`, `pnpm dev`. Then a "Replicate for another client" section: copy repo, edit
`src/config/app.config.ts` (brand, systemPrompt, suggestedQuestions), point `TRANSCRIPTS_DIR`
at the new data, redeploy. Add a "Swap the context provider" note describing how to add a
`graphify`/`memory` adapter behind `ContextStore` and the `factory.ts` switch.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: replication + provider-swap guide"
```

---

## Self-Review notes

- **Spec coverage:** template/config-driven (T9, T15), ContextStore abstraction (T1–T2, T8),
  Loader abstraction (T3–T4), transcript-aware chunking (T5), embeddings (T6), Neon+pgvector
  +drizzle (T7), agentic searchMeetings + runtime (T10), chat UI (T11), sources/ingestion UI
  (T12), conversation persistence (T13), citations + aesthetic (T14). All spec sections map
  to a task.
- **Type consistency:** `ContextStore`/`Embedder`/`ChunkSource` defined in T1 are used
  unchanged through T2, T5, T8, T10. `RawDocument.turns` (T3) feeds `chunkDocument` (T5).
- **Known external-API checks:** CopilotKit runtime/action and render-hook signatures must
  be confirmed via Context7 against the installed version at T10/T13/T14 (flagged inline).
```
