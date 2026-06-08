# Meeting Copilot — Template de Chatbot com Contexto de Reuniões

> Documento de design (spec). Data: 2026-06-07.
> Primeiro caso de uso validador: **Marca Ambiental** (reuniões via Obsidian).

---

## 1. Objetivo

Construir um **template replicável** de chatbot que responde perguntas com base no
conteúdo de transcrições de reuniões. O template é genérico desde o dia 1; a Marca
Ambiental é apenas o primeiro deploy que o valida.

Objetivos de aprendizado explícitos (tão importantes quanto o produto):

- Treinar **skills de armazenamento de contexto** (RAG vetorial, e depois knowledge
  graph estilo Graphify) atrás de uma interface comum.
- Treinar **CopilotKit** como camada de copiloto in-app.

Critérios de sucesso:

1. Indexar as transcrições `.md` de um vault Obsidian e responder corretamente sobre elas.
2. Respostas **sempre com citação** da reunião/data de origem; sem base recuperada, o bot
   admite que não encontrou (não alucina).
3. Replicar para outro caso de uso = copiar o repo e editar **um arquivo de config**.

Não-objetivos (v1):

- Autenticação/login (plugável depois).
- Multi-tenant em uma única instância (modelo escolhido é **uma instância por cliente**).
- Edição de transcrições dentro do app (Obsidian continua sendo a origem).

---

## 2. Decisões de produto (fechadas no brainstorming)

| Tema | Decisão |
| --- | --- |
| Entregável | Template replicável primeiro; Marca valida |
| Camada de contexto | Abstração plugável multi-provider (`ContextStore`) |
| Fonte de dados | Pasta local do vault Obsidian, lida por um `Loader` plugável |
| Chat | CopilotKit na frente; OpenAI (Vercel AI / OpenAIAdapter) no motor |
| Replicação | Uma instância por cliente, config-driven (sem multi-tenant no banco) |
| Escopo v1 | Persistência de conversas + tela de gestão/ingestão + citações |
| Vector store v1 | Postgres + pgvector (Neon/Vercel), via Drizzle |
| Estratégia RAG | Agentic (tool-calling): o modelo chama `searchMeetings()` |
| Local | `C:\Users\mgalv\Projetos-Programacao\Projetos-Treino\Marca-Chatbot` |

---

## 3. Stack

