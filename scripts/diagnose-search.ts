/**
 * Diagnóstico do pipeline de busca RAG.
 * Executa: pnpm tsx scripts/diagnose-search.ts
 */
import "dotenv/config";
import { createContextStore } from "../src/core/context-store/factory";
import { db } from "../src/db/client";
import { chunks, documents } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("\n=== Diagnóstico RAG ===\n");

  // 1. Contar documentos e chunks no banco
  const [docCount] = await db.select({ count: sql<number>`count(*)` }).from(documents);
  const [chunkCount] = await db.select({ count: sql<number>`count(*)` }).from(chunks);

  console.log(`Documentos na tabela: ${docCount.count}`);
  console.log(`Chunks na tabela:     ${chunkCount.count}`);

  if (Number(chunkCount.count) === 0) {
    console.log("\n❌ Nenhum chunk encontrado. Execute `pnpm run ingest` primeiro.");
    process.exit(1);
  }

  // 2. Mostrar uma amostra de chunks
  console.log("\n--- Amostra de chunks (primeiros 3) ---");
  const sample = await db
    .select({ id: chunks.id, text: chunks.text, source: chunks.source })
    .from(chunks)
    .limit(3);
  for (const c of sample) {
    console.log(`  id: ${c.id}`);
    console.log(`  text: ${String(c.text).slice(0, 120)}...`);
    console.log(`  source: ${JSON.stringify(c.source)}`);
    console.log();
  }

  // 3. Testar a busca com queries reais
  const store = createContextStore();
  const queries = ["decisões", "última reunião", "transportador", "fluxo"];

  for (const query of queries) {
    const results = await store.search(query, { topK: 3 });
    const best = results[0];
    console.log(`Query: "${query}"`);
    if (!best) {
      console.log("  → NENHUM resultado");
    } else {
      console.log(`  → Melhor score: ${best.score.toFixed(4)}`);
      console.log(`  → Texto: ${best.text.slice(0, 100)}...`);
    }
  }

  // 4. Testar com MIN_SCORE = 0.01 (o filtro em search-meetings.ts)
  console.log("\n--- Resultados COM filtro MIN_SCORE=0.01 ---");
  const hits = await store.search("decisões tomadas reunião", { topK: 5 });
  const filtered = hits.filter(h => h.score > 0.01);
  console.log(`Hits brutos: ${hits.length}, após filtro: ${filtered.length}`);
  hits.forEach((h, i) => console.log(`  [${i}] score=${h.score.toFixed(4)} text="${h.text.slice(0, 80)}..."`));
}

main().catch(console.error).finally(() => process.exit(0));
