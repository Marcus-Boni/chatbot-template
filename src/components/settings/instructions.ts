import type { Length, Settings, Tone } from "./types";
import { DEFAULT_PERSONA_ID, getPersonaPlugin } from "./personas";

/**
 * Pure composition of the *effective* system prompt sent to the LLM.
 *
 * The base prompt (`appConfig.systemPrompt`) is the immutable operating
 * contract; user preferences are appended as clearly-scoped sections so they
 * tune the assistant without overriding its grounding/citation rules. This is
 * the one runtime mechanism that wires cleanly on the client: `ChatPanel` passes
 * the result to `<CopilotChat instructions={...}>`.
 *
 * Kept side-effect free (no React, no DOM) so it is trivially testable.
 */

const TONE_DIRECTIVES: Record<Tone, string | null> = {
  padrao: null,
  profissional:
    "Mantenha um tom profissional e corporativo, objetivo e respeitoso.",
  amigavel:
    "Use um tom caloroso e acessível, próximo e encorajador, sem perder a precisão.",
  direto:
    "Vá direto ao ponto: respostas enxutas, sem rodeios nem preâmbulos.",
  tecnico:
    "Adote um tom técnico e preciso, usando a terminologia adequada do domínio.",
};

const LENGTH_DIRECTIVES: Record<Length, string | null> = {
  conciso:
    "Prefira respostas curtas: o essencial em poucas frases ou tópicos. Evite expandir além do necessário.",
  equilibrado: null,
  detalhado:
    "Quando o assunto permitir, ofereça respostas detalhadas e bem estruturadas, com contexto, nuances e próximos passos.",
};

export interface BuildInstructionsArgs {
  base: string;
  settings: Settings;
  /**
   * Compact summary of recent conversations, injected only when the user opted
   * in via "Pegar contexto das conversas anteriores". Already bounded/trimmed by
   * the caller.
   */
  priorContext?: string | null;
}

export function buildEffectiveInstructions({
  base,
  settings,
  priorContext,
}: BuildInstructionsArgs): string {
  const blocks: string[] = [base];

  const prefs: string[] = [];

  if (settings.nickname.trim()) {
    prefs.push(`- Dirija-se ao usuário como "${settings.nickname.trim()}".`);
  }
  if (settings.aboutYou.trim()) {
    prefs.push(`- Sobre o usuário: ${settings.aboutYou.trim()}`);
  }

  const tone = TONE_DIRECTIVES[settings.tone];
  if (tone) prefs.push(`- ${tone}`);

  const length = LENGTH_DIRECTIVES[settings.length];
  if (length) prefs.push(`- ${length}`);

  if (settings.personaId !== DEFAULT_PERSONA_ID) {
    const persona = getPersonaPlugin(settings.personaId);
    blocks.push(
      `## Persona ativa: ${persona.label}\n` +
        `Plugin selecionado: "${persona.role}". Use esta lente para organizar, priorizar e explicar a resposta, sem contrariar as regras de busca, fundamentação e citação do prompt base.\n` +
        persona.directives.map((directive) => `- ${directive}`).join("\n"),
    );
  }

  if (settings.alwaysCite) {
    prefs.push(
      "- Reforce a fundamentação: cite a reunião e a data sempre que afirmar um fato das reuniões.",
    );
  }

  if (settings.customInstructions.trim()) {
    prefs.push(
      `- Instruções adicionais do usuário (respeite-as desde que não contrariem as regras de fundamentação acima): ${settings.customInstructions.trim()}`,
    );
  }

  if (prefs.length > 0) {
    blocks.push(`## Preferências do usuário\n${prefs.join("\n")}`);
  }

  if (settings.useConversationContext && priorContext?.trim()) {
    blocks.push(
      `## Contexto de conversas anteriores\n` +
        `O usuário pediu continuidade entre conversas. Use o resumo abaixo apenas como memória do que já foi conversado — ele NÃO substitui as transcrições e NÃO é fonte citável. Para qualquer fato das reuniões, continue usando \`searchMeetings\`.\n\n${priorContext.trim()}`,
    );
  }

  return blocks.join("\n\n");
}
