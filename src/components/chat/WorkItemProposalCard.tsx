"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ListTodo,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CreatedWorkItem,
  WorkItemDraft,
  WorkItemError,
} from "@/core/azure-devops/types";
import type { ProposeWorkItemsResponse } from "@/core/rag/propose-work-items";

/**
 * Human-in-the-loop card for the `proposeWorkItems` tool.
 *
 * Renders the AI's proposed work items as an editable list. NOTHING is sent to
 * Azure DevOps until the user clicks "Criar no Azure DevOps", which POSTs to the
 * server route that holds the PAT. After creation it swaps to a read-only list
 * of links to the created items.
 */
export function WorkItemProposalCard({ payload }: { payload: ProposeWorkItemsResponse }) {
  const [drafts, setDrafts] = useState<WorkItemDraft[]>(() =>
    payload.items.map((it) => ({ ...it })),
  );
  const [status, setStatus] = useState<"editing" | "submitting" | "done">("editing");
  const [created, setCreated] = useState<CreatedWorkItem[]>([]);
  const [errors, setErrors] = useState<WorkItemError[]>([]);

  const target =
    payload.organization && payload.project
      ? `${payload.organization} / ${payload.project}`
      : null;

  const update = (i: number, patch: Partial<WorkItemDraft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const remove = (i: number) => setDrafts((prev) => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    const valid = drafts.filter((d) => d.title.trim().length > 0);
    if (valid.length === 0) {
      toast.error("Adicione ao menos uma tarefa com título.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/azure-devops/work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: valid }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        created?: CreatedWorkItem[];
        errors?: WorkItemError[];
        error?: string;
      };
      if (!res.ok) {
        toast.error("Não foi possível criar os work items.", {
          description: data.error ?? `HTTP ${res.status}`,
        });
        setStatus("editing");
        return;
      }
      setCreated(data.created ?? []);
      setErrors(data.errors ?? []);
      setStatus("done");
      const n = data.created?.length ?? 0;
      if (n > 0) {
        toast.success(
          n === 1 ? "1 work item criado no Azure DevOps." : `${n} work items criados no Azure DevOps.`,
        );
      }
      if (data.errors && data.errors.length > 0) {
        toast.error(`${data.errors.length} item(ns) falharam.`);
      }
    } catch (err) {
      toast.error("Falha de rede ao criar os work items.", {
        description: err instanceof Error ? err.message : undefined,
      });
      setStatus("editing");
    }
  };

  return (
    <section
      className="my-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]"
      aria-label="Tarefas propostas para o Azure DevOps"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-bright)]">
            <ListTodo className="h-[15px] w-[15px]" strokeWidth={1.9} />
          </span>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--fg)]">
              {status === "done" ? "Tarefas criadas" : "Tarefas sugeridas"}
            </h3>
            {target && (
              <p className="font-mono text-[0.62rem] text-[var(--fg-subtle)]">{target}</p>
            )}
          </div>
        </div>
        {status !== "done" && (
          <span className="shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[0.62rem] text-[var(--fg-subtle)]">
            {drafts.length} {drafts.length === 1 ? "item" : "itens"}
          </span>
        )}
      </header>

      {/* Not configured warning */}
      {!payload.configured && status !== "done" && (
        <div className="flex items-start gap-2 border-b border-[var(--line)] bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Integração com o Azure DevOps não configurada. Defina <code>AZURE_DEVOPS_ORG_URL</code>,{" "}
            <code>AZURE_DEVOPS_PROJECT</code> e <code>AZURE_DEVOPS_PAT</code> no <code>.env</code> para
            habilitar a criação.
          </span>
        </div>
      )}

      {/* Body */}
      <div className="space-y-2.5 p-3.5">
        {status === "done" ? (
          <CreatedList created={created} errors={errors} />
        ) : (
          <>
            {drafts.map((d, i) => (
              <DraftRow
                key={i}
                draft={d}
                disabled={status === "submitting"}
                onChange={(patch) => update(i, patch)}
                onRemove={() => remove(i)}
              />
            ))}
            {drafts.length === 0 && (
              <p className="px-1 py-2 text-xs text-[var(--fg-muted)]">
                Nenhuma tarefa na lista. Adicione uma para criar no Azure DevOps.
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      {status !== "done" && (
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-3.5 py-3">
          <button
            type="button"
            disabled={status === "submitting"}
            onClick={() =>
              setDrafts((prev) => [...prev, { title: "", type: payload.defaultType }])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--fg-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--fg)] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar tarefa
          </button>
          <button
            type="button"
            disabled={status === "submitting" || drafts.length === 0}
            onClick={handleCreate}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
              "bg-[var(--accent)] text-white hover:bg-[var(--accent-bright)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Criando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Criar no Azure DevOps
              </>
            )}
          </button>
        </footer>
      )}
    </section>
  );
}

function DraftRow({
  draft,
  disabled,
  onChange,
  onRemove,
}: {
  draft: WorkItemDraft;
  disabled: boolean;
  onChange: (patch: Partial<WorkItemDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)]/40 p-2.5">
      <div className="flex items-center gap-2">
        <input
          value={draft.type ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ type: e.target.value })}
          aria-label="Tipo do work item"
          className="w-24 shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 font-mono text-[0.66rem] text-[var(--fg-muted)] outline-none focus:border-[var(--accent-line)]"
        />
        <input
          value={draft.title}
          disabled={disabled}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Título da tarefa"
          aria-label="Título do work item"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-line)]"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label="Remover tarefa"
          className="shrink-0 rounded-md p-1 text-[var(--fg-subtle)] transition-colors hover:bg-white/[0.04] hover:text-red-300 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={draft.description ?? ""}
        disabled={disabled}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Descrição (opcional)"
        aria-label="Descrição do work item"
        rows={2}
        className="mt-1.5 w-full resize-y rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-xs leading-relaxed text-[var(--fg-muted)] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-line)]"
      />
    </div>
  );
}

function CreatedList({
  created,
  errors,
}: {
  created: CreatedWorkItem[];
  errors: WorkItemError[];
}) {
  return (
    <div className="space-y-2">
      {created.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]/40 px-3 py-2 transition-colors hover:border-[var(--accent-line)]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]" />
            <span className="truncate text-sm text-[var(--fg)]">{item.title}</span>
            <span className="shrink-0 font-mono text-[0.62rem] text-[var(--fg-subtle)]">
              #{item.id} · {item.type}
            </span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)] transition-colors group-hover:text-[var(--accent-bright)]" />
        </a>
      ))}
      {errors.map((e, i) => (
        <div
          key={`err-${i}`}
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200/90"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium">{e.title || "Item sem título"}:</span> {e.message}
          </span>
        </div>
      ))}
    </div>
  );
}
