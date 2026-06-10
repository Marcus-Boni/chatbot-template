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

// Build the Hono handler once per request (still lazy — no module-scope DB/OpenAI
// access), then export both GET and POST so Next.js App Router passes ALL HTTP
// methods to it. CopilotKit 1.59 makes GET /api/copilotkit/threads requests;
// exporting only POST caused 404s and an infinite loading state in the chat UI.
function makeHandler(req: NextRequest) {
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

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
    properties: { systemMessage: systemPrompt() },
  });
  return handleRequest(req);
}

export const GET = (req: NextRequest) => makeHandler(req);
export const POST = (req: NextRequest) => makeHandler(req);
