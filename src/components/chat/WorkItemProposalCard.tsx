"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ListTodo,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Flag,
  Tag as TagIcon,
  X,
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
 * Renders the AI's proposed work items as an editable list — title, type,
 * priority, tags and description are all editable inline. NOTHING is sent to
 * Azure DevOps until the user clicks "Criar no Azure DevOps", which POSTs to the
 * server route that holds the PAT. After creation it swaps to a read-only list
 * of links to the created items.
 */

/** Common Azure DevOps work item types — offered as suggestions, free text allowed. */
const COMMON_TYPES = ["Task", "Bug", "User Story", "Feature", "Epic", "Issue"];

/** Azure DevOps priority scale (1 highest – 4 lowest) with PT-BR labels + colors. */
const PRIORITIES: Record<
  number,
  { label: string; short: string; dot: string; chip: string }
> = {
  1: {
    label: "Crítica",
    short: "P1",
    dot: "bg-red-400",
    chip: "border-red-500/40 bg-red-500/[0.08] text-red-200",
  },
  2: {
    label: "Alta",
    short: "P2",
    dot: "bg-amber-400",
    chip: "border-amber-500/40 bg-amber-500/[0.08] text-amber-200",
  },
  3: {
    label: "Média",
    short: "P3",
    dot: "bg-sky-400",
    chip: "border-sky-500/40 bg-sky-500/[0.08] text-sky-200",
  },
  4: {
    label: "Baixa",
    short: "P4",
    dot: "bg-slate-400",
    chip: "border-slate-500/40 bg-slate-500/[0.08] text-slate-300",
  },
};

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

  const validCount = drafts.filter((d) => d.title.trim().length > 0).length;

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
      className="my-3 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)]"
      aria-label="Tarefas propostas para o Azure DevOps"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-gradient-to-b from-white/[0.025] to-transparent px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bright)] ring-1 ring-[var(--accent-line)]">
            <ListTodo className="h-[17px] w-[17px]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--fg)]">
              {status === "done" ? "Tarefas criadas no Azure DevOps" : "Tarefas sugeridas"}
            </h3>
            {target ? (
              <p className="truncate font-mono text-[0.64rem] text-[var(--fg-subtle)]">{target}</p>
            ) : (
              status !== "done" && (
                <p className="font-mono text-[0.64rem] text-[var(--fg-subtle)]">
                  Revise e edite antes de criar
                </p>
              )
            )}
          </div>
        </div>
        {status !== "done" && (
          <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg)]/40 px-2.5 py-0.5 font-mono text-[0.62rem] text-[var(--fg-subtle)]">
            {validCount}/{drafts.length} {drafts.length === 1 ? "item" : "itens"}
          </span>
        )}
      </header>

      {/* Not configured warning */}
      {!payload.configured && status !== "done" && (
        <div className="flex items-start gap-2 border-b border-[var(--line)] bg-amber-500/[0.06] px-4 py-2.5 text-xs leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Integração com o Azure DevOps não configurada. Defina <code>AZURE_DEVOPS_ORG_URL</code>,{" "}
            <code>AZURE_DEVOPS_PROJECT</code> e <code>AZURE_DEVOPS_PAT</code> no <code>.env</code> para
            habilitar a criação.
          </span>
        </div>
      )}

      {/* Body */}
      <div className="space-y-3 p-3.5">
        {status === "done" ? (
          <CreatedList created={created} errors={errors} />
        ) : (
          <>
            {drafts.map((d, i) => (
              <DraftRow
                key={i}
                index={i}
                draft={d}
                disabled={status === "submitting"}
                onChange={(patch) => update(i, patch)}
                onRemove={() => remove(i)}
              />
            ))}
            {drafts.length === 0 && (
              <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--fg-muted)]">
                Nenhuma tarefa na lista. Adicione uma para criar no Azure DevOps.
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      {status !== "done" && (
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-gradient-to-b from-transparent to-white/[0.015] px-3.5 py-3">
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
            disabled={status === "submitting" || validCount === 0}
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
                Criar {validCount > 1 ? `${validCount} tarefas` : "no Azure DevOps"}
              </>
            )}
          </button>
        </footer>
      )}
    </section>
  );
}

