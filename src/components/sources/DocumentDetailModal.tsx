"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { TranscriptViewer } from "./TranscriptViewer";

interface DocRow {
  id: string;
  title: string;
  date: string | null;
  indexedAt: string;
}

interface DetailData {
  document: DocRow;
  content: string;
  chunkCount: number;
}

/** Stored timestamp → a local `Date` for the calendar (UTC parts → no day drift). */
function isoToDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Local `Date` → `YYYY-MM-DD` (the API re-anchors it to noon UTC). */
function dateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface Props {
  doc: DocRow;
  onClose: () => void;
  /** Called after a successful save so the parent list can reflect the new date. */
  onSaved: (updated: DocRow) => void;
}

export function DocumentDetailModal({ doc, onClose, onSaved }: Props) {
  const reduce = useReducedMotion();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateValue, setDateValue] = useState<Date | undefined>(isoToDate(doc.date));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Load the indexed content for this document.
  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${doc.id}`);
        if (!res.ok) throw new Error("Falha ao carregar o documento.");
        const json: DetailData = await res.json();
        if (!active) return;
        setData(json);
        setDateValue(isoToDate(json.document.date));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erro inesperado.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [doc.id]);

  // Escape closes the dialog — unless an open calendar popover should take it.
  // Lock background scroll while open and move focus into the dialog.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const baselineYMD = (() => {
    const b = isoToDate(data?.document.date ?? doc.date);
    return b ? dateToYMD(b) : "";
  })();
  const currentYMD = dateValue ? dateToYMD(dateValue) : "";
  const dirty = currentYMD !== baselineYMD;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateValue ? dateToYMD(dateValue) : null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Não foi possível salvar a data.");
      }
      const json: { document: DocRow } = await res.json();
      setData((prev) => (prev ? { ...prev, document: json.document } : prev));
      setDateValue(isoToDate(json.document.date));
      onSaved(json.document);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      toast.success("Data da reunião salva.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      setError(msg);
      toast.error("Não foi possível salvar a data.", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-detail-title"
          initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden",
            "rounded-t-2xl border border-[var(--line-strong)] bg-[var(--bg-elevated)]",
            "shadow-2xl sm:max-w-2xl sm:rounded-2xl",
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bright)]">
              <FileText className="h-4.5 w-4.5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="doc-detail-title"
                className="font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--fg)]"
              >
                {doc.title}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                {data ? `${data.chunkCount} trechos indexados` : "Documento indexado"}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Date editor */}
          <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label
                htmlFor="doc-date"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--fg-muted)]"
              >
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                Data da reunião
              </label>
              <DatePicker
                id="doc-date"
                value={dateValue}
                onChange={setDateValue}
                placeholder="Sem data definida"
              />
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                "bg-[var(--btn-bg)] text-[var(--btn-fg)] transition-all duration-200",
                "hover:bg-[var(--btn-bg-hover)] disabled:cursor-not-allowed disabled:opacity-50",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : saved ? (
                <Check className="h-4 w-4" strokeWidth={2.4} />
              ) : null}
              {saving ? "Salvando…" : saved ? "Salvo" : "Salvar data"}
            </button>
          </div>

          {error ? (
            <div className="border-b border-[var(--line)] bg-red-500/10 px-5 py-2.5 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {/* Content */}
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-[var(--fg-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              Carregando conteúdo indexado…
            </div>
          ) : data?.content.trim() ? (
            <TranscriptViewer content={data.content} />
          ) : (
            <p className="px-5 py-10 text-center text-sm text-[var(--fg-muted)]">
              Nenhum conteúdo indexado para este documento.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
