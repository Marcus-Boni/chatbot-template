"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  Library,
  Menu,
  X,
  History,
  Plus,
  Edit2,
  Trash2,
  Check,
  PanelLeft,
  PanelLeftClose,
  MessageSquare,
} from "lucide-react";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";
import { useConversations, type Conversation } from "@/components/conversations/ConversationsContext";
import { Tooltip } from "@/components/ui/tooltip";

const NAV = [
  { href: "/sources", label: "Fontes", icon: Library },
  { href: "/conversations", label: "Histórico", icon: History },
] as const;

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center justify-center transition-all duration-300", collapsed ? "size-10 mx-auto" : "gap-2.5")}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center shrink-0">
        <Image
          src={appConfig.brand.logo}
          alt={appConfig.brand.name}
          width={32}
          height={32}
          className="h-8 w-8 transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </span>
      {!collapsed && (
        <span className="flex flex-col leading-none transition-opacity duration-200">
          <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight text-[var(--fg)]">
            {appConfig.brand.name}
          </span>
          <span className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            Meeting Copilot
          </span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "items-center" : "")}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        const link = (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
              collapsed ? "justify-center px-0 size-10 mx-auto" : "",
              active
                ? "bg-[var(--accent-soft)] text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:bg-white/[0.03] hover:text-[var(--fg)]",
            )}
          >
            {active && !collapsed && (
              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent-bright)]" />
            )}
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                active ? "text-[var(--accent-bright)]" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]",
              )}
              strokeWidth={1.75}
            />
            {!collapsed && <span className="font-medium">{label}</span>}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={href} content={label} side="right">
              {link}
            </Tooltip>
          );
        }
        return link;
      })}
    </nav>
  );
}

