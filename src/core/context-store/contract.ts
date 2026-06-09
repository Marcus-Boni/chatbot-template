import { expect, it } from "vitest";
import type { ContextChunk, ContextStore } from "./types";

function chunk(id: string, sourceId: string, text: string): ContextChunk {
  return {
    id,
    sourceId,
    text,
    source: {
      meetingTitle: "m",
      date: "2026-06-03T12:03:09.000Z",
      path: "/m.docx",
      chunkIndex: 0,
      speakers: ["A"],
      startTime: "0:00",
      endTime: "0:10",
    },
  };
}

// Runs the shared behavioral contract against any ContextStore factory.
export function runContextStoreContract(makeStore: () => Promise<ContextStore> | ContextStore) {
  it("returns the most similar chunk first", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "cat dog"), chunk("2", "s1", "invoice tax")]);
    const results = await store.search("animals cat", { topK: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("cat dog");
  });

  it("clears chunks by sourceId only", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "alpha"), chunk("2", "s2", "beta")]);
    await store.clear("s1");
    const results = await store.search("alpha beta", { topK: 5 });
    expect(results.map((r) => r.text)).toEqual(["beta"]);
  });

  it("upsert replaces a chunk with the same id", async () => {
    const store = await makeStore();
    await store.upsert([chunk("1", "s1", "old")]);
    await store.upsert([chunk("1", "s1", "new")]);
    const results = await store.search("new", { topK: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("new");
  });
}
