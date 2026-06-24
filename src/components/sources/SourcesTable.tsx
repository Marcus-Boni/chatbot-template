"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, FileText, Database, Inbox, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DocumentDetailModal } from "./DocumentDetailModal";

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
  const [selected, setSelected] = useState<DocRow | null>(null);
  const reduce = useReducedMotion();

  const load = async () => {
    const res = await fetch("/api/ingest");
    if (!res.ok) throw new Error("Falha ao carregar documentos.");
    const data = await res.json();
    setDocs(data.documents);
  };

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch {
        toast.error("Não foi possível carregar os documentos indexados.", {
          description: "Verifique a conexão e recarregue a página.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reindex = async () => {
    setBusy(true);
    const id = toast.loading("Reindexando transcrições…");
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao reindexar.");
      await load();
      toast.success("Transcrições reindexadas com sucesso.", { id });
    } catch {
      toast.error("Falha ao reindexar as transcrições.", {
        id,
        description: "Verifique os logs do servidor e tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = (updated: DocRow) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === updated.id ? { ...d, date: updated.date } : d)),
    );
    setSelected((cur) => (cur && cur.id === updated.id ? { ...cur, date: updated.date } : cur));
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
            "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            "bg-[var(--btn-bg)] text-[var(--btn-fg)] shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset]",
            "transition-all duration-200 hover:bg-[var(--btn-bg-hover)] disabled:opacity-60",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
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
              className="border-b border-[var(--line)] last:border-b-0"
            >
              <button
                type="button"
                onClick={() => setSelected(d)}
                className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] focus:outline-none focus-visible:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-line)]"
                aria-label={`Ver e editar ${d.title}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText
                    className="h-4 w-4 shrink-0 text-[var(--fg-muted)]"
                    strokeWidth={1.8}
                  />
                  <span className="truncate text-sm font-medium text-[var(--fg)]">
                    {d.title}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <time className="font-mono text-xs text-[var(--fg-muted)]">
                    {formatDate(d.date)}
                  </time>
                  <Pencil
                    className="h-3.5 w-3.5 text-[var(--fg-subtle)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    strokeWidth={1.8}
                  />
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {selected ? (
        <DocumentDetailModal
          doc={selected}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
