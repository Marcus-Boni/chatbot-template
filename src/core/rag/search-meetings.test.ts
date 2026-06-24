import { describe, it, expect } from "vitest";
import { searchMeetings } from "./search-meetings";
import { InMemoryStore } from "@/core/context-store/memory-store";

const vocab = ["coleta", "transportador", "boleto"];
const fakeEmbedder = {
  embed: async (texts: string[]) =>
    texts.map((t) => vocab.map((v) => (t.toLowerCase().includes(v) ? 1 : 0))),
};

describe("searchMeetings", () => {
  it("returns formatted results with citations", async () => {
    const store = new InMemoryStore(fakeEmbedder);
    await store.upsert([{
      id: "1", sourceId: "s1", text: "fluxo do transportador definido",
      source: { meetingTitle: "Reunião A", date: "2026-06-03T12:03:09.000Z", path: "/a.docx",
        chunkIndex: 0, speakers: ["Bruno"], startTime: "7:38", endTime: "8:00" },
    }]);
    const res = await searchMeetings(store, { query: "transportador", topK: 3 });
    expect(res.results).toHaveLength(1);
    expect(res.results[0].citation.meetingTitle).toBe("Reunião A");
    expect(res.results[0].text).toContain("transportador");
  });

  it("signals when nothing relevant is found", async () => {
    const store = new InMemoryStore(fakeEmbedder);
    const res = await searchMeetings(store, { query: "boleto", topK: 3 });
    expect(res.results).toHaveLength(0);
  });

  it("collapses duplicate excerpts to a single result", async () => {
    const store = new InMemoryStore(fakeEmbedder);
    const src = {
      meetingTitle: "Reunião A", date: "2026-06-03T12:03:09.000Z", path: "/a.docx",
      chunkIndex: 0, speakers: ["Bruno"], startTime: "7:38", endTime: "8:00",
    };
    await store.upsert([
      { id: "1", sourceId: "s1", text: "fluxo do transportador definido", source: { ...src, chunkIndex: 0 } },
      { id: "2", sourceId: "s1", text: "fluxo do transportador definido", source: { ...src, chunkIndex: 1 } },
    ]);
    const res = await searchMeetings(store, { query: "transportador", topK: 5 });
    expect(res.results).toHaveLength(1);
  });
});
