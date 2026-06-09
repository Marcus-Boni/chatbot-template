"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { MessageSquareText, Library, Menu, X } from "lucide-react";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Chat", icon: MessageSquareText },
  { href: "/sources", label: "Fontes", icon: Library },
] as const;

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative inline-flex h-9 w-9 items-center justify-center">
        <Image
          src={appConfig.brand.logo}
          alt={appConfig.brand.name}
          width={32}
          height={32}
          className="h-8 w-8 transition-transform duration-300 group-hover:scale-105"
          priority
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight text-[var(--fg)]">
          {appConfig.brand.name}
        </span>
        <span className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
          Meeting Copilot
        </span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
              active
                ? "bg-[var(--accent-soft)] text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:bg-white/[0.03] hover:text-[var(--fg)]",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent-bright)]" />
            )}
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                active ? "text-[var(--accent-bright)]" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]",
              )}
              strokeWidth={1.75}
            />
            <span className="font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  const sidebarBody = (collapse?: () => void) => (
    <div ref={sidebarRef} className="flex h-full flex-col">
      <div data-anim="brand" className="px-4 py-5">
        <Brand />
      </div>
      <div data-anim="rule" className="mx-4 h-px bg-[var(--line)]" />
      <div data-anim="nav" className="px-3 py-4">
        <NavLinks onNavigate={collapse} />
      </div>
      <div className="mt-auto px-4 py-5">
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
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex h-dvh w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--line)] bg-[var(--bg-elevated)]/70 backdrop-blur-xl md:block">
        {sidebarBody()}
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
