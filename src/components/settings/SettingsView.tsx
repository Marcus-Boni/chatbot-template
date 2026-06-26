"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Palette,
  Database,
  Info,
  Download,
  Trash2,
  RotateCcw,
  Check,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Drama,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { appConfig } from "@/config/app.config";
import { useConversations } from "@/components/conversations/ConversationsContext";
import { useSettings } from "./SettingsContext";
import {
  ACCENT_PALETTES,
  type AccentKey,
  type Length,
  type Tone,
  type FontScale,
} from "./types";
import { PERSONA_PLUGIN_LIST, type PersonaId } from "./personas";
import {
  Row,
  Section,
  Segmented,
  Slider,
  Switch,
  TextArea,
  TextField,
  useFieldId,
} from "./primitives";
import { cn } from "@/lib/utils";

const TONE_OPTIONS: ReadonlyArray<{ value: Tone; label: string }> = [
  { value: "padrao", label: "Padrão" },
  { value: "profissional", label: "Profissional" },
  { value: "amigavel", label: "Amigável" },
  { value: "direto", label: "Direto" },
  { value: "tecnico", label: "Técnico" },
];

const LENGTH_OPTIONS: ReadonlyArray<{ value: Length; label: string }> = [
  { value: "conciso", label: "Conciso" },
  { value: "equilibrado", label: "Equilibrado" },
  { value: "detalhado", label: "Detalhado" },
];

const FONT_OPTIONS: ReadonlyArray<{ value: FontScale; label: string }> = [
  { value: "compacto", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "confortavel", label: "Confortável" },
];

export function SettingsView() {
  const { settings, update } = useSettings();

  const nicknameId = useFieldId("nickname");
  const aboutId = useFieldId("about");
  const customId = useFieldId("custom");
  const ctxCountId = useFieldId("ctxcount");
  const topKId = useFieldId("topk");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-16">
      {/* ── Persona / Plugin ─────────────────────────────────────── */}
      <Section
        icon={Drama}
        title="Persona do assistente"
        description="Escolha a lente que o assistente usa para interpretar e organizar as reuniões. Não altera as regras de fundamentação e citação."
      >
        <div className="p-4">
          <PersonaPicker
            value={settings.personaId}
            onChange={(v) => update("personaId", v)}
          />
        </div>
      </Section>

      {/* ── Personalização ───────────────────────────────────────── */}
      <Section
        icon={Sparkles}
        title="Personalização"
        description="Molde como o assistente conversa com você. Estas preferências são aplicadas a cada resposta."
      >
        <Row
          stacked
          label="Como devemos te chamar?"
          htmlFor={nicknameId}
          hint="O assistente usará este nome ao se dirigir a você."
          control={
            <TextField
              id={nicknameId}
              value={settings.nickname}
              onChange={(v) => update("nickname", v)}
              placeholder="Ex.: Marcus"
              maxLength={60}
            />
          }
        />
        <Row
          stacked
          label="O que o assistente deve saber sobre você?"
          htmlFor={aboutId}
          hint="Seu papel, projetos ou contexto que ajudem a personalizar as respostas."
          control={
            <TextArea
              id={aboutId}
              value={settings.aboutYou}
              onChange={(v) => update("aboutYou", v)}
              placeholder="Ex.: Sou gerente de operações e acompanho as decisões sobre o fluxo do transportador."
              maxLength={500}
              rows={3}
            />
          }
        />
        <Row
          stacked
          label="Instruções personalizadas"
          htmlFor={customId}
          hint="Como o assistente deve responder. Estas instruções nunca sobrepõem as regras de fundamentação e citação."
          control={
            <TextArea
              id={customId}
              value={settings.customInstructions}
              onChange={(v) => update("customInstructions", v)}
              placeholder="Ex.: Sempre destaque prazos e responsáveis em negrito e finalize com os próximos passos."
              maxLength={800}
              rows={4}
            />
          }
        />
        <Row
          stacked
          label="Tom das respostas"
          control={
            <Segmented
              ariaLabel="Tom das respostas"
              value={settings.tone}
              onChange={(v) => update("tone", v)}
              options={TONE_OPTIONS}
            />
          }
        />
        <Row
          stacked
          label="Tamanho das respostas"
          control={
            <Segmented
              ariaLabel="Tamanho das respostas"
              value={settings.length}
              onChange={(v) => update("length", v)}
              options={LENGTH_OPTIONS}
            />
          }
        />
      </Section>

      {/* ── Comportamento do chat ────────────────────────────────── */}
      <Section
        icon={Search}
        title="Comportamento do chat"
        description="Controle a memória entre conversas, sugestões e o rigor das citações."
      >
        <Row
          label="Pegar contexto das conversas anteriores?"
          htmlFor="ctx-toggle"
          hint="Ao iniciar uma conversa, o assistente recebe um resumo das conversas recentes como memória de continuidade (não substitui as transcrições)."
          control={
            <Switch
              id="ctx-toggle"
              label="Pegar contexto das conversas anteriores"
              checked={settings.useConversationContext}
              onChange={(v) => update("useConversationContext", v)}
            />
          }
        />
        {settings.useConversationContext && (
          <Row
            label="Quantas conversas considerar"
            htmlFor={ctxCountId}
            hint="Mais conversas dão mais memória, mas aumentam o tamanho do contexto."
            control={
              <Slider
                id={ctxCountId}
                value={settings.conversationContextCount}
                min={1}
                max={8}
                onChange={(v) => update("conversationContextCount", v)}
              />
            }
          />
        )}
        <Row
          label="Mostrar perguntas sugeridas"
          htmlFor="sugg-toggle"
          hint="Exibe atalhos de perguntas ao abrir uma nova conversa."
          control={
            <Switch
              id="sugg-toggle"
              label="Mostrar perguntas sugeridas"
              checked={settings.showSuggestions}
              onChange={(v) => update("showSuggestions", v)}
            />
          }
        />
        <Row
          label="Reforçar citações"
          htmlFor="cite-toggle"
          hint="Pede ao assistente que cite a reunião e a data em cada fato afirmado."
          control={
            <Switch
              id="cite-toggle"
              label="Reforçar citações"
              checked={settings.alwaysCite}
              onChange={(v) => update("alwaysCite", v)}
            />
          }
        />
      </Section>

      {/* ── Recuperação ──────────────────────────────────────────── */}
      <Section
        icon={Database}
        title="Recuperação (avançado)"
        description="Ajuste fino de como o assistente busca trechos nas transcrições."
      >
        <Row
          label="Trechos preferidos por busca"
          htmlFor={topKId}
          hint="Dica enviada ao assistente sobre quantos trechos recuperar a cada busca. Valores altos trazem mais contexto e custam mais."
          control={
            <Slider
              id={topKId}
              value={settings.preferredTopK}
              min={1}
              max={12}
              onChange={(v) => update("preferredTopK", v)}
            />
          }
        />
      </Section>

      {/* ── Aparência ────────────────────────────────────────────── */}
      <Section
        icon={Palette}
        title="Aparência"
        description="Personalize o visual do console. Aplicado imediatamente."
      >
        <Row
          stacked
          label="Cor de destaque"
          hint="Define o acento usado em botões, links e realces."
          control={<AccentPicker value={settings.accent} onChange={(v) => update("accent", v)} />}
        />
        <Row
          stacked
          label="Tamanho do texto do chat"
          control={
            <Segmented
              ariaLabel="Tamanho do texto"
              value={settings.fontScale}
              onChange={(v) => update("fontScale", v)}
              options={FONT_OPTIONS}
            />
          }
        />
        <Row
          label="Reduzir animações"
          htmlFor="motion-toggle"
          hint="Desativa transições e animações em toda a interface."
          control={
            <Switch
              id="motion-toggle"
              label="Reduzir animações"
              checked={settings.reduceMotion}
              onChange={(v) => update("reduceMotion", v)}
            />
          }
        />
      </Section>

      {/* ── Dados ────────────────────────────────────────────────── */}
      <DataSection />

      {/* ── Sobre ────────────────────────────────────────────────── */}
      <AboutSection />
    </div>
  );
}

