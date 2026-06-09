export interface ChunkSource {
  meetingTitle: string;
  date: string; // ISO
  path: string;
  chunkIndex: number;
  speakers: string[];
  startTime: string; // mm:ss
  endTime: string; // mm:ss
}

export interface ContextChunk {
  id: string;
  sourceId: string;
  text: string;
  embedding?: number[];
  source: ChunkSource;
}

export interface RetrievedChunk {
  text: string;
  score: number;
  source: ChunkSource;
}

export interface ContextStore {
  upsert(chunks: ContextChunk[]): Promise<void>;
  search(query: string, opts?: { topK?: number }): Promise<RetrievedChunk[]>;
  clear(sourceId?: string): Promise<void>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}
