"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-ui";
import { useConversations } from "@/components/conversations/ConversationsContext";
import { useSettings } from "@/components/settings/SettingsContext";
import { buildEffectiveInstructions } from "@/components/settings/instructions";
import { fetchPriorContext } from "@/components/settings/priorContext";
import { getPersonaPlugin } from "@/components/settings/personas";
import { appConfig } from "@/config/app.config";
import { Tooltip } from "@/components/ui/tooltip";
import { PanelLeft } from "lucide-react";
import { AgentActivityProvider, AgentActivityTrail } from "./AgentActivity";
import { CustomAssistantMessage } from "./CustomAssistantMessage";
import type { HistoricalMessage } from "./HistoricalMessages";
import { createRestoredMessages } from "./RestoredMessages";
import { SearchMeetingsRender } from "./SearchMeetingsRender";
import { WorkItemsProposalRender } from "./WorkItemsProposalRender";

const PERSISTED_ROLES = new Set(["user", "assistant"]);

function deriveTitle(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function useConversationPersistence(
  threadId: string,
  isExistingThread: boolean,
  onNewThreadPersisted?: () => void,
) {
  const { agent } = useAgent();
  const ensuredThreads = useRef<Set<string>>(new Set());
  const persistedMsgIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isExistingThread) ensuredThreads.current.add(threadId);
  }, [threadId, isExistingThread]);

  useEffect(() => {
    if (!agent) return;

    const persist = async (
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

      for (const m of pending) persistedMsgIds.current.add(m.id);

      try {
        const isNewThread = !ensuredThreads.current.has(threadId);
        if (isNewThread) {
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

        if (isNewThread) {
          if (!isExistingThread) {
            window.history.replaceState(null, "", `/c/${threadId}`);
          }
          onNewThreadPersisted?.();
        }
      } catch {
        for (const m of pending) persistedMsgIds.current.delete(m.id);
        ensuredThreads.current.delete(threadId);
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
  const { settings } = useSettings();
  const activePersona = getPersonaPlugin(settings.personaId);
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    newChatToken,
    refreshConversations,
  } = useConversations();

  const conversationId = useMemo(
    () => initialThreadId ?? crypto.randomUUID(),
    // newChatToken intentionally rotates a blank "/" conversation without
    // changing the route.
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
                aria-label="Expandir barra lateral"
                className="hidden cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--fg-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--fg)] md:flex"
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
              Pergunte sobre as reuniões - cada resposta é fundamentada e
              citada.
            </p>
          </div>
        </div>
        <Tooltip content={`Persona ativa: ${activePersona.label}`} side="bottom">
          <span className="hidden cursor-default select-none items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1 sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-bright)]" />
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              {activePersona.shortLabel}
            </span>
          </span>
        </Tooltip>
      </header>

      <SearchMeetingsRender />
      <WorkItemsProposalRender />

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
  const { settings } = useSettings();
  const [agentThreadId] = useState(() => crypto.randomUUID());
  const [priorContext, setPriorContext] = useState<string | null>(null);

  if (agent && agent.threadId !== agentThreadId) {
    // eslint-disable-next-line react-hooks/immutability
    agent.threadId = agentThreadId;
  }

  useEffect(() => {
    agent?.setMessages([]);
    agent?.setState({});
    // Run once on mount. The component key guarantees a fresh view per thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-conversation memory ("Pegar contexto das conversas anteriores"):
  // when enabled, pull a compact summary of recent threads and fold it into the
  // assistant's instructions. Runs once per thread mount.
  useEffect(() => {
    if (!settings.useConversationContext) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriorContext(null);
      return;
    }
    let alive = true;
    void fetchPriorContext(settings.conversationContextCount, conversationId).then(
      (ctx) => {
        if (alive) setPriorContext(ctx);
      },
    );
    return () => {
      alive = false;
    };
  }, [
    settings.useConversationContext,
    settings.conversationContextCount,
    conversationId,
  ]);

  useConversationPersistence(
    conversationId,
    isExistingThread,
    onNewThreadPersisted,
  );

  const instructions = useMemo(
    () =>
      buildEffectiveInstructions({
        base: appConfig.systemPrompt,
        settings,
        priorContext,
      }),
    [settings, priorContext],
  );

  const hasHistory =
    initialMessages !== undefined && initialMessages.length > 0;
  const Messages = useMemo(
    () => createRestoredMessages(initialMessages),
    [initialMessages],
  );

  return (
    <div className="copilotkit-surface mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 xl:max-w-4xl">
      <AgentActivityProvider>
        <CopilotChat
          instructions={instructions}
          suggestions={
            hasHistory || !settings.showSuggestions
              ? []
              : appConfig.suggestedQuestions.map((q) => ({
                  title: q,
                  message: q,
                }))
          }
          labels={{
            title: appConfig.brand.name,
            placeholder: "Digite sua mensagem...",
            initial: hasHistory
              ? "Continue a conversa a partir do ponto anterior."
              : `Pergunte sobre as reuniões da ${appConfig.brand.name}.`,
          }}
          Messages={Messages}
          AssistantMessage={CustomAssistantMessage}
          icons={{ activityIcon: <AgentActivityTrail /> }}
          className="min-h-0 flex-1"
        />
      </AgentActivityProvider>
    </div>
  );
}
