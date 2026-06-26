import { DEFAULT_PERSONA_ID, type PersonaId } from "./personas";

/**
 * User-tunable preferences for the chat experience.
 *
 * These are *runtime* preferences persisted client-side (localStorage), distinct
 * from the build-time `appConfig`. They layer on top of `appConfig` where it can
 * be done cleanly on the client — chiefly by composing the system prompt passed
 * to `<CopilotChat instructions={...}>` (see `buildEffectiveInstructions`) and by
 * applying theme tokens to the document root (see `SettingsProvider`).
 */

export type Tone =
  | "padrao"
  | "profissional"
  | "amigavel"
  | "direto"
  | "tecnico";

export type Length = "conciso" | "equilibrado" | "detalhado";

export type FontScale = "compacto" | "normal" | "confortavel";

export type { PersonaId } from "./personas";

export type AccentKey =
  | "emerald"
  | "blue"
  | "violet"
  | "amber"
  | "rose"
  | "cyan";

export interface Settings {
  // ── Personalização ──────────────────────────────────────────────
  /** Como o assistente deve te chamar (ex.: "Marcus", "Dra. Silva"). */
  nickname: string;
  /** O que o assistente deve saber sobre você / seu papel. */
  aboutYou: string;
  /** Instruções livres que moldam o comportamento do assistente. */
  customInstructions: string;
  /** Persona/plugin ativo para interpretar as reuniões com uma lente específica. */
  personaId: PersonaId;
  tone: Tone;
  length: Length;

  // ── Comportamento do chat ───────────────────────────────────────
  /** "Pegar contexto das conversas anteriores?" — continuidade entre threads. */
  useConversationContext: boolean;
  /** Quantas conversas recentes considerar como contexto. */
  conversationContextCount: number;
  /** Exibir perguntas sugeridas ao iniciar uma conversa. */
  showSuggestions: boolean;
  /** Reforça a exigência de citar a reunião e a data em cada fato. */
  alwaysCite: boolean;

  // ── Recuperação (avançado) ──────────────────────────────────────
  /** Nº de trechos preferido por busca — injetado como dica no prompt. */
  preferredTopK: number;

  // ── Aparência ───────────────────────────────────────────────────
  accent: AccentKey;
  fontScale: FontScale;
  reduceMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  nickname: "",
  aboutYou: "",
  customInstructions: "",
  personaId: DEFAULT_PERSONA_ID,
  tone: "padrao",
  length: "equilibrado",

  useConversationContext: false,
  conversationContextCount: 3,
  showSuggestions: true,
  alwaysCite: true,

  preferredTopK: 6,

  accent: "emerald",
  fontScale: "normal",
  reduceMotion: false,
};

export const SETTINGS_STORAGE_KEY = "marca-chatbot:settings:v1";

/**
 * Accent palettes. Each maps onto the CSS custom properties defined in
 * `globals.css` so the whole console (sidebar, buttons, chat) re-skins from a
 * single choice. `btnBg`/`btnBgHover` keep white label text above WCAG AA.
 */
export interface AccentPalette {
  key: AccentKey;
  label: string;
  /** Swatch color shown in the picker. */
  swatch: string;
  vars: {
    "--accent": string;
    "--accent-bright": string;
    "--accent-soft": string;
    "--accent-line": string;
    "--btn-bg": string;
    "--btn-bg-hover": string;
  };
}

export const ACCENT_PALETTES: Record<AccentKey, AccentPalette> = {
  emerald: {
    key: "emerald",
    label: "Esmeralda",
    swatch: "#22c55e",
    vars: {
      "--accent": "#16a34a",
      "--accent-bright": "#22c55e",
      "--accent-soft": "rgba(22, 163, 74, 0.14)",
      "--accent-line": "rgba(22, 163, 74, 0.32)",
      "--btn-bg": "#15803d",
      "--btn-bg-hover": "#166534",
    },
  },
  blue: {
    key: "blue",
    label: "Azul",
    swatch: "#3b82f6",
    vars: {
      "--accent": "#2563eb",
      "--accent-bright": "#3b82f6",
      "--accent-soft": "rgba(37, 99, 235, 0.14)",
      "--accent-line": "rgba(37, 99, 235, 0.34)",
      "--btn-bg": "#1d4ed8",
      "--btn-bg-hover": "#1e40af",
    },
  },
  violet: {
    key: "violet",
    label: "Violeta",
    swatch: "#8b5cf6",
    vars: {
      "--accent": "#7c3aed",
      "--accent-bright": "#8b5cf6",
      "--accent-soft": "rgba(124, 58, 237, 0.16)",
      "--accent-line": "rgba(124, 58, 237, 0.34)",
      "--btn-bg": "#6d28d9",
      "--btn-bg-hover": "#5b21b6",
    },
  },
  amber: {
    key: "amber",
    label: "Âmbar",
    swatch: "#f59e0b",
    vars: {
      "--accent": "#d97706",
      "--accent-bright": "#f59e0b",
      "--accent-soft": "rgba(217, 119, 6, 0.16)",
      "--accent-line": "rgba(217, 119, 6, 0.36)",
      "--btn-bg": "#b45309",
      "--btn-bg-hover": "#92400e",
    },
  },
  rose: {
    key: "rose",
    label: "Rosa",
    swatch: "#f43f5e",
    vars: {
      "--accent": "#e11d48",
      "--accent-bright": "#f43f5e",
      "--accent-soft": "rgba(225, 29, 72, 0.15)",
      "--accent-line": "rgba(225, 29, 72, 0.34)",
      "--btn-bg": "#be123c",
      "--btn-bg-hover": "#9f1239",
    },
  },
  cyan: {
    key: "cyan",
    label: "Ciano",
    swatch: "#06b6d4",
    vars: {
      "--accent": "#0891b2",
      "--accent-bright": "#06b6d4",
      "--accent-soft": "rgba(8, 145, 178, 0.16)",
      "--accent-line": "rgba(8, 145, 178, 0.36)",
      "--btn-bg": "#0e7490",
      "--btn-bg-hover": "#155e75",
    },
  },
};

export const FONT_SCALE_VALUE: Record<FontScale, string> = {
  compacto: "0.92",
  normal: "1",
  confortavel: "1.1",
};
