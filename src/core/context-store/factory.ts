import OpenAI from "openai";
import { appConfig } from "@/config/app.config";
import { OpenAIEmbedder } from "@/core/ingestion/embed";
import { PgVectorStore } from "./pgvector-store";
import type { ContextStore } from "./types";

export function createContextStore(): ContextStore {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedder = new OpenAIEmbedder(client, appConfig.llm.embeddingModel);
  // provider switch: add "graphify" / "memory" here as adapters land.
  return new PgVectorStore(embedder);
}
