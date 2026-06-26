"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCENT_PALETTES,
  DEFAULT_SETTINGS,
  FONT_SCALE_VALUE,
  SETTINGS_STORAGE_KEY,
  type Settings,
} from "./types";
import { isPersonaId } from "./personas";

interface SettingsContextType {
  settings: Settings;
  /** Patch one or more fields; persists to localStorage. */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** Restore every field to its default. */
  reset: () => void;
  /** True once the persisted value has been read (avoids hydration flashes). */
  hydrated: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function sanitizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const r = raw as Partial<Settings>;
  // Merge over defaults so new fields added in later versions are filled in,
  // and unknown/invalid values fall back gracefully.
  const merged: Settings = { ...DEFAULT_SETTINGS, ...r };
  if (!(merged.accent in ACCENT_PALETTES)) merged.accent = DEFAULT_SETTINGS.accent;
  if (!isPersonaId(merged.personaId)) {
    merged.personaId = DEFAULT_SETTINGS.personaId;
  }
  merged.conversationContextCount = clamp(
    Number(merged.conversationContextCount) || DEFAULT_SETTINGS.conversationContextCount,
    1,
    8,
  );
  merged.preferredTopK = clamp(
    Number(merged.preferredTopK) || DEFAULT_SETTINGS.preferredTopK,
    1,
    12,
  );
  return merged;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Apply theme-affecting settings to the document root. */
function applyToDocument(settings: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const palette = ACCENT_PALETTES[settings.accent];
  for (const [name, value] of Object.entries(palette.vars)) {
    root.style.setProperty(name, value);
  }

  root.style.setProperty("--chat-font-scale", FONT_SCALE_VALUE[settings.fontScale]);
  root.classList.toggle("force-reduce-motion", settings.reduceMotion);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(sanitizeSettings(JSON.parse(stored)));
      }
    } catch {
      /* corrupt value — keep defaults */
    }
    setHydrated(true);
  }, []);

  // Persist + reflect to the DOM on every change (after hydration so we don't
  // clobber the stored value with defaults on first paint).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
    applyToDocument(settings);
  }, [settings, hydrated]);

  // Apply theme as soon as it's read, even before the persist effect runs.
  useEffect(() => {
    if (hydrated) applyToDocument(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, update, reset, hydrated }),
    [settings, update, reset, hydrated],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
