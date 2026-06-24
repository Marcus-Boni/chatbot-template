import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { title?: unknown };
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return new NextResponse("Título inválido", { status: 400 });
  }
  await db
    .update(conversations)
    .set({ title: body.title.trim().slice(0, 120) })
    .where(eq(conversations.id, id));
  return new NextResponse(null, { status: 204 });
}

