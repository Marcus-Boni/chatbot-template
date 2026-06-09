"use client";
import { useEffect, useState } from "react";

interface DocRow { id: string; title: string; date: string | null; indexedAt: string; }

export function SourcesTable() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/ingest");
    const data = await res.json();
    setDocs(data.documents);
  };
  useEffect(() => { void load(); }, []);

  const reindex = async () => {
    setBusy(true);
    await fetch("/api/ingest", { method: "POST" });
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={reindex} disabled={busy}
        className="rounded-md bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Indexando..." : "Reindexar transcrições"}
      </button>
      <ul className="divide-y rounded-md border">
        {docs.map((d) => (
          <li key={d.id} className="flex justify-between p-3 text-sm">
            <span className="font-medium">{d.title}</span>
            <span className="text-muted-foreground">{d.date?.slice(0, 10) ?? "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
