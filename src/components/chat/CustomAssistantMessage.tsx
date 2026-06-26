"use client";

import { useState } from "react";
import {
  AssistantMessageProps,
  Markdown,
  useChatContext,
} from "@copilotkit/react-ui";
import { Tooltip } from "@/components/ui/tooltip";

export const CustomAssistantMessage = (props: AssistantMessageProps) => {
  const { icons, labels } = useChatContext();
  const {
    message,
    isLoading,
    onRegenerate,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    isCurrentMessage,
    feedback,
    markdownTagRenderers,
  } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const content = message?.content || "";
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (onCopy) onCopy(content);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) onRegenerate();
  };

  const handleThumbsUp = () => {
    if (onThumbsUp && message) {
      onThumbsUp(message);
    }
  };

  const handleThumbsDown = () => {
    if (onThumbsDown && message) {
      onThumbsDown(message);
    }
  };

  const content = message?.content || "";
  const subComponent = message?.generativeUI?.() ?? props.subComponent;
  const subComponentPosition = message?.generativeUIPosition ?? "after";
  const renderBefore = subComponent && subComponentPosition === "before";
  const renderAfter = subComponent && subComponentPosition !== "before";

  return (
    <>
      {renderBefore ? (
        <div style={{ marginBottom: "0.5rem" }}>{subComponent}</div>
      ) : null}
      {content && (
        <div className="copilotKitMessage copilotKitAssistantMessage">
          {content && (
            <Markdown content={content} components={markdownTagRenderers} />
          )}

          {content && !isLoading && (
            <div
              className={`copilotKitMessageControls ${isCurrentMessage ? "currentMessage" : ""}`}
            >
              <Tooltip content="Regenerar resposta" side="bottom">
                <button
                  className="copilotKitMessageControlButton"
                  onClick={handleRegenerate}
                  aria-label={labels.regenerateResponse}
                >
                  {icons.regenerateIcon}
                </button>
              </Tooltip>

              <Tooltip content={copied ? "Copiado!" : "Copiar resposta"} side="bottom">
                <button
                  className="copilotKitMessageControlButton"
                  onClick={handleCopy}
                  aria-label={labels.copyToClipboard}
                >
                  {copied ? (
                    <span style={{ fontSize: "10px", fontWeight: "bold" }} className="text-[var(--accent-bright)]">
                      ✓
                    </span>
                  ) : (
                    icons.copyIcon
                  )}
                </button>
              </Tooltip>

              {onThumbsUp && (
                <Tooltip content="Gostei" side="bottom">
                  <button
                    className={`copilotKitMessageControlButton ${
                      feedback === "thumbsUp" ? "active" : ""
                    }`}
                    onClick={handleThumbsUp}
                    aria-label={labels.thumbsUp}
                  >
                    {icons.thumbsUpIcon}
                  </button>
                </Tooltip>
              )}

              {onThumbsDown && (
                <Tooltip content="Não gostei" side="bottom">
                  <button
                    className={`copilotKitMessageControlButton ${
                      feedback === "thumbsDown" ? "active" : ""
                    }`}
                    onClick={handleThumbsDown}
                    aria-label={labels.thumbsDown}
                  >
                    {icons.thumbsDownIcon}
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}
      {renderAfter ? (
        <div style={{ marginBottom: "0.5rem" }}>{subComponent}</div>
      ) : null}
    </>
  );
};