/* ── Persona picker ───────────────────────────────────────────────────── */
function PersonaPicker({
  value,
  onChange,
}: {
  value: PersonaId;
  onChange: (next: PersonaId) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Persona do assistente"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      {PERSONA_PLUGIN_LIST.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.id)}
            className={cn(
              "group flex cursor-pointer flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
              active
                ? "border-[var(--accent-line)] bg-[var(--accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "border-[var(--line)] bg-[var(--bg)]/40 hover:border-white/[0.1] hover:bg-white/[0.04]",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--fg)]">
                  {p.label}
                </span>
                <span className="block truncate font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                  {p.role}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active
                    ? "border-[var(--accent-line)] bg-[var(--accent)] text-white"
                    : "border-[var(--line-strong)]",
                )}
              >
                {active && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
            </div>
            <span className="text-xs leading-relaxed text-[var(--fg-muted)]">
              {p.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Accent picker ────────────────────────────────────────────────────── */
function AccentPicker({
  value,
  onChange,
}: {
  value: AccentKey;
  onChange: (next: AccentKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {Object.values(ACCENT_PALETTES).map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            aria-pressed={active}
            aria-label={p.label}
            title={p.label}
            className={cn(
              "group relative flex size-10 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]",
              active ? "ring-2 ring-offset-2 ring-offset-[var(--bg-elevated)]" : "",
            )}
            style={{
              backgroundColor: p.swatch,
              boxShadow: active ? `0 0 0 2px ${p.swatch}` : undefined,
            }}
          >
            {active && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Data controls ────────────────────────────────────────────────────── */
function DataSection() {
  const { conversations, refreshConversations } = useConversations();
  const { reset } = useSettings();
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error();
      const { conversations: list } = (await res.json()) as {
        conversations: { id: string; title: string; createdAt: string }[];
      };
      const full = await Promise.all(
        list.map(async (c) => {
          const mRes = await fetch(`/api/conversations/${c.id}/messages`);
          const { messages } = mRes.ok
            ? ((await mRes.json()) as { messages: unknown[] })
            : { messages: [] };
          return { ...c, messages };
        }),
      );
      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), conversations: full }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marca-chatbot-conversas-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Conversas exportadas.");
    } catch {
      toast.error("Não foi possível exportar as conversas.");
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error();
      const { conversations: list } = (await res.json()) as {
        conversations: { id: string }[];
      };
      await Promise.all(
        list.map((c) =>
          fetch(`/api/conversations/${c.id}`, { method: "DELETE" }),
        ),
      );
      await refreshConversations();
      toast.success("Todas as conversas foram excluídas.");
    } catch {
      toast.error("Não foi possível excluir as conversas.");
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <Section
      icon={Database}
      title="Dados e privacidade"
      description="Exporte ou apague seu histórico. As preferências ficam só neste navegador."
    >
      <Row
        label="Exportar conversas"
        hint="Baixa todo o histórico em um arquivo JSON."
        control={
          <ActionButton onClick={handleExport} loading={exporting} icon={Download}>
            Exportar
          </ActionButton>
        }
      />
      <Row
        label="Apagar todas as conversas"
        hint={`${conversations.length} conversa(s) no histórico. Esta ação é irreversível.`}
        control={
          confirmClear ? (
            <ConfirmPair
              onConfirm={handleClearAll}
              onCancel={() => setConfirmClear(false)}
              loading={clearing}
            />
          ) : (
            <ActionButton
              onClick={() => setConfirmClear(true)}
              icon={Trash2}
              variant="danger"
              disabled={conversations.length === 0}
            >
              Apagar
            </ActionButton>
          )
        }
      />
      <Row
        label="Restaurar configurações padrão"
        hint="Volta todas as preferências desta tela aos valores iniciais."
        control={
          confirmReset ? (
            <ConfirmPair
              onConfirm={() => {
                reset();
                setConfirmReset(false);
                toast.success("Configurações restauradas.");
              }}
              onCancel={() => setConfirmReset(false)}
            />
          ) : (
            <ActionButton onClick={() => setConfirmReset(true)} icon={RotateCcw}>
              Restaurar
            </ActionButton>
          )
        }
      />
    </Section>
  );
}

/* ── About / status ───────────────────────────────────────────────────── */
function AboutSection() {
  const [azure, setAzure] = useState<"loading" | "enabled" | "disabled">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    fetch("/api/azure-devops/work-items")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { configured?: boolean; enabled?: boolean }) => {
        if (!alive) return;
        const ok = Boolean(data.configured ?? data.enabled);
        setAzure(ok ? "enabled" : "disabled");
      })
      .catch(() => alive && setAzure("disabled"));
    return () => {
      alive = false;
    };
  }, []);

  const model = appConfig.llm.model.replace(/^openai\//, "");

  return (
    <Section
      icon={Info}
      title="Sobre"
      description="Configuração técnica desta implantação."
    >
      <InfoRow label="Marca" value={appConfig.brand.name} />
      <InfoRow label="Modelo de linguagem" value={model} mono />
      <InfoRow label="Modelo de embeddings" value={appConfig.llm.embeddingModel} mono />
      <InfoRow label="Banco vetorial" value={appConfig.contextStore.provider} mono />
      <Row
        label="Integração Azure DevOps"
        hint="Geração de Work Items a partir dos action items das reuniões."
        control={<AzureBadge state={azure} />}
      />
    </Section>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Row
      label={label}
      control={
        <span
          className={cn(
            "text-sm text-[var(--fg-muted)]",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </span>
      }
    />
  );
}

function AzureBadge({ state }: { state: "loading" | "enabled" | "disabled" }) {
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-subtle)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando…
      </span>
    );
  }
  if (state === "enabled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent-bright)]">
        <ShieldCheck className="h-3.5 w-3.5" /> Ativa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-[var(--fg-muted)]">
      <ShieldAlert className="h-3.5 w-3.5" /> Não configurada
    </span>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
function ActionButton({
  onClick,
  children,
  icon: Icon,
  loading = false,
  disabled = false,
  variant = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  icon: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "danger"
          ? "border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/50 hover:bg-red-500/16 focus-visible:ring-red-500/35"
          : "border-[var(--line-strong)] bg-white/[0.04] text-[var(--fg)] hover:bg-white/[0.07] focus-visible:ring-[var(--accent-line)]",
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

function ConfirmPair({
  onConfirm,
  onCancel,
  loading = false,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-[var(--fg-muted)]">Confirmar?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Sim
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="inline-flex min-h-9 cursor-pointer items-center rounded-xl border border-[var(--line-strong)] bg-white/[0.04] px-3 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
      >
        Não
      </button>
    </div>
  );
}
