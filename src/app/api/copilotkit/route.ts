import type { NextRequest } from "next/server";
import {
  CopilotRuntime,
  BuiltInAgent,
  defineTool,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { z } from "zod";
import { createContextStore } from "@/core/context-store/factory";
import { searchMeetings } from "@/core/rag/search-meetings";
import { appConfig } from "@/config/app.config";

// Build the handler once per cold start (module scope is fine — no DB/OpenAI
// access at import time; lazy init happens inside the tool execute callback).
const store = createContextStore();

const searchMeetingsTool = defineTool({
  name: "searchMeetings",
  description:
    "Busca trechos relevantes nas transcrições de reuniões para fundamentar a resposta.",
  parameters: z.object({
    query: z.string().describe("A pergunta ou termos de busca"),
    topK: z.number().optional().describe("Quantos trechos retornar"),
  }),
  execute: async ({ query, topK }) => searchMeetings(store, { query, topK }),
});

const agent = new BuiltInAgent({
  model: appConfig.llm.model,
  // OPENAI_API_KEY is picked up from the environment automatically
  prompt: appConfig.systemPrompt,
  tools: [searchMeetingsTool],
  maxSteps: 5,
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
});

const handler = createCopilotRuntimeHandler({ 
  runtime,
  mode: "single-route"
});

export const GET = (req: NextRequest) => handler(req);
export const POST = (req: NextRequest) => handler(req);
export const OPTIONS = (req: NextRequest) => handler(req);
