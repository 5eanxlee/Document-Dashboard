"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, X } from "lucide-react";
import type { Doc } from "@/lib/types";

interface FiltersProps {
  docs: Doc[];
  activeType: string | null;
  activeTag: string | null;
  activeCollection: string | null;
  activeWorkspace: string | null;
  showPinned: boolean;
  onTypeChange: (type: string | null) => void;
  onTagChange: (tag: string | null) => void;
  onCollectionChange: (collection: string | null) => void;
  onWorkspaceChange: (workspace: string | null) => void;
  onPinnedChange: (pinned: boolean) => void;
}

export function Filters({
  docs,
  activeType,
  activeTag,
  activeCollection,
  activeWorkspace,
  showPinned,
  onTypeChange,
  onTagChange,
  onCollectionChange,
  onWorkspaceChange,
  onPinnedChange,
}: FiltersProps) {
  const types = [...new Set(docs.map((d) => d.type))].sort();
  const tags = [...new Set(docs.flatMap((d) => d.tags))].sort();
  const collections = [...new Set(docs.flatMap((d) => d.collections))].sort();
  const workspaces = [...new Set(docs.map((d) => d.workspaceRoot))].sort();

  const hasActiveFilter = activeType || activeTag || activeCollection || activeWorkspace || showPinned;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3 dark:bg-muted/15">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Filters</span>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onTypeChange(null);
              onTagChange(null);
              onCollectionChange(null);
              onWorkspaceChange(null);
              onPinnedChange(false);
            }}
            className="h-6 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant={showPinned ? "default" : "outline"}
          size="sm"
          onClick={() => onPinnedChange(!showPinned)}
          className="h-7 gap-1 rounded-lg shadow-none"
        >
          <Pin className="size-3" />
          Pinned
        </Button>

        {types.map((t) => (
          <Badge
            key={t}
            variant={activeType === t ? "default" : "secondary"}
            className="h-7 cursor-pointer rounded-lg px-2.5 font-mono text-[11px] font-normal transition-colors hover:opacity-90"
            onClick={() => onTypeChange(activeType === t ? null : t)}
          >
            .{t}
          </Badge>
        ))}

        {tags.map((tag) => (
          <Badge
            key={tag}
            variant={activeTag === tag ? "default" : "outline"}
            className="h-7 cursor-pointer rounded-lg px-2.5 text-xs font-normal transition-colors hover:opacity-90"
            onClick={() => onTagChange(activeTag === tag ? null : tag)}
          >
            {tag}
          </Badge>
        ))}

        {collections.map((col) => (
          <Badge
            key={col}
            variant={activeCollection === col ? "default" : "outline"}
            className="h-7 max-w-[12rem] cursor-pointer truncate rounded-lg px-2.5 text-xs font-normal transition-colors hover:opacity-90"
            onClick={() => onCollectionChange(activeCollection === col ? null : col)}
          >
            {col}
          </Badge>
        ))}

        {workspaces.length > 1 &&
          workspaces.map((ws) => {
            const short = ws.split("/").slice(-2).join("/");
            return (
              <Badge
                key={ws}
                variant={activeWorkspace === ws ? "default" : "outline"}
                className="h-7 max-w-[14rem] cursor-pointer truncate rounded-lg px-2.5 font-mono text-[11px] font-normal transition-colors hover:opacity-90"
                onClick={() => onWorkspaceChange(activeWorkspace === ws ? null : ws)}
              >
                {short}
              </Badge>
            );
          })}
      </div>
    </div>
  );
}
