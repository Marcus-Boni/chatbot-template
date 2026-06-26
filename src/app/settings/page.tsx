import { SettingsView } from "@/components/settings/SettingsView";

export default function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--line)] px-5 py-4 sm:px-7">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--fg)]">
          Configurações
        </h1>
        <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
          Personalize o assistente, a aparência e o comportamento do chat.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
        <SettingsView />
      </div>
    </div>
  );
}
