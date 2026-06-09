# Meeting Copilot — Template de Chatbot com Contexto de Reuniões

> Documento de design (spec). Data: 2026-06-07.
> Primeiro caso de uso validador: **Marca Ambiental** (transcrições de reuniões do Teams em `.docx`).

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

1. Indexar as transcrições `.docx` (export do Teams) e responder corretamente sobre elas.
2. Respostas **sempre com citação** da reunião/data — e, quando útil, do falante e do
   instante (mm:ss). Sem base recuperada, o bot admite que não encontrou (não alucina).
3. Replicar para outro caso de uso = copiar o repo e editar **um arquivo de config**.

Não-objetivos (v1):

- Autenticação/login (plugável depois).
- Multi-tenant em uma única instância (modelo escolhido é **uma instância por cliente**).
- Edição de transcrições dentro do app.

---

## 2. Decisões de produto (fechadas no brainstorming)

| Tema | Decisão |
| --- | --- |
| Entregável | Template replicável primeiro; Marca valida |
| Camada de contexto | Abstração plugável multi-provider (`ContextStore`) |
| Fonte de dados | Pasta local de `.docx` (transcrições do Teams), lida por um `Loader` plugável |
| Chat | CopilotKit na frente; OpenAI (Vercel AI / OpenAIAdapter) no motor |
| Replicação | Uma instância por cliente, config-driven (sem multi-tenant no banco) |
| Escopo v1 | Persistência de conversas + tela de gestão/ingestão + citações |
| Banco / Vector store v1 | **Neon (Postgres serverless) + pgvector**, via drizzle-orm |
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
- **Neon (Postgres serverless) + pgvector + drizzle-orm** (`@neondatabase/serverless`)
- `mammoth` (extração de texto de `.docx`), `tsx` (script de ingestão)
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
│   • TeamsTranscriptDocxLoader (mammoth + parser de turnos)│
├─────────────────────────────────────────────────────────┤
│  Neon/Postgres (Drizzle): chunks+vector, documents, conv. │
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
  date: string;              // ISO; derivado do timestamp UTC do título
  path: string;
  chunkIndex: number;
  speakers: string[];        // falantes presentes no trecho
  startTime: string;         // mm:ss do primeiro turno do chunk
  endTime: string;           // mm:ss do último turno do chunk
}

interface Loader {
  load(): Promise<RawDocument[]>;
}

interface TranscriptTurn {
  speaker: string;           // ex.: "Marcus Evandro Galvão Boni | OPTSOLV"
  startSec: number;          // segundos desde o início (de "mm:ss"/"h:mm:ss")
  text: string;
}

