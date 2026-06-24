"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 200,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updateCoords = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    if (side === "top") {
      top = rect.top;
      left = rect.left + rect.width / 2;
    } else if (side === "bottom") {
      top = rect.bottom;
      left = rect.left + rect.width / 2;
    } else if (side === "left") {
      top = rect.top + rect.height / 2;
      left = rect.left;
    } else if (side === "right") {
      top = rect.top + rect.height / 2;
      left = rect.right;
    }

    setCoords({ top, left });
  }, [side]);

  // Recalculate coordinates if layout shifts or scrolls while open
  React.useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updateCoords, { passive: true });
    window.addEventListener("resize", updateCoords, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateCoords);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, updateCoords]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateCoords();
      setOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  const trigger = React.cloneElement(children as React.ReactElement<{
    ref?: React.Ref<HTMLElement>;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
  }>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ref } = children as any;
      if (ref) {
        if (typeof ref === "function") {
          ref(node);
        } else if (ref && typeof ref === "object" && "current" in ref) {
          // eslint-disable-next-line react-hooks/immutability
          ref.current = node;
        }
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter();
      if (children.props.onMouseEnter) children.props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) children.props.onMouseLeave(e);
    },
    onFocus: (e: React.FocusEvent) => {
      handleMouseEnter();
      if (children.props.onFocus) children.props.onFocus(e);
    },
    onBlur: (e: React.FocusEvent) => {
      handleMouseLeave();
      if (children.props.onBlur) children.props.onBlur(e);
    },
  });

  const getTransform = () => {
    switch (side) {
      case "top":
        return "translate(-50%, -100%) translateY(-8px)";
      case "bottom":
        return "translate(-50%, 0) translateY(8px)";
      case "left":
        return "translate(-100%, -50%) translateX(-8px)";
      case "right":
        return "translate(0, -50%) translateX(8px)";
      default:
        return "translate(-50%, -100%) translateY(-8px)";
    }
  };

  return (
    <>
      {trigger}
      {open && mounted && typeof document !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "fixed z-[9999] overflow-hidden rounded-md border border-[var(--line-strong)] bg-[#0c1011] px-2.5 py-1.5 text-[0.7rem] font-medium text-[var(--fg)] shadow-md select-none pointer-events-none whitespace-nowrap animate-in fade-in-0 zoom-in-95"
            )}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: getTransform(),
            }}
            role="tooltip"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
