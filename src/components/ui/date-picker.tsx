"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatLong(date?: Date): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

interface DatePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * Standard shadcn date picker: a Popover-triggered Calendar. Returns a `Date`
 * (or undefined) so callers stay framework-agnostic about storage format.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
  id,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-empty={!value}
          className={cn(
            "inline-flex w-56 items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-sm",
            "text-[var(--fg)] transition-colors hover:border-[var(--accent-line)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-line)]",
            "data-[empty=true]:text-[var(--fg-muted)]",
            className,
          )}
        >
          <CalendarIcon
            className="h-4 w-4 shrink-0 text-[var(--fg-muted)]"
            strokeWidth={1.8}
          />
          <span className="truncate capitalize">
            {value ? formatLong(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
