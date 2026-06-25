import { buildSystemPrompt } from "./system-prompt";

const brand = { name: "Marca Ambiental", logo: "/logo.svg", accent: "#16a34a" };

export const appConfig = {
  brand,
  dataSource: { type: "teams-docx" as const, transcriptsDir: process.env.TRANSCRIPTS_DIR ?? "" },
  contextStore: { provider: "pgvector" as const },
  llm: {
    // O prefixo "openai/" é obrigatório para o BuiltInAgent v2 resolver o modelo.
    model: "openai/gpt-5-mini",
    embeddingModel: "text-embedding-3-small",
    // Quantas iterações de tool-calling o agente pode encadear (busca → reflexão →
    // nova busca → resposta). Generoso para permitir recuperação iterativa.
    maxSteps: 8,
    maxOutputTokens: 2000,
    // Criatividade do modelo. Deixe `undefined` por padrão: a família GPT-5 pode
    // rejeitar `temperature` != 1. Defina um valor (ex.: 0.4) só se o modelo
    // escolhido aceitar — é passado ao agente apenas quando não for undefined.
    temperature: undefined as number | undefined,
  },
  // Ajuste fino da recuperação (lido por searchMeetings).
  retrieval: {
    defaultTopK: 6, // trechos retornados por busca quando o modelo não especifica
    maxTopK: 12, // teto para o topK pedido pelo modelo
    minScore: 0.1, // piso de similaridade (cosseno) — descarta trechos irrelevantes
  },
  systemPrompt: buildSystemPrompt(brand.name),
  suggestedQuestions: [
    "Quais decisões foram tomadas na última reunião?",
    "O que ficou definido sobre o fluxo do transportador?",
  ],
};
export type AppConfig = typeof appConfig;