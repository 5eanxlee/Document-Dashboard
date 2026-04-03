"use client";

import Link from "next/link";
import { FileText, FileCode, File, Pin, AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyablePath } from "@/components/dashboard/copyable-path";
import type { Doc } from "@/lib/types";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  md: FileText,
  mdx: FileCode,
  txt: File,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

interface DocCardProps {
  doc: Doc;
  onPin?: (id: string, pinned: boolean) => void;
  onDelete?: (id: string) => void;
}

export function DocCard({ doc, onPin, onDelete }: DocCardProps) {
  const Icon = typeIcons[doc.type] || File;
  const isMissing = doc.status === "missing";
  const hasError = doc.status === "parse_error";

  return (
    <Link
      href={`/docs/${doc.id}`}
      className={`group block rounded-xl border px-4 py-3.5 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isMissing
          ? "border-destructive/60 bg-destructive/5 hover:bg-destructive/[0.08]"
          : "border-border/70 bg-card/50 hover:border-border hover:bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/60 ${
              isMissing ? "border-destructive/30 bg-destructive/10" : ""
            }`}
          >
            <Icon className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium tracking-tight transition-colors group-hover:text-foreground">
                {doc.title}
              </h3>
              {doc.pinned && (
                <Pin className="size-3 shrink-0 text-primary/80" aria-hidden />
              )}
              {(isMissing || hasError) && (
                <AlertTriangle
                  className={`size-3.5 shrink-0 ${isMissing ? "text-destructive" : "text-amber-500 dark:text-amber-400"}`}
                  aria-hidden
                />
              )}
            </div>
            {doc.excerpt && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:line-clamp-1">
                {doc.excerpt}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                .{doc.type}
              </span>
              {doc.tags.length > 0 && (
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
              )}
              {doc.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="h-5 border-0 px-2 text-[10px] font-normal text-muted-foreground"
                >
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <time
              className="text-[11px] tabular-nums text-muted-foreground"
              dateTime={doc.lastIndexedAt}
            >
              {formatRelativeTime(doc.lastIndexedAt)}
            </time>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void onDelete(doc.id);
                }}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100"
                title="Remove from DocDash"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
          {isMissing && (
            <span className="text-[10px] font-medium text-destructive">Missing file</span>
          )}
        </div>
      </div>
      <div className="mt-2 min-w-0 pl-12">
        <CopyablePath path={doc.canonicalPath} className="text-[11px] leading-snug sm:text-xs" />
      </div>
    </Link>
  );
}