- Next.js (App Router) + React + TypeScript (strict)
- shadcn/ui + Tailwind CSS v4
- Framer Motion + GSAP (microinterações / estética Linear/Vercel/Stripe)
- CopilotKit (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`)
- Vercel AI SDK / `OpenAIAdapter` no runtime — OpenAI via API key
- OpenAI embeddings (`text-embedding-3-small` por padrão, configurável)
- Postgres + pgvector (Neon ou Vercel Postgres) + Drizzle ORM
- `gray-matter` (frontmatter Obsidian), `tsx` (script de ingestão)
- Vitest + Testing Library (testes)
- Deploy: Vercel

---

## 4. Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  UI (Next.js + shadcn + Tailwind + Motion/GSAP)          │
│   • CopilotChat (CopilotKit)                              │
│   • Tela de gestão de fontes/ingestão                     │
│   • Histórico de conversas                                │
├─────────────────────────────────────────────────────────┤
│  CopilotRuntime  (rota /api/copilotkit)                   │
│   • OpenAIAdapter (API key OpenAI)                        │
│   • action: searchMeetings(query) → retrieval + citações  │
├─────────────────────────────────────────────────────────┤
│  ContextStore  (INTERFACE plugável — o coração)           │
│   • PgVectorStore   (v1)                                   │
│   • GraphifyStore   (adapter futuro)                      │
│   • InMemoryStore   (testes)                               │
├─────────────────────────────────────────────────────────┤
│  Loader  (INTERFACE plugável)                             │
│   • ObsidianVaultLoader                                    │
├─────────────────────────────────────────────────────────┤
│  Postgres (Drizzle): chunks+vector, documents, conversas  │
└─────────────────────────────────────────────────────────┘
```

O valor do template está nas **duas interfaces** (`ContextStore`, `Loader`): trocar de
provider de memória ou de fonte de dados é trocar um adapter, sem tocar UI nem runtime.

---

## 5. Interfaces centrais

```typescript
interface ContextStore {
  upsert(chunks: ContextChunk[]): Promise<void>;
  search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]>;
  clear(sourceId?: string): Promise<void>;
}

interface ContextChunk {
  id: string;
  sourceId: string;          // id do documento de origem
  text: string;
  embedding?: number[];      // preenchido na ingestão
  source: ChunkSource;
}

interface RetrievedChunk {
  text: string;
  score: number;
  source: ChunkSource;
}

interface ChunkSource {
  meetingTitle: string;
  date: string;              // ISO; derivado do frontmatter ou nome do arquivo
  path: string;
  chunkIndex: number;
}

interface Loader {
  load(): Promise<RawDocument[]>;
}

interface RawDocument {
  id: string;
  title: string;
  date?: string;
  content: string;
  metadata: Record<string, unknown>; // frontmatter
}
```

Implementações v1: `PgVectorStore`, `ObsidianVaultLoader`.
Stubs/segundo passo: `GraphifyStore`, `InMemoryStore`.

---

## 6. Fluxo RAG (agentic)

1. UI renderiza `<CopilotChat>`; runtime em `/api/copilotkit` com `OpenAIAdapter`.
2. Action **`searchMeetings(query, topK)`** registrada no runtime →
   `embed(query)` → `contextStore.search()` → retorna trechos + `source`.
3. System prompt (da config): "Responda **apenas** com base nos trechos recuperados.
   **Sempre cite** reunião e data. Sem base suficiente, diga que não encontrou."
4. UI exibe as citações a partir dos `source` dos chunks usados.

Resultado: sem contexto recuperado, o bot admite que não sabe em vez de alucinar.

---

## 7. Ingestão e persistência

**Pipeline de ingestão** (`pnpm ingest`, via `tsx`):
`Loader.load()` → chunking (por headings + limite de tamanho com overlap) →
`embeddings OpenAI` → `ContextStore.upsert()`. Idempotente por `sourceId`
(reindexar limpa e regrava os chunks daquele documento).

**Tela de gestão** (`/sources`): dispara a ingestão, lista fontes indexadas, contagem de
chunks, data da última indexação, botão "reindexar".

**Schema Postgres (Drizzle):**

- `documents` — id, title, date, path, metadata (jsonb), indexed_at
- `chunks` — id, document_id, chunk_index, text, embedding (`vector`), source (jsonb)
- `conversations` — id, title, created_at
- `messages` — id, conversation_id, role, content, citations (jsonb), created_at

Índice `ivfflat`/`hnsw` na coluna `embedding` para busca por similaridade.

---

## 8. Config-driven (replicação)

`src/config/app.config.ts` por deploy:

```typescript
export const appConfig = {
  brand: { name: "Marca Ambiental", logo: "/logo.svg", accent: "#16a34a" },
  dataSource: { type: "obsidian", vaultPath: process.env.OBSIDIAN_VAULT_PATH! },
  contextStore: { provider: "pgvector" }, // "graphify" | "memory"
  llm: { model: "gpt-4.1-mini", embeddingModel: "text-embedding-3-small" },
  systemPrompt: "...", // identidade + regra de citação
  suggestedQuestions: ["Quais decisões foram tomadas na última reunião?", "..."],
};
```

Replicar para outro cliente = copiar o repo, trocar config + vault + `.env`.

---

## 9. Estrutura de pastas

```
src/
├── app/
│   ├── (chat)/page.tsx          # chat principal
│   ├── sources/page.tsx         # gestão/ingestão
│   └── api/copilotkit/route.ts  # CopilotRuntime + OpenAIAdapter
├── core/
│   ├── context-store/           # interface + pgvector + graphify + memory
│   ├── loaders/                 # interface + obsidian
│   ├── ingestion/               # chunk, embed, pipeline
│   └── rag/                     # searchMeetings action, prompt builder
├── db/                          # drizzle schema + client + migrations
├── components/                  # ui (shadcn), chat, sources, citations
└── config/app.config.ts
scripts/
└── ingest.ts
```

Limite ~150 linhas por arquivo; um arquivo por responsabilidade.

---

## 10. Variáveis de ambiente

```
OPENAI_API_KEY=
DATABASE_URL=            # Postgres com pgvector
OBSIDIAN_VAULT_PATH=     # caminho local do vault
```

---

## 11. Testes (prioridade)

1. `chunking` — divisão por headings + overlap, casos de borda.
2. `ObsidianVaultLoader` — parse de frontmatter, data via frontmatter/nome do arquivo.
3. `InMemoryStore` — contrato de `ContextStore` (upsert/search/clear).
4. `searchMeetings` action — retorno de citações, caso "sem resultado".
5. Pipeline de ingestão — idempotência por `sourceId`.

A interface `ContextStore` ganha um **conjunto de testes de contrato** reutilizável,
rodado contra cada adapter (memory na CI; pgvector em integração).

---

## 12. Fases de implementação (alto nível)

1. Scaffold Next.js + Tailwind + shadcn + CopilotKit "hello world".
2. DB (Drizzle + pgvector) + schema + migrations.
3. Interfaces `ContextStore`/`Loader` + `InMemoryStore` + testes de contrato.
4. `ObsidianVaultLoader` + chunking + testes.
5. `PgVectorStore` + embeddings + pipeline de ingestão (CLI).
6. CopilotRuntime + action `searchMeetings` + system prompt + citações.
7. UI do chat (estética Linear/Vercel/Stripe via skill `frontend-design`).
8. Tela de gestão/ingestão + persistência de conversas.
9. Config-driven + README de replicação.
10. (Pós-v1) `GraphifyStore` como segundo adapter; auth opcional.

---

## 13. Riscos / incógnitas

- **Graphify**: API/SDK ainda não validados; fica como segundo adapter, não bloqueia a v1.
- **CopilotKit v2 vs clássico**: confirmar na implementação a API estável de runtime +
  actions (docs via Context7) antes de codar a rota.
- **Qualidade do chunking** impacta diretamente "responder corretamente" — iterar com
  dados reais da Marca.
- **Formato das transcrições no Obsidian** (frontmatter, data no nome) precisa ser
  inspecionado em um arquivo real antes de fixar o parser.
