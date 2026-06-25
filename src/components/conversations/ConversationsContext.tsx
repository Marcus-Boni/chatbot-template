"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

interface ConversationsContextType {
  conversations: Conversation[];
  loading: boolean;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  /**
   * Bumped every time the user starts a fresh conversation. `ChatPanel` lists it
   * as a dependency when deriving the live thread id, so a new chat always gets a
   * brand-new thread — even when the browser URL is already `/` (the first
   * message rewrites it to `/c/<id>` via `replaceState` without a Next
   * navigation, so `router.push("/")` alone would be a no-op).
   */
  newChatToken: number;
  startNewConversation: () => void;
  refreshConversations: () => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(false);
  const [newChatToken, setNewChatToken] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarCollapsedState(stored === "true");
    }
  }, []);

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  };


  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Erro ao carregar conversas");
      const data = await res.json() as { conversations: Conversation[] };
      setConversations(data.conversations);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshConversations().finally(() => setLoading(false));
  }, [refreshConversations]);

  // Sync conversation list when navigating or on path changes (e.g. redirected after creating a chat)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshConversations();
  }, [pathname, refreshConversations]);

  const startNewConversation = useCallback(() => {
    // Force `ChatPanel` to derive a fresh thread id even if we're already on `/`
    // (where the URL may have been rewritten to `/c/<id>` via replaceState).
    setNewChatToken((t) => t + 1);
    // Clean the address bar so a reload lands on a blank chat, then navigate.
    window.history.replaceState(null, "", "/");
    router.push("/");
  }, [router]);

  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Erro ao renomear conversa");
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
      toast.success("Conversa renomeada.");
    } catch (e) {
      toast.error("Não foi possível renomear a conversa.");
      throw e;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir conversa");
      setConversations((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversa excluída.");

      // If we are currently in this thread, redirect to "/" (new conversation)
      const isActive = pathname === `/c/${id}`;
      if (isActive) {
        router.push("/");
      }
    } catch (e) {
      toast.error("Não foi possível excluir a conversa.");
      throw e;
    }
  };

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        loading,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        newChatToken,
        startNewConversation,
        refreshConversations,
        renameConversation,
        deleteConversation,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }
  return context;
}
