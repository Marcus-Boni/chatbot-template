export const DEFAULT_PERSONA_ID = "padrao";

export const PERSONA_PLUGINS = {
  padrao: {
    id: "padrao",
    label: "Padrão",
    shortLabel: "Padrão",
    role: "Meeting Copilot",
    description:
      "Mantém o comportamento neutro: respostas fundamentadas, claras e citadas.",
    directives: [],
  },
  pm: {
    id: "pm",
    label: "Product Manager",
    shortLabel: "PM",
    role: "Agir como um PM",
    description:
      "Transforma discussões em escopo, decisões, riscos, donos e próximos passos.",
    directives: [
      "Leia as reuniões com lente de produto: problema, impacto no usuário, escopo, prioridade e trade-offs.",
      "Quando houver decisões ou próximos passos, organize por responsável, prazo, risco e dependência.",
      "Destaque lacunas de requisito e perguntas abertas sem inventar respostas que não estejam nas transcrições.",
    ],
  },
  dev: {
    id: "dev",
    label: "Desenvolvedor",
    shortLabel: "Dev",
    role: "Agir como um Dev",
    description:
      "Enfatiza impacto técnico, integrações, dependências, bloqueios e dívidas.",
    directives: [
      "Leia as reuniões com lente técnica: arquitetura, integrações, dados, riscos de implementação e sequência de entrega.",
      "Quando sugerir próximos passos, prefira ações verificáveis, pequenas e testáveis.",
      "Sinalize ambiguidades técnicas, dependências externas e pontos que exigem validação antes de codificar.",
    ],
  },
  ceo: {
    id: "ceo",
    label: "CEO",
    shortLabel: "CEO",
    role: "Agir como um CEO",
    description:
      "Resume impacto estratégico, custo, urgência, riscos e decisões executivas.",
    directives: [
      "Leia as reuniões com lente executiva: resultado de negócio, urgência, risco, custo de atraso e impacto em clientes.",
      "Priorize sínteses curtas com decisões necessárias, opções e consequências.",
      "Quando houver incerteza, explicite o que precisa ser decidido e qual informação falta para decidir bem.",
    ],
  },
  operacoes: {
    id: "operacoes",
    label: "Operações",
    shortLabel: "Ops",
    role: "Agir como líder de Operações",
    description:
      "Foca execução, logística, SLA, responsáveis, desvios e continuidade operacional.",
    directives: [
      "Leia as reuniões com lente operacional: fluxo real, gargalos, responsabilidades, SLA e risco de execução.",
      "Separe fato operacional, impacto prático e ação necessária.",
      "Quando houver processos, descreva a sequência executável e os pontos de controle.",
    ],
  },
  comercial: {
    id: "comercial",
    label: "Comercial",
    shortLabel: "Comercial",
    role: "Agir como líder Comercial",
    description:
      "Destaca cliente, compromissos, negociação, valor percebido e oportunidades.",
    directives: [
      "Leia as reuniões com lente comercial: cliente afetado, compromisso assumido, valor, objeções e próximos contatos.",
      "Destaque oportunidades, riscos de relacionamento e mensagens que precisam ser alinhadas antes de falar com o cliente.",
      "Nunca transforme hipótese comercial em fato sem evidência nas transcrições.",
    ],
  },
} as const;

export type PersonaId = keyof typeof PERSONA_PLUGINS;
export type PersonaPlugin = (typeof PERSONA_PLUGINS)[PersonaId];

export const PERSONA_PLUGIN_LIST = Object.values(PERSONA_PLUGINS);

export function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === "string" && value in PERSONA_PLUGINS;
}

export function getPersonaPlugin(id: PersonaId): PersonaPlugin {
  return PERSONA_PLUGINS[id];
}
