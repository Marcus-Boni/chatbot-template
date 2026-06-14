import { createContextStore } from "../src/core/context-store/factory.js";
import { searchMeetings } from "../src/core/rag/search-meetings.js";

async function main() {
  console.log("Creating store...");
  const store = createContextStore();
  console.log("Store created. Running search...");
  const result = await searchMeetings(store, { query: "Quais decisoes foram tomadas na ultima reuniao" });
  console.log("Results count:", result.results.length);
  for (const r of result.results) {
    console.log(`  score=${r.score.toFixed(3)} source=${r.citation.path}`);
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
