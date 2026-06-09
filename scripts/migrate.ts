import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  // drizzle-kit migrations applied via `drizzle-kit migrate` in CI/local after this.
  console.log("pgvector extension ensured.");
}
main();
