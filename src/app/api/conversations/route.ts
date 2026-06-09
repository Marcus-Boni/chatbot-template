import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
  return NextResponse.json({ conversations: rows });
}
export async function POST() {
  const id = randomUUID();
  await db.insert(conversations).values({ id });
  return NextResponse.json({ id });
}
