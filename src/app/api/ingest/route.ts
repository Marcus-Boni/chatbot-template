import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { documents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { runIngestion } from "@/core/ingestion/pipeline";

export async function GET() {
  const rows = await db.select().from(documents).orderBy(desc(documents.indexedAt));
  return NextResponse.json({ documents: rows });
}

export async function POST() {
  const result = await runIngestion();
  return NextResponse.json(result);
}
