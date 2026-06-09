import { pgTable, text, timestamp, integer, jsonb, vector, index } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }),
  path: text("path").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  source: jsonb("source").notNull(),
}, (t) => [
  index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
]);

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("Nova conversa"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
