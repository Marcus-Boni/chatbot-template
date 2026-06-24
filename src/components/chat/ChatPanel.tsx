"use client";

import { useEffect, useRef } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-ui";
import { appConfig } from "@/config/app.config";
import { SearchMeetingsRender } from "./SearchMeetingsRender";

/** Roles we persist to the history. Tool/system/reasoning turns are skipped. */
const PERSISTED_ROLES = new Set(["user", "assistant"]);

/** Derive a human-readable conversation title from the first user message. */
function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

/**
 * Persists the conversation to the database — wired against the CopilotKit v2
 * runtime (the app uses `BuiltInAgent` + `@copilotkit/react-core/v2`).
 *
 * The legacy v1 `useCopilotChat().visibleMessages` is NOT fed by the v2 agent,
 * so it stayed empty and nothing was ever stored. The v2 source of truth is the
 * AG-UI agent (`useAgent()`): `agent.messages` holds the settled history and
 * `onRunFinalized` fires once per completed turn with the final messages — the
 * right moment to persist (no streaming partials, full assistant content).
 *
 * Identity is keyed on the agent's stable `threadId`, NOT on component state:
 * the `<CopilotKit>` provider lives in the root layout, so the agent (and its
 * thread + messages) survives navigation between pages, while `ChatPanel`
 * unmounts/remounts. Using `threadId` as the conversation id — plus the agent's
 * stable message ids — makes every write idempotent (the API upserts with
 * ON CONFLICT DO NOTHING), so flipping between Chat and Histórico never spawns
 * duplicate conversations. A reload mints a new threadId → a fresh conversation,
 * and visiting the chat without sending anything writes nothing (Claude/ChatGPT
 * behavior): the first write only happens on the first finalized turn.
 */
function useConversationPersistence() {
  const { agent } = useAgent();
  const ensuredThreads = useRef<Set<string>>(new Set());
  const persistedMsgIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!agent) return;

    const persist = async (
      threadId: string,
      messages: ReadonlyArray<{ id: string; role: string; content?: unknown }>,
    ) => {
      const pending = messages.filter(
        (m) =>
          PERSISTED_ROLES.has(m.role) &&
          typeof m.content === "string" &&
          m.content.trim().length > 0 &&
          !persistedMsgIds.current.has(m.id),
      );
      if (pending.length === 0) return;

      // Mark optimistically so an overlapping finalize doesn't double-POST.
      for (const m of pending) persistedMsgIds.current.add(m.id);

      try {
        if (!ensuredThreads.current.has(threadId)) {
          const firstUser = pending.find((m) => m.role === "user");
          const title =
            firstUser && typeof firstUser.content === "string"
              ? deriveTitle(firstUser.content)
              : undefined;
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: threadId, title }),
          });
          if (!res.ok) throw new Error("create conversation failed");
          ensuredThreads.current.add(threadId);
        }

        for (const m of pending) {
          const res = await fetch(`/api/conversations/${threadId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: m.id,
              role: m.role,
              content: m.content,
              citations: [],
            }),
          });
          if (!res.ok) throw new Error("persist failed");
        }
      } catch {
        // Roll back optimistic marks so a later run retries these.
        for (const m of pending) persistedMsgIds.current.delete(m.id);
        ensuredThreads.current.delete(threadId);
      }
    };

    const sub = agent.subscribe({
      onRunFinalized: ({ messages }) => void persist(agent.threadId, messages),
    });
    return () => sub.unsubscribe();
  }, [agent]);
}

export function ChatPanel() {
  useConversationPersistence();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-7">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
            Conversa
          </h1>
          <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
            Pergunte sobre as reuniões — cada resposta é fundamentada e citada.
          </p>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-bright)]" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            Online
          </span>
        </span>
      </header>

      <SearchMeetingsRender />

      <div className="copilotkit-surface mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 sm:px-5">
        <CopilotChat
          instructions={appConfig.systemPrompt}
          suggestions={appConfig.suggestedQuestions.map((q) => ({
            title: q,
            message: q,
          }))}
          labels={{
            title: appConfig.brand.name,
            initial: `Pergunte sobre as reuniões da ${appConfig.brand.name}.`,
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
