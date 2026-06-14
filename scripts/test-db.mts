import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = neon(url);

try {
  const [{ cnt }] = await sql`SELECT COUNT(*) as cnt FROM chunks`;
  console.log("chunks count:", cnt);

  if (Number(cnt) > 0) {
    const sample = await sql`SELECT id, document_id, chunk_index, left(text, 80) as preview FROM chunks LIMIT 3`;
    console.log("sample rows:", JSON.stringify(sample, null, 2));
  }
} catch (err) {
  console.error("DB ERROR:", err);
}
