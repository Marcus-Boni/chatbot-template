import { describe, expect, it } from "vitest";
import { buildEffectiveInstructions } from "./instructions";
import { sanitizeSettings } from "./SettingsContext";
import { DEFAULT_SETTINGS } from "./types";

describe("buildEffectiveInstructions", () => {
  it("keeps the default persona silent", () => {
    const result = buildEffectiveInstructions({
      base: "BASE",
      settings: DEFAULT_SETTINGS,
    });

    expect(result).toContain("BASE");
    expect(result).not.toContain("Persona ativa");
    expect(result).not.toContain("Plugin selecionado");
  });

  it("injects the selected persona as a plugin-style behavior block", () => {
    const result = buildEffectiveInstructions({
      base: "BASE",
      settings: { ...DEFAULT_SETTINGS, personaId: "dev" },
    });

    expect(result).toContain("## Persona ativa: Desenvolvedor");
    expect(result).toContain('Plugin selecionado: "Agir como um Dev"');
    expect(result).toContain("arquitetura, integrações, dados");
    expect(result).toContain("sem contrariar as regras de busca");
  });
});

describe("sanitizeSettings", () => {
  it("falls back to the default persona when localStorage has an unknown id", () => {
    const result = sanitizeSettings({
      ...DEFAULT_SETTINGS,
      personaId: "cto-inexistente",
    });

    expect(result.personaId).toBe(DEFAULT_SETTINGS.personaId);
  });
});
