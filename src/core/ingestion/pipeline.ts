import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { sql } from "drizzle-orm";
import { TeamsTranscriptDocxLoader } from "@/core/loaders/teams-docx-loader";
import { chunkDocument } from "./chunk";
import { createContextStore } from "@/core/context-store/factory";
import { appConfig } from "@/config/app.config";

export async function runIngestion(): Promise<{ documents: number; chunks: number }> {
  const loader = new TeamsTranscriptDocxLoader(appConfig.dataSource.transcriptsDir);
  const store = createContextStore();
  const docs = await loader.load();
  let chunkCount = 0;
  for (const doc of docs) {
    await store.clear(doc.id); // idempotent reindex
    const chunks = chunkDocument(doc);
    await store.upsert(chunks);
    chunkCount += chunks.length;
    await db.insert(documents).values({
      id: doc.id, title: doc.title, date: doc.date ? new Date(doc.date) : null,
      path: String(doc.metadata.path ?? ""), metadata: doc.metadata,
    }).onConflictDoUpdate({
      target: documents.id,
      set: { title: doc.title, indexedAt: sql`now()`, metadata: doc.metadata },
    });
  }
  return { documents: docs.length, chunks: chunkCount };
}