function SidebarConversationItem({
  conv,
  active,
}: {
  conv: Conversation;
  active: boolean;
}) {
  const router = useRouter();
  const { renameConversation, deleteConversation } = useConversations();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRename = async () => {
    if (editTitle.trim() && editTitle.trim() !== conv.title) {
      try {
        await renameConversation(conv.id, editTitle.trim());
      } catch {
        setEditTitle(conv.title);
      }
    } else {
      setEditTitle(conv.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleRename();
    } else if (e.key === "Escape") {
      setEditTitle(conv.title);
      setIsEditing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteConversation(conv.id);
    } catch {
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-[var(--accent-soft)] text-[var(--fg)] border-l-2 border-[var(--accent-bright)] pl-2"
          : "text-[var(--fg-muted)] hover:bg-white/[0.03] hover:text-[var(--fg)]"
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--fg-subtle)]" />
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-[var(--fg)] outline-none border-b border-[var(--accent-bright)] py-0.5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      ) : (
        <button
          onClick={() => router.push(`/c/${conv.id}`)}
          className="flex-1 text-left truncate pr-10 focus:outline-none"
        >
          {conv.title}
        </button>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-[var(--bg-elevated)] via-[var(--bg-elevated)] to-transparent pl-3 py-1">
          {confirmDelete ? (
            <>
              <button
                onClick={handleDelete}
                className="p-1 hover:text-red-400 text-red-500/70 transition-colors"
                title="Confirmar"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="p-1 hover:text-[var(--fg)] text-[var(--fg-muted)] transition-colors"
                title="Cancelar"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:text-[var(--fg)] text-[var(--fg-muted)] transition-colors"
                title="Renomear"
              >
                <Edit2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="p-1 hover:text-red-400 text-[var(--fg-subtle)] transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function groupConversations(convs: Conversation[]) {
  const groups: { [key: string]: Conversation[] } = {
    "Hoje": [],
    "Ontem": [],
    "Últimos 7 dias": [],
    "Anteriores": [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  convs.forEach((c) => {
    const d = new Date(c.createdAt);
    if (d >= today) {
      groups["Hoje"].push(c);
    } else if (d >= yesterday) {
      groups["Ontem"].push(c);
    } else if (d >= sevenDaysAgo) {
      groups["Últimos 7 dias"].push(c);
    } else {
      groups["Anteriores"].push(c);
    }
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { conversations, loading, isSidebarCollapsed, setIsSidebarCollapsed } = useConversations();

  // GSAP hero accent: a tasteful, one-shot staggered reveal of the sidebar
  // chrome on mount, plus a drawn accent line. Respects reduced-motion.
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !sidebarRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-anim='brand']", {
        y: -10,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });
      gsap.from("[data-anim='nav'] > *", {
        x: -12,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        delay: 0.12,
        ease: "power2.out",
      });
      gsap.fromTo(
        "[data-anim='rule']",
        { scaleX: 0 },
        { scaleX: 1, transformOrigin: "left", duration: 0.7, delay: 0.1, ease: "power3.out" },
      );
    }, sidebarRef);

    return () => ctx.revert();
  }, []);

  const grouped = groupConversations(conversations);

  const sidebarBody = (collapse?: () => void) => (
    <div ref={sidebarRef} className="flex h-full flex-col">
      <div
        data-anim="brand"
        className={cn(
          "py-5 flex items-center transition-all duration-300",
          isSidebarCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <Brand collapsed={isSidebarCollapsed} />
        {!isSidebarCollapsed && (
          <Tooltip content="Recolher barra lateral" side="right">
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="hidden md:flex p-1 rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
      
      <div data-anim="rule" className="mx-4 h-px bg-[var(--line)]" />
      
      {/* Action Button: New Chat */}
      <div className={cn("py-3 transition-all duration-300", isSidebarCollapsed ? "px-0" : "px-3")}>
        {isSidebarCollapsed ? (
          <Tooltip content="Nova conversa" side="right">
            <button
              onClick={() => {
                router.push("/");
                if (collapse) collapse();
              }}
              className="flex items-center justify-center size-10 rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400 transition-all duration-200 shadow-md hover:shadow-emerald-500/5 cursor-pointer mx-auto"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => {
              router.push("/");
              if (collapse) collapse();
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-xs font-semibold tracking-wide text-emerald-400 hover:text-emerald-300 transition-all duration-200 shadow-md hover:shadow-emerald-500/5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </button>
        )}
      </div>

      {/* Scrollable Recent Conversations */}
      <div className={cn("flex-1 overflow-y-auto mb-4 scrollbar-thin", isSidebarCollapsed ? "px-0 flex flex-col items-center gap-2" : "px-2")}>
        {loading ? (
          <div className="space-y-2 px-2 mt-4 w-full flex flex-col items-center">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-7 w-10 bg-white/[0.02] animate-pulse rounded-md" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          !isSidebarCollapsed ? (
            <div className="text-center py-8 text-[var(--fg-subtle)] text-xs">
              Nenhuma conversa recente
            </div>
          ) : null
        ) : (
          <div className={cn("space-y-4", isSidebarCollapsed ? "w-full flex flex-col items-center" : "")}>
            {grouped.map(([groupName, items]) => (
              <div key={groupName} className={cn("space-y-1", isSidebarCollapsed ? "w-full flex flex-col items-center" : "")}>
                {!isSidebarCollapsed && (
                  <h4 className="text-[0.62rem] font-mono tracking-[0.1em] text-[var(--fg-subtle)] px-2.5 uppercase select-none">
                    {groupName}
                  </h4>
                )}
                <div className={cn("space-y-0.5", isSidebarCollapsed ? "w-full flex flex-col items-center gap-1.5" : "")}>
                  {items.map((c) => {
                    const active = pathname === `/c/${c.id}`;
                    if (isSidebarCollapsed) {
                      return (
                        <Tooltip key={c.id} content={c.title} side="right">
                          <button
                            onClick={() => router.push(`/c/${c.id}`)}
                            className={cn(
                              "flex items-center justify-center size-10 rounded-lg mx-auto transition-all duration-200 cursor-pointer relative",
                              active
                                ? "bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                                : "text-[var(--fg-muted)] hover:bg-white/[0.03] hover:text-[var(--fg)]"
                            )}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      );
                    }
                    return (
                      <SidebarConversationItem
                        key={c.id}
                        conv={c}
                        active={active}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div data-anim="rule" className="mx-4 h-px bg-[var(--line)]" />

      {/* Navigation */}
      <div data-anim="nav" className="px-3 py-3">
        <NavLinks onNavigate={collapse} collapsed={isSidebarCollapsed} />
      </div>

      {/* Info Box */}
      <div className={cn("px-4 py-4 transition-all duration-300", isSidebarCollapsed ? "px-0" : "px-4")}>
        {isSidebarCollapsed ? (
          <Tooltip content="RAG · pgvector ativo" side="right">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[var(--panel)] border border-[var(--line)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-bright)]" />
            </div>
          </Tooltip>
        ) : (
          <div className="hairline rounded-xl bg-[var(--panel)] p-3.5">
            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
              Respostas fundamentadas nas transcrições — sempre com a reunião e a
              data citadas.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-bright)]" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                RAG · pgvector
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Expand Button at the bottom when collapsed */}
      {isSidebarCollapsed && (
        <div className="py-2 flex justify-center border-t border-[var(--line)] mt-2">
          <Tooltip content="Expandir barra lateral" side="right">
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center justify-center"
            >
              <PanelLeft className="h-4.5 w-4.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative z-10 flex h-dvh w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:block shrink-0 border-r border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-xl transition-all duration-300 ease-in-out overflow-hidden relative",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("h-full flex flex-col transition-all duration-300", isSidebarCollapsed ? "w-16" : "w-64")}>
          {sidebarBody()}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elevated)]/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          className="hairline rounded-lg p-2 text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-72 max-w-[80vw] border-r border-[var(--line)] bg-[var(--bg-elevated)] md:hidden">
            {sidebarBody(() => setMobileOpen(false))}
          </aside>
        </>
      )}

      {/* Main pane */}
      <main className="relative flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
