"use client";

import Link from "next/link";
import { FileText, FileCode, File, Pin, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
}

export function DocCard({ doc, onPin }: DocCardProps) {
  const Icon = typeIcons[doc.type] || File;
  const isMissing = doc.status === "missing";
  const hasError = doc.status === "parse_error";

  return (
    <Link
      href={`/docs/${doc.id}`}
      className={`group block rounded-lg border px-4 py-3.5 transition-all hover:bg-card hover:border-border/80 ${
        isMissing
          ? "border-destructive/30 bg-destructive/5"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                {doc.title}
              </h3>
              {doc.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              )}
              {(isMissing || hasError) && (
                <AlertTriangle className={`h-3 w-3 shrink-0 ${isMissing ? "text-destructive/70" : "text-yellow-500/70"}`} />
              )}
            </div>
            {doc.excerpt && (
              <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                {doc.excerpt}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">
                {doc.type}
              </span>
              {doc.tags.length > 0 && (
                <span className="text-muted-foreground/30">·</span>
              )}
              {doc.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/50 text-muted-foreground/60">
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground/40">
                  +{doc.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
            {formatRelativeTime(doc.lastIndexedAt)}
          </span>
          {isMissing && (
            <span className="text-[10px] text-destructive/70 font-medium">missing</span>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/30 mt-1.5 font-mono truncate pl-7">
        {doc.canonicalPath}
      </p>
    </Link>
  );
}
