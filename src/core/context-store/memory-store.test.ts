import { describe } from "vitest";
import { InMemoryStore } from "./memory-store";
import { runContextStoreContract } from "./contract";

// Deterministic fake embedder: bag-of-words vector over a fixed vocab.
const vocab = ["cat", "dog", "animals", "invoice", "tax", "alpha", "beta", "old", "new"];
const fakeEmbedder = {
  embed: async (texts: string[]) =>
    texts.map((t) => {
      const words = t.toLowerCase().split(/\s+/);
      return vocab.map((v) => (words.includes(v) ? 1 : 0));
    }),
};

describe("InMemoryStore", () => {
  runContextStoreContract(() => new InMemoryStore(fakeEmbedder));
});
