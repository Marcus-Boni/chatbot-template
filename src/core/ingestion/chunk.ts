import type { ContextChunk } from "@/core/context-store/types";
import type { RawDocument, TranscriptTurn } from "@/core/loaders/types";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function turnText(t: TranscriptTurn): string {
  return `${t.speaker} (${fmt(t.startSec)}): ${t.text}`;
}

export interface ChunkOptions { maxChars?: number; overlapTurns?: number; }

export function chunkDocument(doc: RawDocument, opts: ChunkOptions = {}): ContextChunk[] {
  const maxChars = opts.maxChars ?? 2000;
  const overlap = opts.overlapTurns ?? 1;
  const chunks: ContextChunk[] = [];
  let group: TranscriptTurn[] = [];
  let size = 0;
  let index = 0;

  const flush = () => {
    if (group.length === 0) return;
    const speakers = [...new Set(group.map((t) => t.speaker))];
    chunks.push({
      id: `${doc.id}:${index}`,
      sourceId: doc.id,
      text: group.map(turnText).join("\n"),
      source: {
        meetingTitle: doc.title,
        date: doc.date ?? "",
        path: String(doc.metadata.path ?? ""),
        chunkIndex: index,
        speakers,
        startTime: fmt(group[0].startSec),
        endTime: fmt(group[group.length - 1].startSec),
      },
    });
    index++;
    group = overlap > 0 ? group.slice(-overlap) : [];
    size = group.reduce((acc, t) => acc + t.text.length, 0);
  };

  for (const turn of doc.turns) {
    if (size > 0 && size + turn.text.length > maxChars) flush();
    group.push(turn);
    size += turn.text.length;
  }
  flush();
  return chunks;
}
