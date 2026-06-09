import type { ContextChunk, ContextStore, Embedder, RetrievedChunk } from "./types";

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class InMemoryStore implements ContextStore {
  private chunks = new Map<string, ContextChunk>();
  constructor(private embedder: Embedder) {}

  async upsert(chunks: ContextChunk[]): Promise<void> {
    const missing = chunks.filter((c) => !c.embedding);
    const vectors = missing.length ? await this.embedder.embed(missing.map((c) => c.text)) : [];
    missing.forEach((c, i) => { c.embedding = vectors[i]; });
    for (const c of chunks) this.chunks.set(c.id, c);
  }

  async search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]> {
    const [q] = await this.embedder.embed([query]);
    const topK = opts?.topK ?? 5;
    return [...this.chunks.values()]
      .map((c) => ({ text: c.text, score: cosine(q, c.embedding ?? []), source: c.source }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async clear(sourceId?: string): Promise<void> {
    if (!sourceId) { this.chunks.clear(); return; }
    for (const [id, c] of this.chunks) if (c.sourceId === sourceId) this.chunks.delete(id);
  }
}
