/**
 * Types for the Azure DevOps work-item integration.
 *
 * The AI proposes `WorkItemDraft`s (no side effect); the user confirms in the
 * generative-UI card; the server route then creates them and returns
 * `CreatedWorkItem`s. The PAT lives only in `AzureDevOpsConfig`, which is built
 * server-side (see `config.ts`) and never reaches client code.
 */

/** Work item types we accept from the model. Default deployment uses "Task". */
export type WorkItemType = string;

/**
 * A single work item proposed by the model from the transcript — pure data,
 * nothing has been created yet. Mirrors the few Azure DevOps fields we set.
 */
export interface WorkItemDraft {
  title: string;
  description?: string;
  /** Defaults to the configured `defaultWorkItemType` when omitted. */
  type?: WorkItemType;
  tags?: string[];
  /** Azure DevOps priority: 1 (highest) – 4 (lowest). */
  priority?: number;
}

/** A work item that was successfully created in Azure DevOps. */
export interface CreatedWorkItem {
  id: number;
  title: string;
  type: WorkItemType;
  /** Browser URL (`_links.html.href`) — opens the item in Azure DevOps. */
  url: string;
}

/** A draft that failed to be created, with a human-readable reason. */
export interface WorkItemError {
  title: string;
  message: string;
}

/**
 * Resolved server-side configuration for the integration. Built from env vars
 * by `getAzureDevOpsConfig()`. `pat` is secret and must never be serialized to
 * the client.
 */
export interface AzureDevOpsConfig {
  /** Organization base URL, e.g. `https://dev.azure.com/myorg` (no trailing slash). */
  orgUrl: string;
  /** Display name of the organization, derived from `orgUrl`. */
  organization: string;
  project: string;
  pat: string;
  defaultWorkItemType: WorkItemType;
  areaPath?: string;
  iterationPath?: string;
}

/** Non-secret view of the config, safe to send to the client (UI status). */
export interface AzureDevOpsPublicStatus {
  configured: boolean;
  organization?: string;
  project?: string;
}
