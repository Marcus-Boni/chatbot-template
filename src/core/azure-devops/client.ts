import type {
  AzureDevOpsConfig,
  CreatedWorkItem,
  WorkItemDraft,
  WorkItemError,
} from "./types";

/**
 * Azure DevOps Work Items REST client (api-version 7.1).
 *
 * Kept thin and dependency-free: a pure `toPatchDocument` mapper (unit-tested)
 * plus `createWorkItems`, which POSTs one JSON-Patch document per item. The PAT
 * arrives via the resolved `AzureDevOpsConfig` (see `config.ts`); it is never
 * read from the environment here, so this stays pure-ish and testable.
 */

const API_VERSION = "7.1";

/** A single JSON Patch operation, as the Work Items API expects. */
export interface PatchOperation {
  op: "add";
  path: string;
  value: string | number;
}

/**
 * Maps a draft to the JSON-Patch document for `POST .../workitems/${type}`.
 * Pure — the primary unit-test target. Optional fields are only emitted when
 * present; area/iteration paths fall back to the config defaults.
 */
export function toPatchDocument(
  draft: WorkItemDraft,
  config: AzureDevOpsConfig,
): PatchOperation[] {
  const ops: PatchOperation[] = [
    { op: "add", path: "/fields/System.Title", value: draft.title.trim() },
  ];

  if (draft.description && draft.description.trim().length > 0) {
    ops.push({
      op: "add",
      path: "/fields/System.Description",
      value: draft.description.trim(),
    });
  }

  if (draft.tags && draft.tags.length > 0) {
    // Azure DevOps stores tags as a single "; "-separated string.
    ops.push({
      op: "add",
      path: "/fields/System.Tags",
      value: draft.tags.map((t) => t.trim()).filter(Boolean).join("; "),
    });
  }

  if (typeof draft.priority === "number") {
    ops.push({
      op: "add",
      path: "/fields/Microsoft.VSTS.Common.Priority",
      value: draft.priority,
    });
  }

  if (config.areaPath) {
    ops.push({ op: "add", path: "/fields/System.AreaPath", value: config.areaPath });
  }
  if (config.iterationPath) {
    ops.push({
      op: "add",
      path: "/fields/System.IterationPath",
      value: config.iterationPath,
    });
  }

  return ops;
}

/** Basic auth header for a PAT: base64 of ":<pat>". */
function authHeader(pat: string): string {
  return `Basic ${Buffer.from(`:${pat}`).toString("base64")}`;
}

/** URL-encode the work item type for the `/workitems/${type}` path segment. */
function workItemsUrl(config: AzureDevOpsConfig, type: string): string {
  const project = encodeURIComponent(config.project);
  const t = encodeURIComponent(`$${type}`);
  return `${config.orgUrl}/${project}/_apis/wit/workitems/${t}?api-version=${API_VERSION}`;
}

interface CreateOneResult {
  created?: CreatedWorkItem;
  error?: WorkItemError;
}

async function createOne(
  draft: WorkItemDraft,
  config: AzureDevOpsConfig,
): Promise<CreateOneResult> {
  const type = draft.type?.trim() || config.defaultWorkItemType;
  const title = draft.title.trim();
  if (!title) {
    return { error: { title: draft.title ?? "", message: "Título vazio." } };
  }

  try {
    const res = await fetch(workItemsUrl(config, type), {
      method: "POST",
      headers: {
        "Content-Type": "application/json-patch+json",
        Authorization: authHeader(config.pat),
      },
      body: JSON.stringify(toPatchDocument(draft, config)),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = parseAzureError(body) ?? `HTTP ${res.status}`;
      return { error: { title, message: detail } };
    }

    const data = (await res.json()) as {
      id: number;
      _links?: { html?: { href?: string } };
      url?: string;
    };
    return {
      created: {
        id: data.id,
        title,
        type,
        url: data._links?.html?.href ?? data.url ?? "",
      },
    };
  } catch (err) {
    return {
      error: { title, message: err instanceof Error ? err.message : "Falha de rede." },
    };
  }
}

/** Pull the human-readable `message` out of an Azure DevOps error body. */
function parseAzureError(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message ?? null;
  } catch {
    return body.slice(0, 300) || null;
  }
}

export interface CreateWorkItemsResult {
  created: CreatedWorkItem[];
  errors: WorkItemError[];
}

/**
 * Creates each draft as a separate work item. Fault-tolerant: one bad item does
 * not abort the rest — failures are collected in `errors`. Runs sequentially to
 * stay gentle on Azure DevOps rate limits (item counts are small).
 */
export async function createWorkItems(
  drafts: WorkItemDraft[],
  config: AzureDevOpsConfig,
): Promise<CreateWorkItemsResult> {
  const created: CreatedWorkItem[] = [];
  const errors: WorkItemError[] = [];

  for (const draft of drafts) {
    const { created: ok, error } = await createOne(draft, config);
    if (ok) created.push(ok);
    if (error) errors.push(error);
  }

  return { created, errors };
}
