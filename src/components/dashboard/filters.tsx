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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={showPinned ? "default" : "outline"}
        size="sm"
        onClick={() => onPinnedChange(!showPinned)}
        className="h-7 gap-1"
      >
        <Pin className="h-3 w-3" />
        Pinned
      </Button>

      {types.map((t) => (
        <Badge
          key={t}
          variant={activeType === t ? "default" : "secondary"}
          className="cursor-pointer font-mono"
          onClick={() => onTypeChange(activeType === t ? null : t)}
        >
          .{t}
        </Badge>
      ))}

      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={activeTag === tag ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onTagChange(activeTag === tag ? null : tag)}
        >
          {tag}
        </Badge>
      ))}

      {collections.map((col) => (
        <Badge
          key={col}
          variant={activeCollection === col ? "default" : "outline"}
          className="cursor-pointer"
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
              className="cursor-pointer font-mono text-xs"
              onClick={() => onWorkspaceChange(activeWorkspace === ws ? null : ws)}
            >
              {short}
            </Badge>
          );
        })}

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onTypeChange(null);
            onTagChange(null);
            onCollectionChange(null);
            onWorkspaceChange(null);
            onPinnedChange(false);
          }}
          className="h-7 gap-1 text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
