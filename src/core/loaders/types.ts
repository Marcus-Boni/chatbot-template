export interface TranscriptTurn {
  speaker: string;
  startSec: number;
  text: string;
}

export interface RawDocument {
  id: string;
  title: string;
  date?: string; // ISO
  content: string;
  turns: TranscriptTurn[];
  metadata: Record<string, unknown>;
}

export interface Loader {
  load(): Promise<RawDocument[]>;
}
