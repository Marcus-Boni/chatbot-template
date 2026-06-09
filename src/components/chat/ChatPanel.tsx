"use client";

import { useEffect, useRef, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotChat } from "@copilotkit/react-core";
import { appConfig } from "@/config/app.config";
import { SearchMeetingsRender } from "./SearchMeetingsRender";

export function ChatPanel() {
  // Conversation persistence (Task 13).
  const [conversationId, setConversationId] = useState<string | null>(null);
  const created = useRef(false);

  // Create a conversation once, on mount. The `created` ref guard makes this
  // fire exactly once even under React Strict Mode's double-invoke in dev.
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    void fetch("/api/conversations", { method: "POST" })
      .then((r) => r.json())
      .then((d: { id: string }) => setConversationId(d.id))
      .catch(() => {
        // Allow a retry on a later mount if creation failed.
        created.current = false;
      });
  }, []);

  // Message persistence wiring (verified against installed CopilotKit 1.59.5 type defs):
  //   - `useCopilotChat()` (the open-source-friendly headless hook) returns
  //     `UseCopilotChatReturn`, which is `Omit<..., "messages" | "sendMessage" | ...>`.
  //     Crucially `visibleMessages: Message$1[]` is NOT omitted, so it is the
  //     observable array we can read here without a publicApiKey
  //     (`@copilotkit/react-core/dist/index.d.mts` lines 153 + 303).
  //   - Each `Message` (`@copilotkit/runtime-client-gql` client/types.d.mts) has
  //     `id` + a `isTextMessage()` type guard narrowing to `TextMessage`
  //     ({ role: MessageRole, content: string }). MessageRole = user/assistant/system.
  //   - `<CopilotChat onSubmitMessage>` exists but only yields the raw USER string
  //     (no assistant turns), so `visibleMessages` is the better source for both sides.
  // We diff `visibleMessages` against a ref of already-persisted ids and POST each new
  // text message. Citations are not surfaced on the message object in 1.59, so we send
  // none (the messages route defaults `citations` to []); the searchMeetings action's
  // citations would need a custom render hook to capture, out of scope for this task.
  const { visibleMessages } = useCopilotChat();
  const persistedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) return;
    for (const message of visibleMessages) {
      if (!message.isTextMessage()) continue;
      // Persist only COMPLETED messages, never streaming partials. Each `Message`
      // carries `status: MessageStatus` (= FailedMessageStatus | PendingMessageStatus
      // | SuccessMessageStatus), whose `code` is the string-valued `MessageStatusCode`
      // enum { Failed, Pending, Success } (verified in runtime-client-gql 1.59.5
      // graphql.d.mts lines 282-287). A streaming assistant turn stays `Pending` until
      // the final chunk lands, so gating on `Success` ensures we store the full content
      // (not a truncated early chunk). The dedupe set still guards against duplicate POSTs.
      if (message.status?.code !== "Success") continue;
      if (!message.content || persistedIds.current.has(message.id)) continue;
      persistedIds.current.add(message.id);
      void fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          citations: [],
        }),
      }).catch(() => {
        // Best-effort persistence: on failure, allow a future retry.
        persistedIds.current.delete(message.id);
      });
    }
  }, [visibleMessages, conversationId]);

  return (
    <div className="flex h-full flex-col">
      {/* Pane header */}
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

      {/* Generative-UI: renders CitationCards under assistant turns when the
          backend searchMeetings action runs. Renders nothing itself. */}
      <SearchMeetingsRender />

      {/* CopilotKit chat surface, skinned to the dark console via the
          .copilotkit-surface CSS-variable theme in globals.css. */}
      <div className="copilotkit-surface mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 sm:px-5">
        <CopilotChat
      // System prompt wiring (CopilotKit 1.59.5):
      // The authoritative grounding/citation prompt lives in appConfig.systemPrompt and
      // MUST be applied client-side — the backend route's properties.systemMessage is a
      // generic context bag in 1.59 and does NOT reliably set the LLM system prompt.
      // CopilotChatProps.instructions (verified in node_modules @copilotkit/react-ui
      // 1.59.5 index.d.mts: "Custom instructions to be added to the system message...
      // influencing its responses") is the supported mechanism for this. It augments
      // CopilotKit's default system message, which is sufficient here (no need for the
      // heavier makeSystemMessage override).
      instructions={appConfig.systemPrompt}
      // Static suggestion pills (CopilotKit 1.59.5): `suggestions` accepts
      // `Omit<Suggestion, "isLoading">[]` (verified in @copilotkit/core 1.59.5
      // index.d.mts: `{ title, message }`). Passing a static array shows fixed
      // prompts without AI generation, grounding the user's first question.
      suggestions={appConfig.suggestedQuestions.map((q) => ({
        title: q,
        message: q,
      }))}
      labels={{
        title: appConfig.brand.name,
        initial: "Pergunte sobre as reuniões da " + appConfig.brand.name + ".",
      }}
        className="h-full"
        />
      </div>
    </div>
  );
}