function DraftRow({
  index,
  draft,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  draft: WorkItemDraft;
  disabled: boolean;
  onChange: (patch: Partial<WorkItemDraft>) => void;
  onRemove: () => void;
}) {
  const priority = draft.priority && PRIORITIES[draft.priority] ? draft.priority : undefined;

  return (
    <div className="group/item rounded-xl border border-[var(--line)] bg-[var(--bg)]/40 p-3 transition-colors focus-within:border-[var(--accent-line)] hover:border-[var(--line-strong)]">
      {/* Top row: index · type · priority · remove */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.04] font-mono text-[0.6rem] text-[var(--fg-subtle)]">
          {index + 1}
        </span>

        <TypeSelect
          value={draft.type ?? ""}
          disabled={disabled}
          onChange={(type) => onChange({ type })}
        />

        <PrioritySelect
          value={priority}
          disabled={disabled}
          onChange={(p) => onChange({ priority: p })}
        />

        <span className="flex-1" />

        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label="Remover tarefa"
          className="shrink-0 rounded-md p-1.5 text-[var(--fg-subtle)] opacity-60 transition-all hover:bg-red-500/10 hover:text-red-300 focus-visible:opacity-100 group-hover/item:opacity-100 disabled:opacity-30"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title */}
      <input
        value={draft.title}
        disabled={disabled}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Título da tarefa"
        aria-label="Título do work item"
        className="mt-2.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] hover:border-[var(--line)] focus:border-[var(--accent-line)] focus:bg-[var(--panel)]"
      />

      {/* Description (auto-growing, custom scrollbar past max height) */}
      <AutoTextarea
        value={draft.description ?? ""}
        disabled={disabled}
        onChange={(description) => onChange({ description })}
        placeholder="Descrição (opcional) — contexto, critérios de aceite…"
        aria-label="Descrição do work item"
      />

      {/* Tags */}
      <TagsEditor
        tags={draft.tags ?? []}
        disabled={disabled}
        onChange={(tags) => onChange({ tags: tags.length ? tags : undefined })}
      />
    </div>
  );
}

/** Work item type as a compact input with a datalist of common suggestions. */
function TypeSelect({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const listId = useId();
  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Tipo do work item"
        spellCheck={false}
        className="w-[7.5rem] shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 font-mono text-[0.66rem] text-[var(--fg-muted)] outline-none transition-colors focus:border-[var(--accent-line)] focus:text-[var(--fg)]"
      />
      <datalist id={listId}>
        {COMMON_TYPES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

/** Priority cycler: shows a colored flag + label, native select for a11y. */
function PrioritySelect({
  value,
  disabled,
  onChange,
}: {
  value: number | undefined;
  disabled: boolean;
  onChange: (v: number | undefined) => void;
}) {
  const meta = value ? PRIORITIES[value] : undefined;
  return (
    <label
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[0.66rem] font-medium transition-colors",
        meta
          ? meta.chip
          : "border-[var(--line)] bg-[var(--panel)] text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]",
        disabled && "pointer-events-none opacity-50",
      )}
      title="Prioridade (Azure DevOps: 1 = mais alta)"
    >
      {meta ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      ) : (
        <Flag className="h-3 w-3" strokeWidth={2} />
      )}
      <span>{meta ? `${meta.short} · ${meta.label}` : "Prioridade"}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        aria-label="Prioridade do work item"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">Sem prioridade</option>
        {[1, 2, 3, 4].map((p) => (
          <option key={p} value={p}>
            {PRIORITIES[p].short} · {PRIORITIES[p].label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Textarea that grows with content up to a max height, then scrolls cleanly. */
function AutoTextarea({
  value,
  disabled,
  placeholder,
  onChange,
  ...rest
}: {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (v: string) => void;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // Cap growth at ~10rem (160px); beyond that the styled scrollbar takes over.
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="sidebar-scroll mt-2 max-h-40 w-full resize-none rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-xs leading-relaxed text-[var(--fg-muted)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-line)] focus:text-[var(--fg)]"
    />
  );
}

/** Chip editor for Azure DevOps tags — Enter/comma to add, × to remove. */
function TagsEditor({
  tags,
  disabled,
  onChange,
}: {
  tags: string[];
  disabled: boolean;
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const commit = (raw: string) => {
    const next = raw.trim().replace(/,$/, "").trim();
    if (!next) return;
    if (tags.some((t) => t.toLowerCase() === next.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...tags, next]);
    setInput("");
  };

  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t));

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <TagIcon className="h-3 w-3 shrink-0 text-[var(--fg-subtle)]" strokeWidth={1.9} />
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] py-0.5 pl-2 pr-1 font-mono text-[0.6rem] text-[var(--accent-bright)]"
        >
          {t}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(t)}
              aria-label={`Remover tag ${t}`}
              className="rounded-full p-0.5 transition-colors hover:bg-white/10"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(input);
            } else if (e.key === "Backspace" && !input && tags.length) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          onBlur={() => commit(input)}
          placeholder={tags.length ? "" : "Adicionar tag…"}
          aria-label="Adicionar tag"
          className="min-w-[5rem] flex-1 bg-transparent px-1 py-0.5 font-mono text-[0.62rem] text-[var(--fg-muted)] outline-none placeholder:text-[var(--fg-subtle)]"
        />
      )}
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
          className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]/40 px-3 py-2.5 transition-colors hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent-bright)]" />
            <span className="min-w-0">
              <span className="block truncate text-sm text-[var(--fg)]">{item.title}</span>
              <span className="font-mono text-[0.62rem] text-[var(--fg-subtle)]">
                #{item.id} · {item.type}
              </span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[0.62rem] text-[var(--fg-subtle)] transition-colors group-hover:text-[var(--accent-bright)]">
            Abrir
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </a>
      ))}
      {errors.map((e, i) => (
        <div
          key={`err-${i}`}
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs leading-relaxed text-red-200/90"
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
