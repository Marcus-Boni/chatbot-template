"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, FileText, Database, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocRow {
  id: string;
  title: string;
  date: string | null;
  indexedAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function SourcesTable() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const reduce = useReducedMotion();

  const load = async () => {
    const res = await fetch("/api/ingest");
    const data = await res.json();
    setDocs(data.documents);
  };

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reindex = async () => {
    setBusy(true);
    await fetch("/api/ingest", { method: "POST" });
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 text-sm text-[var(--fg-muted)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bright)]">
            <Database className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span>
            <span className="font-mono text-[var(--fg)]">{docs.length}</span>{" "}
            {docs.length === 1 ? "documento indexado" : "documentos indexados"}
          </span>
        </div>
        <button
          type="button"
          onClick={reindex}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            "bg-[var(--accent)] text-[#04130a] shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset]",
            "transition-all duration-200 hover:bg-[var(--accent-bright)] disabled:opacity-60",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} strokeWidth={2} />
          {busy ? "Indexando…" : "Reindexar transcrições"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[58px] animate-pulse rounded-xl border border-[var(--line)] bg-[var(--panel)]"
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--panel)] px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-bright)]">
            <Inbox className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--fg)]">
            Nenhuma fonte indexada ainda
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
            Coloque as transcrições no diretório configurado e clique em
            <span className="text-[var(--fg)]"> Reindexar transcrições</span> para
            torná-las pesquisáveis pelo copilot.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          {docs.map((d, i) => (
            <motion.li
              key={d.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.04 }}
              className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  className="h-4 w-4 shrink-0 text-[var(--fg-subtle)]"
                  strokeWidth={1.8}
                />
                <span className="truncate text-sm font-medium text-[var(--fg)]">
                  {d.title}
                </span>
              </div>
              <time className="shrink-0 font-mono text-xs text-[var(--fg-subtle)]">
                {formatDate(d.date)}
              </time>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