interface RawDocument {
  id: string;                // estável por arquivo (hash do path)
  title: string;             // título limpo (sufixo UTC/Meeting Recording removido)
  date?: string;             // ISO, do timestamp UTC do título
  content: string;           // texto completo (fallback)
  turns: TranscriptTurn[];   // estrutura de falas
  metadata: Record<string, unknown>;
}
```

Implementações v1: `PgVectorStore`, `TeamsTranscriptDocxLoader`.
Stubs/segundo passo: `GraphifyStore`, `InMemoryStore`.

### Parsing do `.docx` (formato Teams confirmado em arquivo real)

- Extração de texto via `mammoth`.
- **Título:** primeira linha; remover sufixo `-<YYYYMMDD>_<HHMMSS>UTC-Meeting Recording`.
- **Data:** parsear do timestamp UTC do título (`20260603_120309UTC` → ISO). Mais
  confiável que a linha pt-BR ("3 de junho de 2026, 12:03PM"), que fica como fallback.
- **Turnos:** regex sobre cada bloco no padrão
  `(\d+)?\s*(<Nome do Falante>)\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(<fala>)`,
  capturando falante, timestamp e texto até o próximo turno. O prefixo numérico
  (ex.: `576072292608`) é descartado.

---

## 6. Fluxo RAG (agentic)

1. UI renderiza `<CopilotChat>`; runtime em `/api/copilotkit` com `OpenAIAdapter`.
2. Action **`searchMeetings(query, topK)`** registrada no runtime →
   `embed(query)` → `contextStore.search()` → retorna trechos + `source`.
3. System prompt (da config): "Responda **apenas** com base nos trechos recuperados.
   **Sempre cite** reunião e data (e falante/instante quando ajudar). Sem base
   suficiente, diga que não encontrou."
4. UI exibe as citações a partir dos `source` dos chunks usados.

Resultado: sem contexto recuperado, o bot admite que não sabe em vez de alucinar.

---

## 7. Ingestão e persistência

**Pipeline de ingestão** (`pnpm ingest`, via `tsx`):
`Loader.load()` → **chunking transcript-aware** → `embeddings OpenAI` →
`ContextStore.upsert()`. Idempotente por `sourceId` (reindexar limpa e regrava os
chunks daquele documento).

**Chunking transcript-aware:** agrupa turnos consecutivos até um limite de tokens
(~500), com overlap de 1–2 turnos, **sem quebrar no meio de uma fala**. Cada chunk
registra o conjunto de `speakers` e os timestamps de início/fim → alimenta as citações.

**Tela de gestão** (`/sources`): dispara a ingestão, lista fontes indexadas, contagem de
chunks, data da última indexação, botão "reindexar".

**Schema Postgres (Drizzle):**

- `documents` — id, title, date, path, metadata (jsonb), indexed_at
- `chunks` — id, document_id, chunk_index, text, embedding (`vector`), source (jsonb)
- `conversations` — id, title, created_at
- `messages` — id, conversation_id, role, content, citations (jsonb), created_at

Índice `hnsw` (ou `ivfflat`) na coluna `embedding` para busca por similaridade.

---

## 8. Config-driven (replicação)

`src/config/app.config.ts` por deploy:

```typescript
export const appConfig = {
  brand: { name: "Marca Ambiental", logo: "/logo.svg", accent: "#16a34a" },
  dataSource: { type: "teams-docx", transcriptsDir: process.env.TRANSCRIPTS_DIR! },
  contextStore: { provider: "pgvector" }, // "graphify" | "memory"
  llm: { model: "gpt-4.1-mini", embeddingModel: "text-embedding-3-small" },
  systemPrompt: "...", // identidade + regra de citação
  suggestedQuestions: ["Quais decisões foram tomadas na última reunião?", "..."],
};
```

Replicar para outro cliente = copiar o repo, trocar config + pasta de transcrições + `.env`.

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
│   ├── loaders/                 # interface + teams-docx (mammoth + parser)
│   ├── ingestion/               # chunk (transcript-aware), embed, pipeline
│   └── rag/                     # searchMeetings action, prompt builder
├── db/                          # drizzle schema + client (neon) + migrations
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
DATABASE_URL=            # Neon (Postgres) com pgvector habilitado
TRANSCRIPTS_DIR=         # pasta local com os .docx de transcrição
```

---

## 11. Testes (prioridade)

1. `TeamsTranscriptDocxLoader` — parse de título/data (do UTC), turnos (falante,
   timestamp, texto), descarte do prefixo numérico, casos de borda (linhas em branco,
   h:mm:ss vs mm:ss).
2. `chunking` transcript-aware — agrupa por turnos, respeita limite, overlap, registra
   speakers + start/end.
3. `InMemoryStore` — contrato de `ContextStore` (upsert/search/clear).
4. `searchMeetings` action — retorno de citações, caso "sem resultado".
5. Pipeline de ingestão — idempotência por `sourceId`.

A interface `ContextStore` ganha um **conjunto de testes de contrato** reutilizável,
rodado contra cada adapter (memory na CI; pgvector em integração).

Fixture de teste: um `.docx` reduzido derivado do export real do Teams.

---

## 12. Fases de implementação (alto nível)

1. Scaffold Next.js + Tailwind + shadcn + CopilotKit "hello world".
2. DB (Drizzle + Neon + pgvector) + schema + migrations.
3. Interfaces `ContextStore`/`Loader` + `InMemoryStore` + testes de contrato.
4. `TeamsTranscriptDocxLoader` (mammoth + parser de turnos) + testes.
5. Chunking transcript-aware + `PgVectorStore` + embeddings + pipeline de ingestão (CLI).
6. CopilotRuntime + action `searchMeetings` + system prompt + citações.
7. UI do chat (estética Linear/Vercel/Stripe via skill `frontend-design`).
8. Tela de gestão/ingestão + persistência de conversas.
9. Config-driven + README de replicação.
10. (Pós-v1) `GraphifyStore` como segundo adapter; auth opcional.

---

## 13. Riscos / incógnitas

- **Ruído de ASR**: a transcrição do Teams tem erros e fragmentos soltos (ex.: "If it.",
  "I don't know."). Impacta a qualidade do retrieval. Mitigações: chunking por turnos
  (preserva contexto da fala), `topK` generoso, e prompt que exige citação. Iterar com
  dados reais.
- **Graphify**: API/SDK ainda não validados; fica como segundo adapter, não bloqueia a v1.
- **CopilotKit v2 vs clássico**: confirmar na implementação a API estável de runtime +
  actions (docs via Context7) antes de codar a rota.
- **Variações de formato do export do Teams**: nomes de falante com `| EMPRESA`,
  timestamps `mm:ss` e `h:mm:ss`, falas multi-linha. O parser precisa tolerar essas
  variações; cobrir com testes.
