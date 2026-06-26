"use client";

import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import type { ProposeWorkItemsResponse } from "@/core/rag/propose-work-items";
import { WorkItemProposalCard } from "./WorkItemProposalCard";

/**
 * Generative-UI wiring for the backend `proposeWorkItems` tool (same pattern as
 * SearchMeetingsRender). In the v2 API the tool `result` arrives as a JSON
 * string when `status === "complete"` — parse it into a ProposeWorkItemsResponse
 * and hand it to the interactive (human-in-the-loop) proposal card.
 */
export function WorkItemsProposalRender() {
  useRenderTool({
    name: "proposeWorkItems",
    parameters: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          type: z.string().optional(),
          tags: z.array(z.string()).optional(),
          priority: z.number().optional(),
        }),
      ),
    }),
    render: ({ status, result }) => {
      // Progress is shown centrally by <AgentActivityTrail>; render only the
      // final, interactive proposal card here.
      if (status === "inProgress" || status === "executing") {
        return <span hidden />;
      }

      let payload: ProposeWorkItemsResponse | undefined;
      try {
        payload = typeof result === "string" ? JSON.parse(result) : (result as ProposeWorkItemsResponse);
      } catch {
        payload = undefined;
      }

      if (!payload || payload.items.length === 0) {
        return (
          <div className="my-2 flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--fg-muted)]">
            Nenhuma tarefa foi identificada para criar.
          </div>
        );
      }

      return <WorkItemProposalCard payload={payload} />;
    },
  });

  return null;
}
