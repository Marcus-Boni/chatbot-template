import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { chunks, documents } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

/**
 * Reconstructs the readable transcript for a document from its stored chunks.
 * Chunks overlap by one turn (see chunk.ts), so we drop lines that exactly
 * repeat the previous one to avoid showing duplicated turns at the seams.
 */
function buildContent(rows: { text: string }[]): string {
  const lines: string[] = [];
  for (const row of rows) {
    for (const line of row.text.split("\n")) {
      if (lines.length === 0 || lines[lines.length - 1] !== line) {
        lines.push(line);
      }
    }
  }
  return lines.join("\n");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!document) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const chunkRows = await db
    .select({ text: chunks.text })
    .from(chunks)
    .where(eq(chunks.documentId, id))
    .orderBy(asc(chunks.chunkIndex));

  return NextResponse.json({
    document,
    content: buildContent(chunkRows),
    chunkCount: chunkRows.length,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { date?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  if (!("date" in body)) {
    return NextResponse.json({ error: "Campo 'date' é obrigatório" }, { status: 400 });
  }

  let date: Date | null = null;
  if (body.date) {
    // A plain calendar date (YYYY-MM-DD) is anchored to noon UTC so that
    // converting to any local timezone for display never shifts the day.
    const raw = /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? `${body.date}T12:00:00.000Z`
      : body.date;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }
    date = parsed;
  }

  const [updated] = await db
    .update(documents)
    .set({ date })
    .where(eq(documents.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ document: updated });
}
