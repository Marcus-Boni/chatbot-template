"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCopilotChatInternal } from "@copilotkit/react-core";
import type { CopilotChat } from "@copilotkit/react-ui";
import { useChatContext } from "@copilotkit/react-ui";
import { AgentActivityTrail, useAgentActivity } from "./AgentActivity";
import {
  HistoricalMessages,
  type HistoricalMessage,
} from "./HistoricalMessages";

type MessagesComponent = NonNullable<
  React.ComponentProps<typeof CopilotChat>["Messages"]
>;
type MessagesProps = React.ComponentProps<MessagesComponent>;
type ChatMessage = MessagesProps["messages"][number];

function makeInitialMessages(
  initial: string | string[] | undefined,
): ChatMessage[] {
  if (!initial) return [];

  if (Array.isArray(initial)) {
    return initial.map((message) => ({
      id: message,
      role: "assistant",
      content: message,
    }));
  }

  return [
    {
      id: initial,
      role: "assistant",
      content: initial,
    },
  ];
}

function useScrollToBottom(messages: ChatMessage[]) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const isUserScrollUpRef = useRef(false);

  const scrollToBottom = () => {
    if (!messagesContainerRef.current || !messagesEndRef.current) return;

    isProgrammaticScrollRef.current = true;
    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight;
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      isUserScrollUpRef.current = scrollTop + clientHeight < scrollHeight;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const mutationObserver = new MutationObserver(() => {
      if (!isUserScrollUpRef.current) scrollToBottom();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => mutationObserver.disconnect();
  }, []);

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  useEffect(() => {
    isUserScrollUpRef.current = false;
    scrollToBottom();
  }, [userMessageCount]);

  return { messagesEndRef, messagesContainerRef };
}

export function createRestoredMessages(
  historicalMessages: HistoricalMessage[] | undefined,
) {
  const hasHistory = Boolean(historicalMessages?.length);

  return function RestoredMessages(props: MessagesProps) {
    const {
      inProgress,
      children,
      RenderMessage,
      AssistantMessage,
      UserMessage,
      ErrorMessage,
      ImageRenderer,
      onRegenerate,
      onCopy,
      onThumbsUp,
      onThumbsDown,
      messageFeedback,
      markdownTagRenderers,
      chatError,
    } = props;
    const { labels } = useChatContext();
    const { messages: visibleMessages, interrupt } = useCopilotChatInternal();
    const { running } = useAgentActivity();
    const initialMessages = useMemo(
      () => (hasHistory ? [] : makeInitialMessages(labels.initial)),
      [labels.initial],
    );
    const messages = [...initialMessages, ...visibleMessages];
    const { messagesContainerRef, messagesEndRef } =
      useScrollToBottom(messages);

    const lastMessage = messages.at(-1);
    const currentAssistantHasContent =
      lastMessage?.role === "assistant" &&
      typeof lastMessage.content === "string" &&
      lastMessage.content.trim().length > 0;
    const showPendingActivity =
      (inProgress || running) && !currentAssistantHasContent;

    return (
      <div className="copilotKitMessages" ref={messagesContainerRef}>
        <div className="copilotKitMessagesContainer">
          {hasHistory && (
            <HistoricalMessages messages={historicalMessages ?? []} />
          )}

          {messages.map((message, index) => {
            const isCurrentMessage = index === messages.length - 1;
            return (
              <RenderMessage
                key={message.id ?? index}
                message={message}
                messages={messages}
                inProgress={inProgress}
                index={index}
                isCurrentMessage={isCurrentMessage}
                AssistantMessage={AssistantMessage}
                UserMessage={UserMessage}
                ImageRenderer={ImageRenderer}
                onRegenerate={onRegenerate}
                onCopy={onCopy}
                onThumbsUp={onThumbsUp}
                onThumbsDown={onThumbsDown}
                messageFeedback={messageFeedback}
                markdownTagRenderers={markdownTagRenderers}
              />
            );
          })}

          {showPendingActivity && (
            <span data-testid="copilot-loading-cursor">
              <AgentActivityTrail active />
            </span>
          )}

          {interrupt}
          {chatError && ErrorMessage && (
            <ErrorMessage error={chatError} isCurrentMessage />
          )}
        </div>

        <footer className="copilotKitMessagesFooter" ref={messagesEndRef}>
          {children}
        </footer>
      </div>
    );
  };
}
