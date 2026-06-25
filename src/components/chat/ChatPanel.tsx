"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-ui";
import { appConfig } from "@/config/app.config";
import { SearchMeetingsRender } from "./SearchMeetingsRender";
import { WorkItemsProposalRender } from "./WorkItemsProposalRender";
import {
  HistoricalMessages,
  type HistoricalMessage,
} from "./HistoricalMessages";
import { PanelLeft } from "lucide-react";
import { useConversations } from "@/components/conversations/ConversationsContext";
import { Tooltip } from "@/components/ui/tooltip";
import { CustomAssistantMessage } from "./CustomAssistantMessage";



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
 * `threadId` is the conversation id shared with `<CopilotChat threadId>` so the
 * persisted record and the live agent thread stay in lockstep. For an existing
 * conversation (`isExistingThread`, from a `/c/[id]` route) the row already
 * exists, so we only append messages. For a brand-new thread (root `/` route) we
 * lazily create the conversation row on the first message and rewrite the URL to
 * `/c/<id>` so a reload restores it (ChatGPT/Claude behavior).
 */
function useConversationPersistence(
  threadId: string,
  isExistingThread: boolean,
  onNewThreadPersisted?: () => void,
) {
  const { agent } = useAgent();
  const ensuredThreads = useRef<Set<string>>(new Set());
  const persistedMsgIds = useRef<Set<string>>(new Set());

  // Mark the thread as ensured if it comes from the DB (already exists)
  useEffect(() => {
    if (isExistingThread) ensuredThreads.current.add(threadId);
  }, [threadId, isExistingThread]);

  useEffect(() => {
    if (!agent) return;

    const persist = async (
      messages: ReadonlyArray<{ id: string; role: string; content?: unknown }>,
    ) => {
      const threadIdToUse = threadId;

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
        const isNewThread = !ensuredThreads.current.has(threadIdToUse);
        if (isNewThread) {
          const firstUser = pending.find((m) => m.role === "user");
          const title =
            firstUser && typeof firstUser.content === "string"
              ? deriveTitle(firstUser.content)
              : undefined;
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: threadIdToUse, title }),
          });
          if (!res.ok) throw new Error("create conversation failed");
          ensuredThreads.current.add(threadIdToUse);
        }

        for (const m of pending) {
          const res = await fetch(
            `/api/conversations/${threadIdToUse}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: m.id,
                role: m.role,
                content: m.content,
                citations: [],
              }),
            },
          );
          if (!res.ok) throw new Error("persist failed");
        }

        if (isNewThread) {
          // Silently update the URL to /c/<id> so that F5 reloads this thread.
          // We use window.history.replaceState instead of router.replace
          // because router.replace triggers a Next.js navigation, causing the
          // /c/[id] Server Component to load — which re-fetches the
          // just-persisted messages and renders them as "historical",
          // duplicating what's already visible in the live CopilotChat.
          if (!isExistingThread) {
            window.history.replaceState(null, "", `/c/${threadIdToUse}`);
          }
          // Surface the new conversation in the sidebar without a reload.
          onNewThreadPersisted?.();
        }
      } catch {
        // Roll back optimistic marks so a later run retries these.
        for (const m of pending) persistedMsgIds.current.delete(m.id);
        ensuredThreads.current.delete(threadIdToUse);
      }
    };

    const sub = agent.subscribe({
      onRunFinalized: ({ messages }) => void persist(messages),
    });
    return () => sub.unsubscribe();
  }, [agent, threadId, isExistingThread, onNewThreadPersisted]);
}

export function ChatPanel({
  initialThreadId,
  initialMessages,
}: {
  initialThreadId?: string;
  initialMessages?: HistoricalMessage[];
} = {}) {
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    newChatToken,
    refreshConversations,
  } = useConversations();

  // Durable conversation id — used for DB persistence and the `/c/<id>` URL.
  // An existing conversation keeps its id; a new one gets a fresh uuid.
  // `newChatToken` is a dep so "Nova conversa" yields a new conversation even
  // when the URL is already `/` (see ConversationsContext.startNewConversation).
  const conversationId = useMemo(
    () => initialThreadId ?? crypto.randomUUID(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialThreadId, newChatToken],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          {isSidebarCollapsed && (
            <Tooltip content="Expandir barra lateral" side="bottom">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="hidden md:flex p-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <PanelLeft className="h-4.5 w-4.5" />
              </button>
            </Tooltip>
          )}
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
              Conversa
            </h1>
            <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
              Pergunte sobre as reuniões — cada resposta é fundamentada e citada.
            </p>
          </div>
        </div>
        <Tooltip content="O Copilot está ativo e pronto para responder." side="bottom">
          <span className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 sm:inline-flex cursor-default select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-bright)] animate-pulse" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              Online
            </span>
          </span>
        </Tooltip>
      </header>

      <SearchMeetingsRender />
      <WorkItemsProposalRender />

      {/* Keyed on the view so each conversation (and each "Nova conversa") fully
          remounts the thread: a clean, fresh ephemeral agent thread and live
          message list, with no leftover from the previously-viewed conversation. */}
      <ChatThread
        key={`${conversationId}:${newChatToken}`}
        conversationId={conversationId}
        isExistingThread={initialThreadId !== undefined}
        initialMessages={initialMessages}
        onNewThreadPersisted={refreshConversations}
      />
    </div>
  );
}

/**
 * One conversation's live thread. Mounted with a `key` per view, so everything
 * here is created fresh on each conversation switch.
 */
function ChatThread({
  conversationId,
  isExistingThread,
  initialMessages,
  onNewThreadPersisted,
}: {
  conversationId: string;
  isExistingThread: boolean;
  initialMessages?: HistoricalMessage[];
  onNewThreadPersisted: () => void;
}) {
  const { agent } = useAgent();

  // Ephemeral agent thread, unique to *this view* and deliberately NOT the
  // conversation id. The CopilotKit runtime keeps an in-memory message store
  // keyed by threadId (see runner GLOBAL_STORE), and the live `<CopilotChat>`
  // replays it whenever it connects. Reusing a conversation id would replay that
  // conversation's own runs on re-open (duplicating the DB-restored history),
  // and a shared thread leaked one conversation's messages into another. A
  // brand-new id always resolves to an empty server store, so the only restored
  // history is the one we render ourselves from the database, below.
  //
  // Lazy `useState` (not useMemo): `crypto.randomUUID()` is impure, so a useMemo
  // recomputes it on incidental re-renders — including mid-run — which would
  // rotate the thread out from under an active tool call and abort it
  // ("RUN_FINISHED while tool calls are still active"). The `key` on this
  // component is what makes the id fresh per view; within a view it never moves.
  const [agentThreadId] = useState(() => crypto.randomUUID());

  // Bind the singleton agent to this view's thread *during render* — before the
  // child `<CopilotChat>` runs its connect effect (child effects run before the
  // parent's), so it never connects on the previous view's thread and replays
  // those messages. Idempotent and stable per view, so this never fires mid-run.
  if (agent && agent.threadId !== agentThreadId) {
    // eslint-disable-next-line react-hooks/immutability
    agent.threadId = agentThreadId;
  }

  // Drop any live messages still held by the singleton agent from a previous
  // view. Restored history is rendered separately from the DB, so this never
  // drops it.
  useEffect(() => {
    agent?.setMessages([]);
    agent?.setState({});
    // Run once on mount — `key` guarantees a fresh mount per view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useConversationPersistence(conversationId, isExistingThread, onNewThreadPersisted);

  const hasHistory =
    initialMessages !== undefined && initialMessages.length > 0;

  return (
    <div className="copilotkit-surface mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-3 sm:px-5">
      {/* Render restored messages from the database */}
      {hasHistory && <HistoricalMessages messages={initialMessages} />}

      {/* Live CopilotChat — renders the shared agent's messages, scoped to this
          view's fresh ephemeral thread. */}
      <CopilotChat
        instructions={appConfig.systemPrompt}
        suggestions={
          hasHistory
            ? []
            : appConfig.suggestedQuestions.map((q) => ({
                title: q,
                message: q,
              }))
        }
        labels={{
          title: appConfig.brand.name,
          initial: hasHistory
            ? "Continue a conversa a partir do ponto anterior."
            : `Pergunte sobre as reuniões da ${appConfig.brand.name}.`,
        }}
        AssistantMessage={CustomAssistantMessage}
        className="h-full"
      />
    </div>
  );
}
