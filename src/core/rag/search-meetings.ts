import { appConfig } from "@/config/app.config";
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

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Collapse whitespace + lowercase so near-identical excerpts dedupe to one key. */
const dedupeKey = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

export async function searchMeetings(
  store: ContextStore,
  args: SearchArgs,
): Promise<SearchResponse> {
  const { defaultTopK, maxTopK, minScore } = appConfig.retrieval;
  const topK = clamp(Math.round(args.topK ?? defaultTopK), 1, maxTopK);

  // Over-fetch so that after dropping low-relevance and duplicate excerpts we
  // still have a full set to return.
  const hits = await store.search(args.query, { topK: topK * 2 });

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const h of hits) {
    if (h.score <= minScore) continue; // below the relevance floor → noise
    const key = dedupeKey(h.text);
    if (seen.has(key)) continue; // overlapping/duplicate chunk
    seen.add(key);
    results.push({ text: h.text, score: h.score, citation: h.source });
    if (results.length >= topK) break;
  }
  return { results };
}
