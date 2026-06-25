import "server-only";
import type { AzureDevOpsConfig, AzureDevOpsPublicStatus } from "./types";

/**
 * Server-only resolver for the Azure DevOps integration config.
 *
 * Reads the PAT and connection settings from the environment at call time (lazy,
 * like the rest of the project — keeps the build working without env vars). The
 * `server-only` import guarantees this module can never be bundled into client
 * code, so the PAT cannot leak.
 *
 * Required env:
 *   AZURE_DEVOPS_ORG_URL   e.g. https://dev.azure.com/myorg
 *   AZURE_DEVOPS_PROJECT   project name
 *   AZURE_DEVOPS_PAT       Personal Access Token (scope: Work Items → Read & write)
 * Optional env:
 *   AZURE_DEVOPS_DEFAULT_WORK_ITEM_TYPE  (default "Task")
 *   AZURE_DEVOPS_AREA_PATH
 *   AZURE_DEVOPS_ITERATION_PATH
 */

export type ConfigResult =
  | { ok: true; config: AzureDevOpsConfig }
  | { ok: false; error: string };

/** Strip a trailing slash and pull the org name out of the URL's last segment. */
function parseOrgUrl(raw: string): { orgUrl: string; organization: string } {
  const orgUrl = raw.trim().replace(/\/+$/, "");
  const organization = orgUrl.split("/").filter(Boolean).pop() ?? orgUrl;
  return { orgUrl, organization };
}

export function getAzureDevOpsConfig(): ConfigResult {
  const rawOrgUrl = process.env.AZURE_DEVOPS_ORG_URL?.trim();
  const project = process.env.AZURE_DEVOPS_PROJECT?.trim();
  const pat = process.env.AZURE_DEVOPS_PAT?.trim();

  const missing: string[] = [];
  if (!rawOrgUrl) missing.push("AZURE_DEVOPS_ORG_URL");
  if (!project) missing.push("AZURE_DEVOPS_PROJECT");
  if (!pat) missing.push("AZURE_DEVOPS_PAT");
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Integração com o Azure DevOps não configurada. Defina ${missing.join(", ")} no .env.`,
    };
  }

  const { orgUrl, organization } = parseOrgUrl(rawOrgUrl!);

  return {
    ok: true,
    config: {
      orgUrl,
      organization,
      project: project!,
      pat: pat!,
      defaultWorkItemType:
        process.env.AZURE_DEVOPS_DEFAULT_WORK_ITEM_TYPE?.trim() || "Task",
      areaPath: process.env.AZURE_DEVOPS_AREA_PATH?.trim() || undefined,
      iterationPath: process.env.AZURE_DEVOPS_ITERATION_PATH?.trim() || undefined,
    },
  };
}

/** Non-secret status for the UI — never includes the PAT. */
export function getAzureDevOpsStatus(): AzureDevOpsPublicStatus {
  const result = getAzureDevOpsConfig();
  if (!result.ok) return { configured: false };
  return {
    configured: true,
    organization: result.config.organization,
    project: result.config.project,
  };
}
