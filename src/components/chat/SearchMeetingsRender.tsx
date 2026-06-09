"use client";

import { useCopilotAction } from "@copilotkit/react-core";
import { Loader2, Search, SearchX } from "lucide-react";
import type { SearchResponse } from "@/core/rag/search-meetings";
import { CitationCard } from "./CitationCard";

/**
 * Generative-UI wiring for the backend `searchMeetings` RAG action.
 *
 * CopilotKit pattern (verified against the installed @copilotkit/react-core
 * 1.59.5 type defs):
 *
 *   declare function useCopilotAction<const T extends Parameter[] | [] = []>(
 *     action: FrontendAction<T> | CatchAllFrontendAction,
 *     dependencies?: any[],
 *   ): void;                                  // index.d.mts:341
 *
 *   type FrontendAction<T> = Action<T> & {
 *     ...
 *     available?: "disabled" | "enabled" | "remote" | "frontend";
 *     render?: string | ((props: ActionRenderProps<T>) => string | ReactElement);
 *     handler?: never;   // (when render-only — the union branch without a handler)
 *   };                                        // copilotkit-DqDT5RLa.d.mts:104-122
 *
 *   type ActionRenderProps<T> =
 *       { status: "inProgress"; args: Partial<...>; result: undefined }
 *     | { status: "executing";  args: ...;          result: undefined }
 *     | { status: "complete";   args: ...;          result: any };
 *                                              // copilotkit-DqDT5RLa.d.mts:15-92
 *
 * A FRONTEND action whose `name` matches a BACKEND action is the standard way to
 * render generative UI for that backend tool: we declare the same `name` +
 * `parameters`, omit `handler` (the backend keeps executing it), set
 * `available: "frontend"` so it is render-only, and supply `render`. The render
 * callback receives `{ status, args, result }`; on "complete", `result` is the
 * backend payload (typed `any` in the defs) — we narrow it to `SearchResponse`.
 */
export function SearchMeetingsRender() {
  useCopilotAction({
    name: "searchMeetings",
    // Render-only on the client; the backend `searchMeetings` handler (see
    // src/app/api/copilotkit/route.ts) still does the actual retrieval.
    available: "frontend",
    description:
      "Mostra as citações das reuniões usadas para fundamentar a resposta.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "A pergunta ou termos de busca",
        required: true,
      },
      {
        name: "topK",
        type: "number",
        description: "Quantos trechos retornar",
        required: false,
      },
    ],
    render: ({ status, result }) => {
      if (status === "inProgress" || status === "executing") {
        return (
          <div className="my-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--fg-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-bright)]" />
            Buscando nas transcrições das reuniões…
          </div>
        );
      }

      // status === "complete": result is the backend payload (typed `any`).
      const payload = result as SearchResponse | undefined;
      const results = payload?.results ?? [];

      if (results.length === 0) {
        return (
          <div className="my-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--fg-muted)]">
            <SearchX className="h-3.5 w-3.5 text-[var(--fg-subtle)]" />
            Nenhum trecho relevante encontrado nas reuniões.
          </div>
        );
      }

      return (
        <section className="my-3 space-y-2.5" aria-label="Citações das reuniões">
          <header className="flex items-center gap-2 px-0.5">
            <Search className="h-3.5 w-3.5 text-[var(--accent-bright)]" strokeWidth={2} />
            <h3 className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              {results.length === 1
                ? "1 trecho citado"
                : `${results.length} trechos citados`}
            </h3>
          </header>
          <div className="space-y-2.5">
            {results.map((r, i) => (
              <CitationCard
                key={`${r.citation.path}-${r.citation.chunkIndex}-${i}`}
                citation={r.citation}
                text={r.text}
                score={r.score}
                index={i}
              />
            ))}
          </div>
        </section>
      );
    },
  });

  return null;
}
