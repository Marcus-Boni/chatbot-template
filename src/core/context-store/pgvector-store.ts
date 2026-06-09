import { sql, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { chunks } from "@/db/schema";
import type { ContextChunk, ContextStore, Embedder, RetrievedChunk, ChunkSource } from "./types";

export class PgVectorStore implements ContextStore {
  constructor(private embedder: Embedder) {}

  async upsert(items: ContextChunk[]): Promise<void> {
    const missing = items.filter((c) => !c.embedding);
    if (missing.length) {
      const vectors = await this.embedder.embed(missing.map((c) => c.text));
      missing.forEach((c, i) => {
        c.embedding = vectors[i];
      });
    }
    for (const c of items) {
      await db
        .insert(chunks)
        .values({
          id: c.id,
          documentId: c.sourceId,
          chunkIndex: c.source.chunkIndex,
          text: c.text,
          embedding: c.embedding!,
          source: c.source,
        })
        .onConflictDoUpdate({
          target: chunks.id,
          set: {
            text: c.text,
            embedding: c.embedding!,
            source: c.source,
            chunkIndex: c.source.chunkIndex,
          },
        });
    }
  }

  async search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]> {
    const [q] = await this.embedder.embed([query]);
    const topK = opts?.topK ?? 5;
    const distance = sql<number>`${chunks.embedding} <=> ${JSON.stringify(q)}`;
    const rows = await db
      .select({ text: chunks.text, source: chunks.source, distance })
      .from(chunks)
      .orderBy(distance)
      .limit(topK);
    return rows.map((r) => ({ text: r.text, score: 1 - Number(r.distance), source: r.source as ChunkSource }));
  }

  async clear(sourceId?: string): Promise<void> {
    if (!sourceId) {
      await db.delete(chunks);
      return;
    }
    await db.delete(chunks).where(eq(chunks.documentId, sourceId));
  }
}
