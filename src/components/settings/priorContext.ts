/**
 * Builds a compact, bounded summary of recent conversations to feed the
 * assistant as cross-conversation memory ("Pegar contexto das conversas
 * anteriores"). Runs on the client against the existing read APIs.
 *
 * It is deliberately lightweight: titles + a few of the latest message snippets
 * per conversation, hard-capped so the prompt stays small. This is memory, not a
 * citable source — see `buildEffectiveInstructions`.
 */

interface ConversationRow {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

interface MessageRow {
  role: string;
  content: string;
}

const MAX_MSGS_PER_CONV = 4;
const MAX_SNIPPET_CHARS = 220;

function snippet(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > MAX_SNIPPET_CHARS
    ? `${clean.slice(0, MAX_SNIPPET_CHARS)}…`
    : clean;
}

export async function fetchPriorContext(
  count: number,
  excludeId?: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/conversations");
    if (!res.ok) return null;
    const { conversations } = (await res.json()) as {
      conversations: ConversationRow[];
    };

    const recent = conversations
      .filter((c) => c.id !== excludeId && c.messageCount > 0)
      .slice(0, Math.max(1, count));

    if (recent.length === 0) return null;

    const parts = await Promise.all(
      recent.map(async (c) => {
        try {
          const mRes = await fetch(`/api/conversations/${c.id}/messages`);
          if (!mRes.ok) return null;
          const { messages } = (await mRes.json()) as { messages: MessageRow[] };
          const tail = messages.slice(-MAX_MSGS_PER_CONV);
          if (tail.length === 0) return null;
          const lines = tail
            .map((m) => {
              const who = m.role === "user" ? "Usuário" : "Assistente";
              return `  - ${who}: ${snippet(m.content)}`;
            })
            .join("\n");
          return `### ${c.title}\n${lines}`;
        } catch {
          return null;
        }
      }),
    );

    const body = parts.filter((p): p is string => Boolean(p)).join("\n\n");
    return body.length > 0 ? body : null;
  } catch {
    return null;
  }
}
