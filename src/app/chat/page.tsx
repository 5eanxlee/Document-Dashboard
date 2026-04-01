"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { Doc } from "@/lib/types";

export default function MultiDocChatPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((data) => setDocs(data.docs || []));
  }, []);

  const selectedDocs = useMemo(
    () => docs.filter((d) => selectedIds.includes(d.id)),
    [docs, selectedIds]
  );

  const toggleDoc = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const chatTitle = useMemo(() => {
    if (selectedDocs.length === 0) return "Chat";
    if (selectedDocs.length === 1) return selectedDocs[0].title;
    return `${selectedDocs.length} documents`;
  }, [selectedDocs]);

  if (started && selectedIds.length > 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-card px-6 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStarted(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <h1 className="font-medium">Chat</h1>
              <div className="flex gap-1">
                {selectedDocs.map((d) => (
                  <Badge key={d.id} variant="secondary" className="text-xs">
                    {d.title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 max-w-3xl mx-auto w-full">
          <ChatPanel docIds={selectedIds} docTitle={chatTitle} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-medium">Multi-Document Chat</h1>
          </div>
          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => setStarted(true)}
            className="gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with {selectedIds.length || "..."} docs
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <p className="text-sm text-muted-foreground mb-4">
          Select documents to chat about together.
        </p>

        {docs.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground/50 text-sm">No documents registered.</p>
        ) : (
          <div className="grid gap-2">
            {docs.map((doc) => {
              const selected = selectedIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => toggleDoc(doc.id)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-transparent hover:bg-card hover:border-border/50"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border shrink-0 transition-colors ${
                      selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-[10px] text-muted-foreground/40 font-mono truncate">
                      {doc.canonicalPath}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 border-border/50 text-muted-foreground/50">
                    {doc.type}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
