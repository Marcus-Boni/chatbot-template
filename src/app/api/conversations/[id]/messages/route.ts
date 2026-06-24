import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(messages)
    .where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { id?: string; role: string; content: string; citations?: unknown };
  // The client passes the agent's stable message id so re-persisting the same
  // turn (e.g. after navigating away and back) is a no-op instead of a dup.
  const msgId = typeof body.id === "string" && body.id.length > 0 ? body.id : randomUUID();
  await db.insert(messages).values({
    id: msgId, conversationId: id, role: body.role, content: body.content,
    citations: body.citations ?? [],
  }).onConflictDoNothing();
  return NextResponse.json({ id: msgId });
}
