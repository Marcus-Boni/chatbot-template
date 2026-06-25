import { NextResponse, type NextRequest } from "next/server";
import { getAzureDevOpsConfig, getAzureDevOpsStatus } from "@/core/azure-devops/config";
import { createWorkItems } from "@/core/azure-devops/client";
import type { WorkItemDraft } from "@/core/azure-devops/types";

/**
 * Azure DevOps work-item creation endpoint.
 *
 * This is the ONLY place that actually creates work items, and it runs entirely
 * server-side so the PAT never reaches the browser. It's triggered by an
 * explicit user click in the proposal card — the human-in-the-loop confirmation
 * step. The agent's `proposeWorkItems` tool only structures drafts; nothing is
 * created until this route is hit.
 *
 * Like the other API routes in this template, there is intentionally no auth
 * (see CLAUDE.md "Known gaps") — add it before exposing the deployment publicly.
 */

/** Lightweight status so the UI can tell whether the integration is wired. */
export function GET() {
  return NextResponse.json(getAzureDevOpsStatus());
}

function parseItems(raw: unknown): WorkItemDraft[] | null {
  if (!raw || typeof raw !== "object") return null;
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const drafts: WorkItemDraft[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const title = (it as { title?: unknown }).title;
    if (typeof title !== "string" || title.trim().length === 0) continue;
    const draft: WorkItemDraft = { title: title.trim() };
    const { description, type, tags, priority } = it as Record<string, unknown>;
    if (typeof description === "string" && description.trim()) draft.description = description;
    if (typeof type === "string" && type.trim()) draft.type = type.trim();
    if (Array.isArray(tags)) draft.tags = tags.filter((t): t is string => typeof t === "string");
    if (typeof priority === "number") draft.priority = priority;
    drafts.push(draft);
  }
  return drafts;
}

export async function POST(req: NextRequest) {
  const config = getAzureDevOpsConfig();
  if (!config.ok) {
    return NextResponse.json({ error: config.error }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const items = parseItems(body);
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Nenhum work item válido informado." },
      { status: 400 },
    );
  }

  const { created, errors } = await createWorkItems(items, config.config);
  return NextResponse.json({ created, errors });
}
