"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits a line into plain/matched segments for highlighting (case-insensitive). */
function highlight(line: string, query: string): React.ReactNode {
  if (!query) return line;
  const re = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const needle = query.toLowerCase();
  const parts = line.split(re).filter((p) => p !== "");
  let offset = 0;
  return parts.map((part) => {
    // Character offset within the line is a stable, unique key per segment.
    const key = offset;
    offset += part.length;
    return part.toLowerCase() === needle ? (
      <mark
        key={key}
        className="rounded-[3px] bg-emerald-400/30 px-0.5 font-medium text-[var(--fg)] ring-1 ring-emerald-400/40"
      >
        {part}
      </mark>
    ) : (
      <span key={key}>{part}</span>
    );
  });
}

interface Props {
  content: string;
}

export function TranscriptViewer({ content }: Props) {
  const [query, setQuery] = useState("");
  const [onlyMatches, setOnlyMatches] = useState(false);

  const lines = useMemo(() => content.split("\n"), [content]);

  const normalizedQuery = query.trim();

  const { visibleLines, matchCount } = useMemo(() => {
    if (!normalizedQuery) {
      return { visibleLines: lines.map((text, index) => ({ text, index })), matchCount: 0 };
    }
    const needle = normalizedQuery.toLowerCase();
    let count = 0;
    const matched: { text: string; index: number }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const occurrences = lines[i].toLowerCase().split(needle).length - 1;
      if (occurrences > 0) {
        count += occurrences;
        matched.push({ text: lines[i], index: i });
      } else if (!onlyMatches) {
        matched.push({ text: lines[i], index: i });
      }
    }
    return { visibleLines: matched, matchCount: count };
  }, [lines, normalizedQuery, onlyMatches]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search bar */}
      <div className="flex flex-col gap-2 border-b border-[var(--line)] px-5 py-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-muted)]"
            strokeWidth={1.8}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na transcrição…"
            className={cn(
              "w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] py-2 pl-9 pr-9 text-sm",
              "text-[var(--fg)] placeholder:text-[var(--fg-muted)]",
              "focus:border-[var(--accent-line)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--fg)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {normalizedQuery ? (
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="whitespace-nowrap text-xs text-[var(--fg-muted)]">
              {matchCount === 0
                ? "Nenhum resultado"
                : `${matchCount} ${matchCount === 1 ? "ocorrência" : "ocorrências"}`}
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-[var(--fg-muted)] select-none">
              <input
                type="checkbox"
                checked={onlyMatches}
                onChange={(e) => setOnlyMatches(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Só correspondências
            </label>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {normalizedQuery && matchCount === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--fg-muted)]">
            Nenhum trecho corresponde a{" "}
            <span className="text-[var(--fg)]">“{normalizedQuery}”</span>.
          </p>
        ) : (
          <div className="space-y-0.5 font-sans text-sm leading-relaxed text-[var(--fg)]">
            {visibleLines.map(({ text, index }) => (
              <p key={index} className="whitespace-pre-wrap break-words">
                {text ? highlight(text, normalizedQuery) : " "}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
