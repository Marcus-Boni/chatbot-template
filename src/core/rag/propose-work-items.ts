import { getAzureDevOpsConfig } from "@/core/azure-devops/config";
import type { WorkItemDraft } from "@/core/azure-devops/types";

/**
 * Backend tool behind the `proposeWorkItems` agent tool.
 *
 * IMPORTANT: this is **pure / side-effect free** — it does NOT touch Azure
 * DevOps. It only normalizes the drafts the model inferred from the transcript
 * and attaches the (non-secret) target org/project so the generative-UI card can
 * say where the items will land. Actual creation happens later, server-side,
 * only after the user clicks "Criar no Azure DevOps" (see
 * `/api/azure-devops/work-items`). This human-in-the-loop split is deliberate:
 * the agent can never create work items on its own.
 */

export interface ProposeWorkItemsArgs {
  items: WorkItemDraft[];
}

export interface ProposeWorkItemsResponse {
  items: WorkItemDraft[];
  /** Where the items would be created — for display only. */
  organization?: string;
  project?: string;
  /** Default type applied to items the model left untyped. */
  defaultType: string;
  /** False when the integration env is missing — the card warns the user. */
  configured: boolean;
}

const MAX_ITEMS = 20;
const MAX_TITLE = 255;
const MAX_DESCRIPTION = 4000;

const clampStr = (s: string, max: number) =>
  s.trim().length > max ? s.trim().slice(0, max) : s.trim();

/** Normalize/validate model output: trim, cap lengths, drop empties. */
function normalize(items: WorkItemDraft[], defaultType: string): WorkItemDraft[] {
  return items
    .filter((it) => it && typeof it.title === "string" && it.title.trim().length > 0)
    .slice(0, MAX_ITEMS)
    .map((it) => {
      const draft: WorkItemDraft = { title: clampStr(it.title, MAX_TITLE) };
      const type = typeof it.type === "string" ? it.type.trim() : "";
      draft.type = type || defaultType;
      if (typeof it.description === "string" && it.description.trim()) {
        draft.description = clampStr(it.description, MAX_DESCRIPTION);
      }
      if (Array.isArray(it.tags)) {
        const tags = it.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.trim())
          .filter(Boolean);
        if (tags.length > 0) draft.tags = tags;
      }
      if (typeof it.priority === "number" && it.priority >= 1 && it.priority <= 4) {
        draft.priority = Math.round(it.priority);
      }
      return draft;
    });
}

export function proposeWorkItems(
  args: ProposeWorkItemsArgs,
): ProposeWorkItemsResponse {
  const result = getAzureDevOpsConfig();
  const defaultType = result.ok ? result.config.defaultWorkItemType : "Task";

  return {
    items: normalize(args.items ?? [], defaultType),
    organization: result.ok ? result.config.organization : undefined,
    project: result.ok ? result.config.project : undefined,
    defaultType,
    configured: result.ok,
  };
}
