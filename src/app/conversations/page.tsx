import { ConversationsTable } from "@/components/conversations/ConversationsTable";

export default function ConversationsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--line)] px-5 py-4 sm:px-7">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
          Histórico de conversas
        </h1>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
          Visualize e gerencie as conversas registradas pelo copilot.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
        <div className="mx-auto w-full max-w-3xl">
          <ConversationsTable />
        </div>
      </div>
    </div>
  );
}
