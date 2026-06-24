"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquare, Trash2, Eye, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConversationDetailModal } from "./ConversationDetailModal";

export interface ConversationRow {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ConversationsTable() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const load = async () => {
    const res = await fetch("/api/conversations");
    if (!res.ok) throw new Error("Falha ao carregar conversas.");
    const data = (await res.json()) as { conversations: ConversationRow[] };
    setConversations(data.conversations);
  };

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch {
        toast.error("Não foi possível carregar o histórico.", {
          description: "Verifique a conexão e recarregue a página.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Conversa excluída.");
    } catch {
      toast.error("Falha ao excluir a conversa.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex items-center gap-2.5 text-sm text-[var(--fg-muted)]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bright)]">
          <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span>
          <span className="font-mono text-[var(--fg)]">{conversations.length}</span>{" "}
          {conversations.length === 1 ? "conversa registrada" : "conversas registradas"}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[62px] animate-pulse rounded-xl border border-[var(--line)] bg-[var(--panel)]"
            />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          {conversations.map((c, i) => (
            <motion.li
              key={c.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.04 }}
              className="border-b border-[var(--line)] last:border-b-0"
            >
              <div className="group flex w-full items-center gap-3 px-4 py-3">
                {/* Clickable row area */}
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-line)]"
                  aria-label={`Ver conversa de ${formatDate(c.createdAt)}`}
                >
                  <MessageSquare
                    className="h-4 w-4 shrink-0 text-[var(--fg-muted)]"
                    strokeWidth={1.8}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--fg)]">
                      {c.title}
                    </span>
                    <span className="font-mono text-xs text-[var(--fg-muted)]">
                      {formatDate(c.createdAt)}
                      {" · "}
                      {c.messageCount}{" "}
                      {c.messageCount === 1 ? "mensagem" : "mensagens"}
                    </span>
                  </div>
                </button>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className={cn(
                      "rounded-md p-1.5 text-[var(--fg-subtle)] transition-all",
                      "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                      "hover:bg-white/[0.06] hover:text-[var(--fg-muted)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
                    )}
                    aria-label="Ver mensagens"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>

                  {confirmDeleteId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60 focus:outline-none"
                      >
                        {deletingId === c.id ? "…" : "Confirmar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md px-2 py-1 text-xs text-[var(--fg-muted)] transition-colors hover:bg-white/[0.06] focus:outline-none"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(c.id)}
                      className={cn(
                        "rounded-md p-1.5 text-[var(--fg-subtle)] transition-all",
                        "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                        "hover:bg-red-500/10 hover:text-red-400",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
                      )}
                      aria-label="Excluir conversa"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      {selected && (
        <ConversationDetailModal
          conversation={selected}
          onClose={() => setSelected(null)}
          onDelete={() => void handleDelete(selected.id)}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--panel)] px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-bright)]">
        <Inbox className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h2 className="mt-4 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--fg)]">
        Nenhuma conversa registrada
      </h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
        As conversas realizadas no chat serão listadas aqui automaticamente.
      </p>
    </div>
  );
}
