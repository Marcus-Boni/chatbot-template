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
  Settings,
} from "lucide-react";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";
import { useConversations, type Conversation } from "@/components/conversations/ConversationsContext";
import { Tooltip } from "@/components/ui/tooltip";

const NAV = [
  { href: "/sources", label: "Fontes", icon: Library },
  { href: "/conversations", label: "Histórico", icon: History },
  { href: "/settings", label: "Configurações", icon: Settings },
] as const;

const sidebarItemClass =
  "group relative flex min-h-11 items-center gap-3 rounded-xl border border-transparent text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]";

const sidebarIconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]";

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Ir para o chat inicial"
      className={cn(
        "group flex items-center justify-center rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]",
        collapsed ? "mx-auto size-11" : "gap-3",
      )}
    >
      <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] shadow-[0_0_24px_rgba(34,197,94,0.08)]">
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
          <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--fg)]">
            {appConfig.brand.name}
          </span>
          <span className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
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
              sidebarItemClass,
              collapsed ? "mx-auto size-11 justify-center px-0" : "px-3",
              active
                ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "text-[var(--fg-muted)] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-[var(--fg)]",
            )}
          >
            {active && !collapsed && (
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--accent-bright)] shadow-[0_0_12px_rgba(34,197,94,0.35)]" />
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
        "group relative flex min-h-9 items-center gap-2 rounded-xl border px-2.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent text-[var(--fg-muted)] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-[var(--fg)]"
      )}
    >
      <MessageSquare
        className={cn(
          "h-3.5 w-3.5 shrink-0 transition-colors",
          active ? "text-[var(--accent-bright)]" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]",
        )}
      />
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full border-b border-[var(--accent-bright)] bg-transparent py-0.5 text-[var(--fg)] outline-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      ) : (
        <button
          onClick={() => router.push(`/c/${conv.id}`)}
          className="min-w-0 flex-1 truncate pr-11 text-left leading-5 focus:outline-none"
          title={conv.title}
        >
          {conv.title}
        </button>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 bg-gradient-to-l from-[var(--bg-elevated)] via-[var(--bg-elevated)] to-transparent py-1 pl-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          {confirmDelete ? (
            <>
              <button
                onClick={handleDelete}
                aria-label="Confirmar exclusão da conversa"
                className="rounded-md p-1 text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35"
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
                aria-label="Cancelar exclusão da conversa"
                className="rounded-md p-1 text-[var(--fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
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
                aria-label="Renomear conversa"
                className="rounded-md p-1 text-[var(--fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]"
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
                aria-label="Excluir conversa"
                className="rounded-md p-1 text-[var(--fg-subtle)] transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35"
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
  const { conversations, loading, isSidebarCollapsed, setIsSidebarCollapsed, startNewConversation } = useConversations();

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
          "flex items-center transition-all duration-300",
          isSidebarCollapsed ? "justify-center px-0 py-5" : "justify-between px-5 py-5"
        )}
      >
        <Brand collapsed={isSidebarCollapsed} />
        {!isSidebarCollapsed && (
          <Tooltip content="Recolher barra lateral" side="right">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(true)}
              aria-label="Recolher barra lateral"
              className="hidden size-9 items-center justify-center rounded-lg text-[var(--fg-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] md:flex"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
      
      <div data-anim="rule" className="mx-5 h-px bg-[var(--line)]" />
      
      {/* Action Button: New Chat */}
      <div className={cn("transition-all duration-300", isSidebarCollapsed ? "flex justify-center px-0 py-4" : "px-4 py-4")}>
        {isSidebarCollapsed ? (
          <Tooltip content="Nova conversa" side="right">
            <button
              type="button"
              onClick={() => {
                startNewConversation();
                if (collapse) collapse();
              }}
              aria-label="Nova conversa"
              className={cn(
                sidebarIconButtonClass,
                "border-dashed border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-bright)] shadow-[0_0_22px_rgba(34,197,94,0.08)] hover:border-emerald-400/50 hover:bg-emerald-500/18 hover:text-emerald-200",
              )}
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => {
              startNewConversation();
              if (collapse) collapse();
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 text-sm font-semibold text-[var(--accent-bright)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_22px_rgba(34,197,94,0.06)] transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/18 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]"
          >
            <Plus className="h-4 w-4" />
            Nova conversa
          </button>
        )}
      </div>

      {/* Scrollable Recent Conversations */}
      <div
        className={cn(
          "sidebar-scroll mb-4 flex-1 overflow-y-auto",
          isSidebarCollapsed ? "flex flex-col items-center gap-2 px-0" : "px-3",
        )}
      >
        {loading ? (
          <div className="mt-2 flex w-full flex-col items-center space-y-2 px-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-9 w-full animate-pulse rounded-xl bg-white/[0.035]" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          !isSidebarCollapsed ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] px-3 py-8 text-center text-xs text-[var(--fg-subtle)]">
              Nenhuma conversa recente
            </div>
          ) : null
        ) : (
          <div className={cn("space-y-5", isSidebarCollapsed ? "flex w-full flex-col items-center" : "")}>
            {grouped.map(([groupName, items], groupIndex) => (
              <div
                key={groupName}
                className={cn(
                  isSidebarCollapsed ? "flex w-full flex-col items-center" : "space-y-2",
                  groupIndex > 0 && (isSidebarCollapsed ? "pt-3" : "pt-1"),
                )}
              >
                {isSidebarCollapsed ? (
                  groupIndex > 0 ? (
                    <div className="mb-3 mt-1 h-px w-11 bg-[var(--line)]" aria-hidden />
                  ) : null
                ) : (
                  <div className="flex items-center gap-2 px-2">
                    <h4 className="shrink-0 select-none font-mono text-[0.64rem] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                      {groupName}
                    </h4>
                    <span className="h-px min-w-0 flex-1 bg-[var(--line)]" aria-hidden />
                  </div>
                )}
                <div className={cn("space-y-1", isSidebarCollapsed ? "flex w-full flex-col items-center gap-1.5" : "")}>
                  {items.map((c) => {
                    const active = pathname === `/c/${c.id}`;
                    if (isSidebarCollapsed) {
                      return (
                        <Tooltip key={c.id} content={c.title} side="right">
                          <button
                            type="button"
                            onClick={() => router.push(`/c/${c.id}`)}
                            aria-label={`Abrir conversa ${c.title}`}
                            className={cn(
                              sidebarIconButtonClass,
                              "relative mx-auto",
                              active
                                ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-bright)]"
                                : "text-[var(--fg-muted)] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-[var(--fg)]"
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

      <div data-anim="rule" className="mx-5 h-px bg-[var(--line)]" />

      {/* Navigation */}
      <div data-anim="nav" className="px-4 py-4">
        <NavLinks onNavigate={collapse} collapsed={isSidebarCollapsed} />
      </div>

      {/* Info Box */}
      <div className={cn("pb-4 transition-all duration-300", isSidebarCollapsed ? "px-0" : "px-4")}>
        {isSidebarCollapsed ? (
          <Tooltip content="RAG · pgvector ativo" side="right">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-bright)]" />
            </div>
          </Tooltip>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
        <div className="mt-2 flex justify-center border-t border-[var(--line)] py-3">
          <Tooltip content="Expandir barra lateral" side="right">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              aria-label="Expandir barra lateral"
              className={cn(
                sidebarIconButtonClass,
                "text-[var(--fg-muted)] hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-[var(--fg)]",
              )}
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
          "relative hidden shrink-0 overflow-hidden border-r border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,16,17,0.96),rgba(7,9,10,0.98))] shadow-[1px_0_0_rgba(255,255,255,0.03),18px_0_48px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 ease-in-out md:block",
          isSidebarCollapsed ? "w-[5.25rem]" : "w-80"
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(18rem_12rem_at_20%_0%,rgba(34,197,94,0.10),transparent_65%)]"
          aria-hidden
        />
        <div className={cn("relative h-full flex flex-col transition-all duration-300", isSidebarCollapsed ? "w-[5.25rem]" : "w-80")}>
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
          <aside className="fixed inset-y-0 left-0 z-40 w-80 max-w-[86vw] border-r border-[var(--line)] bg-[var(--bg-elevated)] shadow-2xl md:hidden">
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
