import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      messageCount: count(messages.id),
    })
    .from(conversations)
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .groupBy(conversations.id, conversations.title, conversations.createdAt)
    .orderBy(desc(conversations.createdAt));
  return NextResponse.json({ conversations: rows });
}
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    id?: unknown;
    title?: unknown;
  };
  // The client passes the agent's stable threadId as the id so creation is
  // idempotent across page navigation (same chat session → same row). Falls
  // back to a fresh UUID when no id is given.
  const id =
    typeof body.id === "string" && body.id.length > 0 ? body.id : randomUUID();
  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim().slice(0, 120)
      : undefined;
  await db
    .insert(conversations)
    .values(title ? { id, title } : { id })
    .onConflictDoNothing();
  return NextResponse.json({ id });
}
