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
import { listMeetings } from "@/core/rag/list-meetings";
import { proposeWorkItems } from "@/core/rag/propose-work-items";
import { appConfig } from "@/config/app.config";

// Build the handler once per cold start (module scope is fine — no DB/OpenAI
// access at import time; lazy init happens inside the tool execute callback).
const store = createContextStore();

const searchMeetingsTool = defineTool({
  name: "searchMeetings",
  description:
    "Busca semântica nas transcrições de reuniões para fundamentar a resposta. " +
    "Use termos específicos (nomes, temas, decisões). Pode ser chamada várias " +
    "vezes com consultas diferentes para cobrir mais aspectos da pergunta.",
  parameters: z.object({
    query: z.string().describe("Pergunta ou termos de busca, com palavras-chave específicas"),
    topK: z.number().optional().describe("Quantos trechos retornar (padrão 6, máx. 12)"),
  }),
  execute: async ({ query, topK }) => searchMeetings(store, { query, topK }),
});

const listMeetingsTool = defineTool({
  name: "listMeetings",
  description:
    "Lista as reuniões indexadas com título e data, da mais recente para a mais " +
    "antiga. Use para perguntas temporais ('a última reunião') ou panorâmicas " +
    "('quais reuniões existem', 'resuma as recentes') antes de buscar o conteúdo.",
  parameters: z.object({
    limit: z.number().optional().describe("Quantas reuniões listar (padrão 50)"),
  }),
  execute: async ({ limit }) => listMeetings(limit),
});

const proposeWorkItemsTool = defineTool({
  name: "proposeWorkItems",
  description:
    "Propõe tarefas (Work Items do Azure DevOps) a partir dos action items da " +
    "reunião. NÃO cria nada — apenas estrutura uma lista que o usuário revisa e " +
    "confirma na interface antes de criar. Use quando o usuário pedir para gerar " +
    "tarefas OU quando a reunião claramente definiu ações/responsáveis/próximos " +
    "passos que valeria registrar. Fundamente os itens nos trechos (use " +
    "searchMeetings antes). Cada item = uma tarefa objetiva.",
  parameters: z.object({
    items: z
      .array(
        z.object({
          title: z.string().describe("Título curto e acionável da tarefa"),
          description: z
            .string()
            .optional()
            .describe("Contexto da tarefa: o que fazer e por quê, com base na reunião"),
          type: z
            .string()
            .optional()
            .describe("Tipo do Work Item (padrão: Task). Ex.: Task, Bug, User Story"),
          tags: z.array(z.string()).optional().describe("Tags opcionais"),
          priority: z
            .number()
            .optional()
            .describe("Prioridade 1 (alta) a 4 (baixa)"),
        }),
      )
      .describe("Lista de tarefas propostas a partir da reunião"),
  }),
  execute: async ({ items }) => proposeWorkItems({ items }),
});

const agent = new BuiltInAgent({
  model: appConfig.llm.model,
  // OPENAI_API_KEY is picked up from the environment automatically
  prompt: appConfig.systemPrompt,
  tools: [searchMeetingsTool, listMeetingsTool, proposeWorkItemsTool],
  maxSteps: appConfig.llm.maxSteps,
  maxOutputTokens: appConfig.llm.maxOutputTokens,
  toolChoice: "auto",
  // `temperature` só é enviado quando definido — a família GPT-5 pode rejeitar
  // valores != 1 (ver app.config.ts).
  ...(appConfig.llm.temperature !== undefined
    ? { temperature: appConfig.llm.temperature }
    : {}),
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
