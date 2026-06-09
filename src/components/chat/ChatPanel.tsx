"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { appConfig } from "@/config/app.config";

export function ChatPanel() {
  return (
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
  );
}
