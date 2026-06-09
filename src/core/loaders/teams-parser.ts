import type { TranscriptTurn } from "./types";

const SUFFIX_RE = /-\d{8}_\d{6}UTC-Meeting Recording\s*$/;
const TIMESTAMP_IN_TITLE_RE = /-(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})UTC-/;
// numeric prefix? + speaker + 2+ spaces + timestamp + rest
const TURN_RE = /^(?:\d+)?\s*(.+?)\s{2,}(\d{1,2}:\d{2}(?::\d{2})?)(.*)$/;

export function parseTitle(firstLine: string): string {
  return firstLine.replace(SUFFIX_RE, "");
}

export function parseDateFromTitle(firstLine: string): string | undefined {
  const m = firstLine.match(TIMESTAMP_IN_TITLE_RE);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)).toISOString();
}

export function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function parseTurns(body: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(TURN_RE);
    if (!m) continue;
    const [, speaker, ts, text] = m;
    turns.push({ speaker: speaker.trim(), startSec: timestampToSeconds(ts), text: text.trim() });
  }
  return turns;
}
