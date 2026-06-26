"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import {
  Brain,
  ClipboardList,
  ListChecks,
  Loader2,
  PenLine,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live "agent activity trail" — the step-by-step path the agent walks while it
 * answers (analyzing → searching transcripts → writing), in the style of the
 * better chat products (Perplexity/Claude/ChatGPT tool traces).
 *
 * Why a context provider (not a self-contained component): CopilotKit renders
 * the `icons.activityIcon` node in *two* spots depending on the turn phase — a
 * trailing indicator when the last message is the user/tool, and an in-message
 * indicator once an (empty) assistant message exists (see react-ui `Messages`).
 * The node therefore unmounts/remounts mid-run. Keeping the accumulated steps in
 * a stable provider (mounted once around `<CopilotChat>`) means the trail keeps
 * its history across those remounts; the rendered `<AgentActivityTrail>` is a
 * pure consumer.
 *
 * The steps are derived from the AG-UI agent lifecycle (`agent.subscribe`):
 * run start → reasoning → tool calls → text streaming → finalize.
 */

type StepStatus = "active" | "done";

interface ActivityStep {
  /** Stable identity, used to dedupe repeated lifecycle events. */
  key: string;
  label: string;
  Icon: LucideIcon;
  status: StepStatus;
}

interface AgentActivityValue {
  steps: ActivityStep[];
  running: boolean;
}

const AgentActivityContext = createContext<AgentActivityValue>({
  steps: [],
  running: false,
});

export function useAgentActivity(): AgentActivityValue {
  return useContext(AgentActivityContext);
}

/** Backend tool name → friendly PT-BR label + icon for the trail. */
const TOOL_META: Record<string, { label: string; Icon: LucideIcon }> = {
  searchMeetings: {
    label: "Buscando trechos nas transcrições",
    Icon: Search,
  },
  listMeetings: {
    label: "Consultando as reuniões indexadas",
    Icon: ListChecks,
  },
  proposeWorkItems: {
    label: "Preparando tarefas a partir da reunião",
    Icon: ClipboardList,
  },
};

const THINKING_STEP: ActivityStep = {
  key: "thinking",
  label: "Analisando sua pergunta",
  Icon: Brain,
  status: "active",
};

function toolMeta(name: string): { label: string; Icon: LucideIcon } {
  return TOOL_META[name] ?? { label: `Executando ${name}`, Icon: Sparkles };
}

export function AgentActivityProvider({ children }: { children: ReactNode }) {
  const { agent } = useAgent();
  const [steps, setSteps] = useState<ActivityStep[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!agent) return;

    const settle = (list: ActivityStep[]): ActivityStep[] =>
      list.map((s) =>
        s.status === "active" ? { ...s, status: "done" as const } : s,
      );

    /** Append a step (marking the previous active one done); dedupe by key. */
    const pushStep = (key: string, label: string, Icon: LucideIcon) =>
      setSteps((prev) => {
        if (prev.some((s) => s.key === key)) return prev;
        return [...settle(prev), { key, label, Icon, status: "active" }];
      });

    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelClear = () => {
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = undefined;
    };

    const sub = agent.subscribe({
      onRunInitialized: () => {
        cancelClear();
        setRunning(true);
        setSteps([THINKING_STEP]);
      },
      onReasoningStartEvent: () => {
        pushStep("reasoning", "Raciocinando sobre o contexto", Brain);
      },
      onToolCallStartEvent: ({ event }) => {
        const { label, Icon } = toolMeta(event.toolCallName);
        pushStep(`tool:${event.toolCallId}`, label, Icon);
      },
      onTextMessageStartEvent: () => {
        pushStep("writing", "Gerando a resposta fundamentada", PenLine);
      },
      onRunFinalized: () => {
        setSteps((prev) => settle(prev));
        // Let the final "done" state read for a beat, then clear so the trail
        // disappears once the answer is fully in view.
        cancelClear();
        clearTimer = setTimeout(() => {
          setSteps([]);
          setRunning(false);
        }, 250);
      },
      onRunFailed: () => {
        cancelClear();
        setRunning(false);
        setSteps([]);
      },
    });

    return () => {
      cancelClear();
      sub.unsubscribe();
    };
  }, [agent]);

  const value = useMemo<AgentActivityValue>(
    () => ({ steps, running }),
    [steps, running],
  );

  return (
    <AgentActivityContext.Provider value={value}>
      {children}
    </AgentActivityContext.Provider>
  );
}

function TypingDots() {
  return (
    <span aria-hidden className="copilot-typing-dots ml-0.5 inline-flex">
      <span className="copilot-typing-dot">.</span>
      <span className="copilot-typing-dot">.</span>
      <span className="copilot-typing-dot">.</span>
    </span>
  );
}

/**
 * Pure consumer rendered as CopilotKit's `icons.activityIcon`. Shows the live
 * step trail. Returns `null` when there's nothing in progress, so it adds no
 * chrome between turns.
 */
export function AgentActivityTrail({ active = false }: { active?: boolean }) {
  const { running, steps } = useAgentActivity();
  if (!active && !running && steps.length === 0) return null;

  const visibleSteps = steps.length > 0 ? steps : [THINKING_STEP];

  return (
    <span
      className="my-2 block w-full"
      role="status"
      aria-live="polite"
      aria-label="O assistente está trabalhando"
    >
      <span className="block rounded-xl border border-[var(--line)] bg-[var(--panel)]/80 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <ol className="m-0 flex list-none flex-col p-0">
          {visibleSteps.map((step, i) => {
            const isLast = i === visibleSteps.length - 1;
            const active = step.status === "active";
            const StepIcon = step.Icon;
            return (
              <li
                key={step.key}
                className="relative flex items-start gap-3 pb-2.5 last:pb-0"
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[0.6875rem] top-[1.375rem] h-[calc(100%-1rem)] w-px bg-[var(--line)]"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex size-[1.375rem] shrink-0 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-[var(--accent-line)] bg-[var(--accent-soft)]"
                      : "border-[var(--line)] bg-[var(--panel-2)]",
                  )}
                >
                  {active ? (
                    <Loader2 className="size-3 animate-spin text-[var(--accent-bright)]" />
                  ) : (
                    <StepIcon className="size-3 text-[var(--fg-subtle)]" />
                  )}
                </span>
                <span
                  className={cn(
                    "pt-[0.1875rem] text-[0.8125rem] leading-snug transition-colors",
                    active ? "text-[var(--fg)]" : "text-[var(--fg-muted)]",
                  )}
                >
                  {step.label}
                  {active && <TypingDots />}
                </span>
              </li>
            );
          })}
        </ol>
      </span>
    </span>
  );
}
