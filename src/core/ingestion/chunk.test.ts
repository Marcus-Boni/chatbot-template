import { describe, it, expect } from "vitest";
import { chunkDocument } from "./chunk";
import type { RawDocument } from "@/core/loaders/types";

const doc: RawDocument = {
  id: "doc1",
  title: "Reunião Teste",
  date: "2026-06-03T12:03:09.000Z",
  content: "",
  metadata: { path: "/m.docx" },
  turns: [
    { speaker: "A | X", startSec: 9, text: "a".repeat(300) },
    { speaker: "B", startSec: 17, text: "b".repeat(300) },
    { speaker: "A | X", startSec: 30, text: "c".repeat(300) },
  ],
};

describe("chunkDocument", () => {
  it("groups turns under the char budget into one chunk", () => {
    const chunks = chunkDocument(doc, { maxChars: 1000, overlapTurns: 0 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].source.speakers).toEqual(["A | X", "B"]);
    expect(chunks[0].source.startTime).toBe("0:09");
    expect(chunks[0].source.endTime).toBe("0:30");
  });

  it("splits into multiple chunks when budget is exceeded, never splitting a turn", () => {
    const chunks = chunkDocument(doc, { maxChars: 350, overlapTurns: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].text).toContain("a".repeat(300));
    expect(chunks.every((c) => c.id.startsWith("doc1:"))).toBe(true);
  });

  it("sets sequential chunkIndex and stable ids", () => {
    const chunks = chunkDocument(doc, { maxChars: 350, overlapTurns: 0 });
    expect(chunks[0].source.chunkIndex).toBe(0);
    expect(chunks[1].source.chunkIndex).toBe(1);
    expect(chunks[0].id).toBe("doc1:0");
  });
});
