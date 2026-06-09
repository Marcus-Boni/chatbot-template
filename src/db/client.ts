import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Initialize the Neon client LAZILY, on first use, NOT at module import time.
// Calling `neon(process.env.DATABASE_URL!)` at module scope forces `DATABASE_URL`
// to be present at BUILD time, which breaks `next build` (page-data collection
// imports route modules that transitively import this file). The Proxy keeps the
// `db.<method>()` call sites unchanged while deferring construction until a query
// actually runs at request time.
let _db: Db | undefined;
function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. It is required at request time to connect to Neon.",
      );
    }
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
}) as Db;
