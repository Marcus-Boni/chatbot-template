"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/* ── Section ──────────────────────────────────────────────────────────────
   A titled card grouping related settings. */
export function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <header className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-bright)]">
          <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--fg)]">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="divide-y divide-[var(--line)]">{children}</div>
    </section>
  );
}

/* ── Row ──────────────────────────────────────────────────────────────────
   One labelled control. `stacked` puts the control under the label (for wide
   controls like textareas or segmented groups). */
export function Row({
  label,
  hint,
  htmlFor,
  control,
  stacked = false,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  control: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-5 py-4",
        stacked
          ? "space-y-3"
          : "flex items-center justify-between gap-4",
      )}
    >
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--fg)]"
        >
          {label}
        </label>
        {hint && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">
            {hint}
          </p>
        )}
      </div>
      <div className={cn(stacked ? "" : "shrink-0")}>{control}</div>
    </div>
  );
}

/* ── Switch ───────────────────────────────────────────────────────────────
   Accessible toggle (role=switch). */
export function Switch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]",
        checked
          ? "border-[var(--accent-line)] bg-[var(--accent)]"
          : "border-[var(--line-strong)] bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[1.4rem]" : "translate-x-[0.2rem]",
        )}
      />
    </button>
  );
}

/* ── Segmented ────────────────────────────────────────────────────────────
   A horizontal exclusive choice group. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-[var(--bg)]/40 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
              active
                ? "bg-[var(--accent-soft)] text-[var(--fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-[var(--accent-line)]"
                : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Slider ───────────────────────────────────────────────────────────────
   Native range with a value bubble; accent-tinted via accent-color. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  id,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  id?: string;
  suffix?: string;
}) {
  return (
    <div className="flex w-44 items-center gap-3">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-[var(--accent-bright)]"
        style={{ accentColor: "var(--accent-bright)" }}
      />
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--fg)]">
        {value}
        {suffix}
      </span>
    </div>
  );
}

/* ── TextField / TextArea ───────────────────────────────────────────────── */
export function TextField({
  value,
  onChange,
  placeholder,
  id,
  maxLength,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--bg)]/50 px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--fg-subtle)] transition-colors focus:border-[var(--accent-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-line)]"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  id,
  maxLength,
  rows = 3,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
  maxLength?: number;
  rows?: number;
}) {
  const count = value.length;
  return (
    <div>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border border-[var(--line-strong)] bg-[var(--bg)]/50 px-3.5 py-2.5 text-sm leading-relaxed text-[var(--fg)] placeholder:text-[var(--fg-subtle)] transition-colors focus:border-[var(--accent-line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-line)]"
      />
      {maxLength && (
        <p className="mt-1 text-right font-mono text-[0.68rem] text-[var(--fg-subtle)]">
          {count}/{maxLength}
        </p>
      )}
    </div>
  );
}

/** Convenience: a unique id bound to a label for a11y. */
export function useFieldId(prefix: string) {
  const id = useId();
  return `${prefix}-${id}`;
}
