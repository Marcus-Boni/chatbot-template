import type { ContextStore, ChunkSource } from "@/core/context-store/types";

export interface SearchArgs {
  query: string;
  topK?: number;
}

export interface SearchResult {
  text: string;
  score: number;
  citation: ChunkSource;
}

export interface SearchResponse {
  results: SearchResult[];
}

const MIN_SCORE = 0.01;

export async function searchMeetings(
  store: ContextStore,
  args: SearchArgs,
): Promise<SearchResponse> {
  const hits = await store.search(args.query, { topK: args.topK ?? 5 });
  const results = hits
    .filter((h) => h.score > MIN_SCORE)
    .map((h) => ({ text: h.text, score: h.score, citation: h.source }));
  return { results };
}
