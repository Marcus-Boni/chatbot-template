import { describe, it, expect, vi } from "vitest";
import { OpenAIEmbedder } from "./embed";

describe("OpenAIEmbedder", () => {
  it("maps texts to vectors via the embeddings API", async () => {
    const create = vi.fn().mockResolvedValue({ data: [{ embedding: [1, 2] }, { embedding: [3, 4] }] });
    const fakeClient = { embeddings: { create } } as never;
    const embedder = new OpenAIEmbedder(fakeClient, "text-embedding-3-small");
    const vectors = await embedder.embed(["a", "b"]);
    expect(vectors).toEqual([[1, 2], [3, 4]]);
    expect(create).toHaveBeenCalledWith({ model: "text-embedding-3-small", input: ["a", "b"] });
  });
});
