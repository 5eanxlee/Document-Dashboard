"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Send, Trash2, Loader2, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatPanelProps {
  docId?: string;
  docIds?: string[];
  docTitle: string;
}

interface ThreadSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  updatedAt: string;
}

export function ChatPanel({ docId, docIds, docTitle }: ChatPanelProps) {
  const allDocIds = useMemo(() => docIds || (docId ? [docId] : []), [docId, docIds]);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: allDocIds.length === 1 ? { docId: allDocIds[0] } : { docIds: allDocIds },
      }),
    [allDocIds]
  );
  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const busy = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load threads for this doc
  const loadThreads = useCallback(async () => {
    const params = allDocIds.length === 1 ? `?docId=${allDocIds[0]}` : "";
    const res = await fetch(`/api/chat/threads${params}`);
    const data = await res.json();
    setThreads(data.threads || []);
  }, [allDocIds]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Auto-save thread when messages change (debounced)
  useEffect(() => {
    if (messages.length === 0 || busy) return;
    const timeout = setTimeout(() => {
      const id = threadId || crypto.randomUUID();
      if (!threadId) setThreadId(id);
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("")
            .slice(0, 60)
        : "New chat";
      fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: {
            id,
            docIds: allDocIds,
            title,
            messages: messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join(""),
              createdAt: new Date().toISOString(),
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      }).then(() => loadThreads());
    }, 1000);
    return () => clearTimeout(timeout);
  }, [messages, busy, threadId, allDocIds, loadThreads]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  };

  const startNewChat = () => {
    setMessages([]);
    setThreadId(null);
    setShowHistory(false);
  };

  const loadThread = async (id: string) => {
    const res = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", threadId: id }),
    });
    const data = await res.json();
    if (data.thread) {
      setThreadId(data.thread.id);
      // Convert stored messages back to UIMessage-like format for setMessages
      // We need to create proper UIMessage objects with parts
      const restored = data.thread.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
        createdAt: new Date(m.createdAt),
      }));
      setMessages(restored);
      setShowHistory(false);
    }
  };

  const deleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", threadId: id }),
    });
    if (threadId === id) startNewChat();
    loadThreads();
  };

  // History view
  if (showHistory) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-xs font-medium text-muted-foreground">Chat History</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={startNewChat} className="h-7 gap-1 text-xs">
              <Plus className="h-3 w-3" />
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="h-7 text-xs">
              Back
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground/50 py-8">No chat history</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => loadThread(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-card transition-colors ${
                  threadId === t.id ? "bg-card" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{t.lastMessage}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground/40">{t.messageCount} msgs</span>
                    <button
                      onClick={(e) => deleteThread(t.id, e)}
                      className="text-muted-foreground/30 hover:text-destructive p-0.5"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-[11px] text-muted-foreground/50 truncate">{docTitle}</span>
        <div className="flex gap-0.5">
          {threads.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="h-6 w-6 p-0">
              <History className="h-3 w-3 text-muted-foreground/50" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={startNewChat} className="h-6 w-6 p-0">
            <Plus className="h-3 w-3 text-muted-foreground/50" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground/50">
              Ask anything about <span className="font-medium text-muted-foreground/70">{docTitle}</span>
            </p>
            <div className="mt-4 space-y-1.5">
              {["Summarize this document", "What are the key points?", "What questions does this raise?"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="block w-full text-left text-xs text-muted-foreground/60 hover:text-foreground hover:bg-card rounded px-3 py-1.5 transition-colors"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "max-w-[80%] bg-primary text-primary-foreground px-3.5 py-2"
                  : "max-w-[90%] text-card-foreground px-1"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.parts
                      .filter((p) => p.type === "text")
                      .map((p) => (p as { type: "text"; text: string }).text)
                      .join("")}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {msg.parts.map((part, i) =>
                    part.type === "text" ? <span key={i}>{part.text}</span> : null
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start px-1">
            <div className="flex items-center gap-2 text-muted-foreground/50 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={startNewChat}
              className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-2.5 w-2.5" />
              Clear
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this document..."
            className="flex-1 bg-card border border-border/50 rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy || !input.trim()} className="h-9 w-9 p-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
