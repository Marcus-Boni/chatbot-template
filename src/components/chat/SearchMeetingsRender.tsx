"use client";

import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { Loader2, Search, SearchX } from "lucide-react";
import type { SearchResponse } from "@/core/rag/search-meetings";
import { CitationCard } from "./CitationCard";

/**
 * Generative-UI wiring for the backend `searchMeetings` RAG action.
 *
 * Uses `useRenderTool` from `@copilotkit/react-core/v2` — the correct v2 hook
 * for attaching a render function to a backend tool call without re-declaring
 * it as a frontend action.
 *
 * IMPORTANT: in the v2 API, `result` inside the render callback is always a
 * JSON string (RenderToolCompleteProps.result: string). We must JSON.parse it
 * to recover the SearchResponse object returned by the backend handler.
 */
export function SearchMeetingsRender() {
  useRenderTool({
    name: "searchMeetings",
    parameters: z.object({
      query: z.string(),
      topK: z.number().optional(),
    }),
    render: ({ status, result }) => {
      if (status === "inProgress" || status === "executing") {
        return (
          <div className="my-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--fg-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-bright)]" />
            Buscando nas transcrições das reuniões…
          </div>
        );
      }

      // status === "complete": result is a JSON string — parse it.
      let payload: SearchResponse | undefined;
      try {
        payload = typeof result === "string" ? JSON.parse(result) : result;
      } catch {
        payload = undefined;
      }
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
