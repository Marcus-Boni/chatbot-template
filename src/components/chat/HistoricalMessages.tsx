"use client";

import { cn } from "@/lib/utils";

export interface HistoricalMessage {
  id: string;
  role: string;
  content: string;
}

/**
 * Renders previously-persisted messages using the same CopilotKit CSS classes
 * so they blend seamlessly with live messages rendered by `<CopilotChat>`.
 *
 * This component is mounted inside the customized CopilotKit
 * `.copilotKitMessagesContainer` flow so historical messages share the same
 * scroll container and visual rhythm as live messages.
 */
export function HistoricalMessages({
  messages,
}: {
  messages: HistoricalMessage[];
}) {
  if (messages.length === 0) return null;

  return (
    <div className="restoredMessages">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "copilotKitMessage",
            msg.role === "user"
              ? "copilotKitUserMessage"
              : "copilotKitAssistantMessage",
          )}
        >
          {msg.role === "user" ? (
            msg.content
          ) : (
            <AssistantContent content={msg.content} />
          )}
        </div>
      ))}

      {/* Visual separator between restored and new messages */}
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--line)]" />
        <span className="relative z-10 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Conversa restaurada
        </span>
      </div>
    </div>
  );
}

/**
 * Renders assistant content with basic paragraph splitting.
 * CopilotKit assistant messages render markdown via react-markdown,
 * but for historical messages we do a lightweight version that preserves
 * line breaks and paragraphs.
 */
function AssistantContent({ content }: { content: string }) {
  // Split by double-newlines into paragraphs
  const paragraphs = content.split(/\n{2,}/);
  return (
    <div className="copilotKitMarkdown">
      {paragraphs.map((p, i) => (
        <p key={i} style={{ whiteSpace: "pre-wrap", margin: i > 0 ? "0.75em 0 0" : 0 }}>
          {p}
        </p>
      ))}
    </div>
  );
}
