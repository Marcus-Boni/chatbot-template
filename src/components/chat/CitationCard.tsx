"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock, Users, FileText } from "lucide-react";
import type { ChunkSource } from "@/core/context-store/types";
import { cn } from "@/lib/utils";

export interface CitationCardProps {
  citation: ChunkSource;
  /** The retrieved chunk text — shown as a short grounding snippet. */
  text?: string;
  /** Similarity score (0–1), shown as a subtle relevance chip. */
  score?: number;
  /** Stagger index for entrance animation. */
  index?: number;
}

/** Format an ISO date to a readable PT-BR date (e.g. "12 de mar. de 2025"). */
function formatDate(iso: string): string {
  if (!iso) return "Data desconhecida";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function truncate(text: string, max = 220): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean;
}

export function CitationCard({
  citation,
  text,
  score,
  index = 0,
}: CitationCardProps) {
  const reduce = useReducedMotion();
  const speakers = citation.speakers?.filter(Boolean) ?? [];
  const speakerLabel =
    speakers.length === 0
      ? null
      : speakers.length <= 2
        ? speakers.join(" · ")
        : `${speakers[0]} +${speakers.length - 1}`;

  const range =
    citation.startTime && citation.endTime
      ? `${citation.startTime}–${citation.endTime}`
      : citation.startTime || null;

  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-[var(--line)]",
        "bg-[var(--panel)] p-3.5 transition-colors duration-200",
        "hover:border-[var(--accent-line)]",
      )}
    >
      {/* Accent rail */}
      <span className="absolute inset-y-0 left-0 w-[2px] bg-[var(--accent)]/40 transition-colors group-hover:bg-[var(--accent-bright)]" />

      <figcaption className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-bright)]">
            <FileText className="h-[15px] w-[15px]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--fg)]">
              {citation.meetingTitle || "Reunião sem título"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.68rem] text-[var(--fg-subtle)]">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
                {formatDate(citation.date)}
              </span>
              {range && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" strokeWidth={1.8} />
                  {range}
                </span>
              )}
              {speakerLabel && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" strokeWidth={1.8} />
                  {speakerLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {typeof score === "number" && (
          <span
            className="shrink-0 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[0.62rem] text-[var(--accent-bright)]"
            title="Relevância"
          >
            {Math.round(Math.max(0, Math.min(1, score)) * 100)}%
          </span>
        )}
      </figcaption>

      {text && (
        <blockquote className="mt-3 border-l border-[var(--line-strong)] pl-3 text-[0.8rem] leading-relaxed text-[var(--fg-muted)]">
          {truncate(text)}
        </blockquote>
      )}
    </motion.figure>
  );
}
