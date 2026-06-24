export const appConfig = {
  brand: { name: "Marca Ambiental", logo: "/logo.svg", accent: "#16a34a" },
  dataSource: { type: "teams-docx" as const, transcriptsDir: process.env.TRANSCRIPTS_DIR ?? "" },
  contextStore: { provider: "pgvector" as const },
  llm: { model: "openai/gpt-5-mini", embeddingModel: "text-embedding-3-small" },
  systemPrompt:
    "Você é o assistente da Marca Ambiental. Responda APENAS com base nos trechos de " +
    "reuniões recuperados pela ferramenta searchMeetings. SEMPRE cite a reunião e a data " +
    "(e o falante e o instante quando ajudar). Se não houver base suficiente nos trechos, " +
    "diga claramente que não encontrou essa informação nas reuniões.",
  suggestedQuestions: [
    "Quais decisões foram tomadas na última reunião?",
    "O que ficou definido sobre o fluxo do transportador?",
  ],
};
export type AppConfig = typeof appConfig;
