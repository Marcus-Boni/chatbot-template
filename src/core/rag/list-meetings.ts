import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { documents } from "@/db/schema";

export interface MeetingInfo {
  id: string;
  title: string;
  date: string | null; // ISO date, or null when the transcript had no date
}

export interface ListMeetingsResponse {
  meetings: MeetingInfo[];
}

/**
 * Lists indexed meetings ordered by date (most recent first).
 *
 * Powers temporal/overview questions ("the last meeting", "summarize the recent
 * ones") that semantic search alone can't answer — the model lists meetings,
 * picks the relevant dates, then searches their content with `searchMeetings`.
 *
 * Queries the `documents` table directly (same pattern as the ingestion
 * pipeline); DB access stays lazy, so the build still works without env vars.
 */
export async function listMeetings(limit = 50): Promise<ListMeetingsResponse> {
  const rows = await db
    .select({ id: documents.id, title: documents.title, date: documents.date })
    .from(documents)
    .orderBy(desc(documents.date))
    .limit(limit);

  return {
    meetings: rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date ? r.date.toISOString() : null,
    })),
  };
}
