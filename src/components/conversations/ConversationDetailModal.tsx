"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Trash2, MessageSquare, Bot, User, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationRow } from "./ConversationsTable";

interface MessageRow {
  id: string;
  role: string;
  content: string;
  citations: unknown[];
  createdAt: string;
}

interface Props {
  conversation: ConversationRow;
  onClose: () => void;
  onDelete: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ConversationDetailModal({ conversation, onClose, onDelete }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages`);
        if (res.ok) {
          const data = (await res.json()) as { messages: MessageRow[] };
          setMsgs(data.messages ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [conversation.id]);

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
          aria-labelledby="conv-detail-title"
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
              <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="conv-detail-title"
                className="font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--fg)]"
              >
                {conversation.title}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[var(--fg-muted)]">
                {formatDateTime(conversation.createdAt)}
                {" · "}
                {conversation.messageCount}{" "}
                {conversation.messageCount === 1 ? "mensagem" : "mensagens"}
              </p>
            </div>

            {/* Continue + Delete + close */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/c/${conversation.id}`);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-bright)] transition-colors hover:bg-[var(--accent-bright)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
                aria-label="Continuar conversa"
              >
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                Continuar
              </button>
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => { onDelete(); onClose(); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none"
                  >
                    Confirmar exclusão
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-[var(--fg-muted)] transition-colors hover:bg-white/[0.06] focus:outline-none"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg-subtle)] transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
                  aria-label="Excluir conversa"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      i % 2 === 0 ? "justify-start" : "justify-end",
                    )}
                  >
                    <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-[var(--panel)]" />
                  </div>
                ))}
              </div>
            ) : msgs.length === 0 ? (
              <p className="py-12 text-center text-sm text-[var(--fg-muted)]">
                Nenhuma mensagem registrada nesta conversa.
              </p>
            ) : (
              <div className="space-y-3">
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-bright)]">
          <Bot className="h-3 w-3" strokeWidth={2} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "rounded-br-sm bg-[var(--btn-bg)] text-[var(--btn-fg)]"
            : "rounded-bl-sm border border-[var(--line)] bg-[var(--panel)] text-[var(--fg)]",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <time
          className={cn(
            "mt-1 block text-right font-mono text-[0.6rem]",
            isUser ? "text-white/40" : "text-[var(--fg-subtle)]",
          )}
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
      {isUser && (
        <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)]">
          <User className="h-3 w-3 text-[var(--fg-muted)]" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}
