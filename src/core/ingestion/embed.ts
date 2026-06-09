import type OpenAI from "openai";
import type { Embedder } from "@/core/context-store/types";

export class OpenAIEmbedder implements Embedder {
  constructor(private client: OpenAI, private model: string) {}
  async embed(texts: string[]): Promise<number[][]> {
    const res = await this.client.embeddings.create({ model: this.model, input: texts });
    return res.data.map((d) => d.embedding as number[]);
  }
}
