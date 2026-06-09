import OpenAI from "openai";
import { appConfig } from "@/config/app.config";
import { OpenAIEmbedder } from "@/core/ingestion/embed";
import { PgVectorStore } from "./pgvector-store";
import type { ContextStore } from "./types";

export function createContextStore(): ContextStore {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedder = new OpenAIEmbedder(client, appConfig.llm.embeddingModel);
  // Provider switch driven by app.config.ts. Add "graphify" / "memory" branches
  // here as those adapters land — each just needs to implement ContextStore and
  // can be validated with runContextStoreContract (see contract.ts).
  switch (appConfig.contextStore.provider) {
    case "pgvector":
      return new PgVectorStore(embedder);
    default:
      throw new Error(
        `Unsupported contextStore provider: "${appConfig.contextStore.provider}". ` +
          `Add an adapter branch in src/core/context-store/factory.ts.`,
      );
  }
}
