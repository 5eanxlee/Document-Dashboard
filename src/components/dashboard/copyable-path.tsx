"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyState = "idle" | "copied" | "error";

export interface CopyablePathProps {
  path: string;
  /** Allow long paths to wrap (document info panel). */
  multiline?: boolean;
  /** Sit inline in a sentence (e.g. error banner). */
  inline?: boolean;
  /** Match destructive / error banner styling. */
  variant?: "default" | "destructive";
  className?: string;
}

export function CopyablePath({
  path,
  multiline,
  inline,
  variant = "default",
  className,
}: CopyablePathProps) {
  const [state, setState] = useState<CopyState>("idle");

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(path);
        setState("copied");
        window.setTimeout(() => setState("idle"), 1600);
      } catch {
        setState("error");
        window.setTimeout(() => setState("idle"), 2000);
      }
    },
    [path]
  );

  return (
    <button
      type="button"
      onClick={onClick}
      title="Copy path"
      aria-label={`Copy path: ${path}`}
      className={cn(
        "group/path-copy gap-1.5 rounded-md border border-transparent font-mono transition-colors",
        "text-foreground/88 dark:text-muted-foreground/55",
        "hover:border-border hover:bg-muted/80 dark:hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        inline
          ? "inline-flex max-w-full min-w-0 align-baseline"
          : "flex w-full min-w-0",
        multiline ? "items-start py-1" : "items-center py-0.5",
        inline ? "px-0.5" : "px-1.5",
        className
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 text-left",
          multiline ? "break-all" : "truncate",
          inline && !multiline && "truncate max-w-[min(100%,32rem)]"
        )}
      >
        {path}
      </span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center",
          multiline ? "mt-0.5 self-start" : ""
        )}
      >
        {state === "copied" ? (
          <Check
            className={cn(
              "h-3.5 w-3.5",
              variant === "destructive" ? "text-destructive" : "text-primary"
            )}
            strokeWidth={2.5}
            aria-hidden
          />
        ) : state === "error" ? (
          <span className="font-sans text-[10px] font-medium text-destructive">!</span>
        ) : (
          <Copy
            className={cn(
              "h-3.5 w-3.5 transition-opacity",
              variant === "destructive"
                ? "text-destructive/85 opacity-80 group-hover/path-copy:opacity-100 group-focus-visible/path-copy:opacity-100"
                : "text-foreground/50 opacity-0 group-hover/path-copy:opacity-100 group-focus-visible/path-copy:opacity-100 dark:text-muted-foreground/60"
            )}
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}
