"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SearchBar } from "@/components/dashboard/search-bar";
import { DocCard } from "@/components/dashboard/doc-card";
import { Filters } from "@/components/dashboard/filters";
import { FileText, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Doc } from "@/lib/types";

export default function DashboardPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (activeType) params.set("type", activeType);
      if (activeTag) params.set("tag", activeTag);
      if (activeCollection) params.set("collection", activeCollection);
      if (activeWorkspace) params.set("workspace", activeWorkspace);
      if (showPinned) params.set("pinned", "true");

      const res = await fetch(`/api/docs?${params}`);
      const data = await res.json();
      setDocs(data.docs || []);

      // Also fetch all docs for filter options
      if (params.toString()) {
        const allRes = await fetch("/api/docs");
        const allData = await allRes.json();
        setAllDocs(allData.docs || []);
      } else {
        setAllDocs(data.docs || []);
      }
    } catch (err) {
      console.error("Failed to fetch docs:", err);
    } finally {
      setLoading(false);
    }
  }, [query, activeType, activeTag, activeCollection, activeWorkspace, showPinned]);

  useEffect(() => {
    const timer = setTimeout(fetchDocs, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchDocs, query]);

  const pinnedDocs = useMemo(() => docs.filter((d) => d.pinned), [docs]);
  const hasFilters = activeType || activeTag || activeCollection || activeWorkspace || showPinned;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-lg font-semibold tracking-tight">DocDash</h1>
              <span className="text-xs text-muted-foreground/70 font-mono tabular-nums">
                {allDocs.length} docs
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/chat">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="text-xs">Chat</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={fetchDocs} className="gap-2 text-muted-foreground hover:text-foreground">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="text-xs">Refresh</span>
              </Button>
            </div>
          </div>
          <SearchBar value={query} onChange={setQuery} />
          <div className="mt-3">
            <Filters
              docs={allDocs}
              activeType={activeType}
              activeTag={activeTag}
              activeCollection={activeCollection}
              activeWorkspace={activeWorkspace}
              showPinned={showPinned}
              onTypeChange={setActiveType}
              onTagChange={setActiveTag}
              onCollectionChange={setActiveCollection}
              onWorkspaceChange={setActiveWorkspace}
              onPinnedChange={setShowPinned}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading && docs.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground/60 text-sm">
            Loading...
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {query || hasFilters ? "No matching documents" : "No documents yet"}
            </h2>
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
              {query || hasFilters
                ? "Try adjusting your search or filters."
                : "Run `da add <file>` to register your first document."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {!hasFilters && pinnedDocs.length > 0 && (
              <section>
                <h2 className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-3">
                  Pinned
                </h2>
                <div className="grid gap-2">
                  {pinnedDocs.map((doc) => (
                    <DocCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest mb-3">
                {query ? `Results (${docs.length})` : `All Documents`}
              </h2>
              <div className="grid gap-2">
                {docs.map((doc) => (
                  <DocCard key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
