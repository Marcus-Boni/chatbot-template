import { describe, it, expect } from "vitest";
import path from "node:path";
import { TeamsTranscriptDocxLoader } from "./teams-docx-loader";

describe("TeamsTranscriptDocxLoader", () => {
  it("loads a docx into a RawDocument with parsed turns", async () => {
    const dir = path.resolve(__dirname, "../../../test/fixtures");
    const loader = new TeamsTranscriptDocxLoader(dir);
    const docs = await loader.load();
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.title).toBe("Reunião Teste");
    expect(doc.date).toBe("2026-06-03T12:03:09.000Z");
    expect(doc.turns.length).toBeGreaterThanOrEqual(2);
    expect(doc.turns[0].speaker.length).toBeGreaterThan(0);
  });
});
