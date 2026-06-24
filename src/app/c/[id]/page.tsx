import { ChatPanel } from "@/components/chat/ChatPanel";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify the conversation exists (using select instead of query API
  // which requires relations to be defined)
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) {
    notFound();
  }

  // Fetch all messages for this thread
  const threadMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatPanel initialThreadId={id} initialMessages={threadMessages} />
    </div>
  );
}
