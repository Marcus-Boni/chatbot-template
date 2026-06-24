"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * shadcn/ui-style Calendar (react-day-picker v10) themed onto the project's
 * dark console palette. Selected days use the AA-safe button green; the rest
 * read from the shared --fg / --line tokens.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn("relative flex flex-col gap-4", d.months),
        month: cn("flex flex-col gap-4", d.month),
        nav: cn("absolute inset-x-1 top-0 flex items-center justify-between", d.nav),
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--fg)] disabled:opacity-40",
          d.button_previous,
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--fg-muted)] transition-colors hover:bg-white/5 hover:text-[var(--fg)] disabled:opacity-40",
          d.button_next,
        ),
        month_caption: cn("flex h-7 items-center justify-center", d.month_caption),
        caption_label: cn(
          "text-sm font-medium capitalize text-[var(--fg)]",
          d.caption_label,
        ),
        month_grid: cn("w-full border-collapse", d.month_grid),
        weekdays: cn("flex", d.weekdays),
        weekday: cn(
          "w-9 text-[0.72rem] font-normal text-[var(--fg-muted)] select-none",
          d.weekday,
        ),
        week: cn("mt-1 flex w-full", d.week),
        day: cn("h-9 w-9 p-0 text-center text-sm", d.day),
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--fg)] transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
          d.day_button,
        ),
        selected: cn(
          "[&>button]:bg-[var(--btn-bg)] [&>button]:text-[var(--btn-fg)] [&>button]:hover:bg-[var(--btn-bg-hover)]",
          d.selected,
        ),
        today: cn("[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-[var(--accent-line)]", d.today),
        outside: cn("text-[var(--fg-subtle)] opacity-60", d.outside),
        disabled: cn("text-[var(--fg-subtle)] opacity-40", d.disabled),
        hidden: cn("invisible", d.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", cls)} {...rest} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", cls)} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
