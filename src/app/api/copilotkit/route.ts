import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { createContextStore } from "@/core/context-store/factory";
import { searchMeetings } from "@/core/rag/search-meetings";
import { systemPrompt } from "@/core/rag/prompt";
import { appConfig } from "@/config/app.config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai, model: appConfig.llm.model });
const store = createContextStore();

const runtime = new CopilotRuntime({
  actions: () => [
    {
      name: "searchMeetings",
      description:
        "Busca trechos relevantes nas transcrições de reuniões para fundamentar a resposta.",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "A pergunta ou termos de busca",
          required: true,
        },
        {
          name: "topK",
          type: "number",
          description: "Quantos trechos retornar",
          required: false,
        },
      ],
      handler: async ({ query, topK }: { query: string; topK?: number }) =>
        searchMeetings(store, { query, topK }),
    },
  ],
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
    // NOTE: `properties` is a generic request-context bag in runtime 1.59.5.
    // `systemMessage` is NOT a documented wiring for the LLM system prompt here
    // (it does not appear anywhere in the installed runtime type defs). The
    // authoritative system prompt is `appConfig.systemPrompt`, which should be
    // applied client-side via the `instructions`/`makeSystemMessage` prop on the
    // CopilotKit chat component. We still forward it so it is available to
    // actions/middleware and so the wiring point is explicit.
    properties: { systemMessage: systemPrompt() },
  });
  return handleRequest(req);
};
