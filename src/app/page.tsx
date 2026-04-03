"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SearchBar } from "@/components/dashboard/search-bar";
import { DocCard } from "@/components/dashboard/doc-card";
import { Filters } from "@/components/dashboard/filters";
import { FileText, RefreshCw, MessageCircle, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Doc } from "@/lib/types";
import { NewDocDialog } from "@/components/dashboard/new-doc-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("docdash-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("docdash-theme", next);
      return next;
    });
  }, []);

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

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setAllDocs((prev) => prev.filter((d) => d.id !== id));
    }
  }, []);

  const handleNewDocCreated = useCallback(
    (id: string) => {
      void fetchDocs();
      router.push(`/docs/${id}`);
    },
    [fetchDocs, router]
  );

  useEffect(() => {
    const timer = setTimeout(fetchDocs, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchDocs, query]);

  const pinnedDocs = useMemo(() => docs.filter((d) => d.pinned), [docs]);
  const hasFilters = activeType || activeTag || activeCollection || activeWorkspace || showPinned;

  return (
    <div className="dashboard-surface min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm">
                <FileText className="size-[1.15rem] text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h1 className="text-lg font-semibold tracking-tight sm:text-xl">DocDash</h1>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground sm:text-xs">
                    {allDocs.length} {allDocs.length === 1 ? "doc" : "docs"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Search and open documents in your workspace</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <NewDocDialog onCreated={handleNewDocCreated} />
              <div
                className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-0.5 dark:bg-muted/25"
                role="toolbar"
                aria-label="Toolbar"
              >
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg text-muted-foreground hover:text-foreground">
                    <MessageCircle className="size-3.5" />
                    <span className="hidden text-xs sm:inline">Chat</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchDocs}
                  className="gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span className="hidden text-xs sm:inline">Refresh</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleTheme}
                  className="rounded-lg text-muted-foreground hover:text-foreground"
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </div>
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

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {loading && docs.length === 0 ? (
          <div className="space-y-4 py-8" aria-busy="true" aria-label="Loading documents">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[4.75rem] animate-pulse rounded-xl border border-border/50 bg-card/40"
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center sm:py-28">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/50 shadow-inner">
              <FileText className="size-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold tracking-tight">
              {query || hasFilters ? "No matching documents" : "No documents yet"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {query || hasFilters
                ? "Broaden your search or clear filters to see more."
                : "Create one with New document, or register files with the DocDash CLI."}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {!hasFilters && pinnedDocs.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pinned</h2>
                  <span className="h-px flex-1 bg-border/60" aria-hidden />
                </div>
                <ul className="grid list-none gap-2.5 p-0" role="list">
                  {pinnedDocs.map((doc) => (
                    <li key={doc.id}>
                      <DocCard doc={doc} onDelete={handleDelete} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {query ? `Results · ${docs.length}` : "All documents"}
                </h2>
                <span className="h-px flex-1 bg-border/60" aria-hidden />
              </div>
              <ul className="grid list-none gap-2.5 p-0" role="list">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <DocCard doc={doc} onDelete={handleDelete} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
