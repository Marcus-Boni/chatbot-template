import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import mammoth from "mammoth";
import type { Loader, RawDocument } from "./types";
import { parseTitle, parseDateFromTitle, parseTurns } from "./teams-parser";

export class TeamsTranscriptDocxLoader implements Loader {
  constructor(private dir: string) {}

  async load(): Promise<RawDocument[]> {
    const entries = await readdir(this.dir);
    const files = entries.filter(
      (f) => f.toLowerCase().endsWith(".docx") && !f.startsWith("~$"),
    );
    const docs: RawDocument[] = [];
    for (const file of files) {
      const full = path.join(this.dir, file);
      const buffer = await readFile(full);
      const { value: text } = await mammoth.extractRawText({ buffer });
      const lines = text.split("\n");
      const firstLine = lines[0] ?? "";
      const body = lines.slice(1).join("\n");
      docs.push({
        id: createHash("sha1").update(full).digest("hex"),
        title: parseTitle(firstLine),
        date: parseDateFromTitle(firstLine),
        content: text,
        turns: parseTurns(body),
        metadata: { path: full, fileName: file },
      });
    }
    return docs;
  }
}
