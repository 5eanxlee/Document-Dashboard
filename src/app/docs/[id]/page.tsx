"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RawEditor } from "@/components/editor/raw-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Pin,
  PinOff,
  FileText,
  FileCode,
  File,
  Code,
  Eye,
  Wrench,
  Trash2,
  X,
  Plus,
  MessageCircle,
  PanelRightClose,
  Info,
} from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import type { Doc, DocDetailResponse, SaveResponse } from "@/lib/types";

const MilkdownEditor = dynamic(
  () =>
    import("@/components/editor/milkdown-editor").then((m) => ({
      default: m.MilkdownEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  }
);

type EditorMode = "rich" | "raw";

export default function DocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [content, setContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [liveHash, setLiveHash] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState("ok");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>("rich");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [conflictContent, setConflictContent] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [collectionInput, setCollectionInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/docs/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/");
          return;
        }
        throw new Error("Failed to fetch document");
      }
      const data: DocDetailResponse = await res.json();
      setDoc(data.doc);
      setContent(data.content || "");
      setEditedContent(data.content || "");
      setLiveHash(data.liveHash);
      setFileStatus(data.fileStatus);
      setHasUnsavedChanges(false);
      setConflictContent(null);
      setSaveMessage(null);
      if (data.doc.type === "txt") {
        setEditorMode("raw");
      } else if (data.doc.type === "mdx" && data.content?.includes("import ")) {
        setEditorMode("raw");
      }
    } catch (err) {
      console.error("Failed to fetch doc:", err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setEditedContent(newContent);
      setHasUnsavedChanges(newContent !== content);
    },
    [content]
  );

  const handleSave = useCallback(async () => {
    if (!doc || !liveHash) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedContent, expectedHash: liveHash }),
      });
      const data: SaveResponse = await res.json();
      if (res.status === 409 && data.conflict) {
        setConflictContent(data.currentContent || null);
        setSaveMessage("Conflict: file was modified externally");
        return;
      }
      if (!res.ok) {
        setSaveMessage(`Save failed: ${data.error}`);
        return;
      }
      if (data.doc) setDoc(data.doc);
      if (data.newHash) setLiveHash(data.newHash);
      setContent(editedContent);
      setHasUnsavedChanges(false);
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setSaveMessage(`Save error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [doc, liveHash, editedContent]);

  const handlePin = useCallback(async () => {
    if (!doc) return;
    const res = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !doc.pinned }),
    });
    if (res.ok) setDoc((await res.json()).doc);
  }, [doc]);

  const handleOpenInCursor = useCallback(async () => {
    if (!doc) return;
    await fetch("/api/cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: doc.id }),
    });
  }, [doc]);

  const handleRepair = useCallback(async () => {
    if (!doc) return;
    const res = await fetch("/api/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId: doc.id }),
    });
    if ((await res.json()).status === "repaired") fetchDoc();
  }, [doc, fetchDoc]);

  const handleDelete = useCallback(async () => {
    if (!doc) return;
    if (!confirm("Remove this document from DocDash? (The file will not be deleted.)"))
      return;
    const res = await fetch(`/api/docs/${doc.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  }, [doc, router]);

  const handleAddTag = useCallback(async () => {
    if (!doc || !tagInput.trim()) return;
    const res = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: [...new Set([...doc.tags, tagInput.trim()])] }),
    });
    if (res.ok) {
      setDoc((await res.json()).doc);
      setTagInput("");
    }
  }, [doc, tagInput]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!doc) return;
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: doc.tags.filter((t) => t !== tag) }),
      });
      if (res.ok) setDoc((await res.json()).doc);
    },
    [doc]
  );

  const handleAddCollection = useCallback(async () => {
    if (!doc || !collectionInput.trim()) return;
    const res = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        collections: [...new Set([...doc.collections, collectionInput.trim()])],
      }),
    });
    if (res.ok) {
      setDoc((await res.json()).doc);
      setCollectionInput("");
    }
  }, [doc, collectionInput]);

  const handleRemoveCollection = useCallback(
    async (col: string) => {
      if (!doc) return;
      const res = await fetch(`/api/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: doc.collections.filter((c) => c !== col) }),
      });
      if (res.ok) setDoc((await res.json()).doc);
    },
    [doc]
  );

  // Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges) handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasUnsavedChanges, handleSave]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground/50">Loading...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground/50">Document not found</div>
      </div>
    );
  }

  const TypeIcon =
    doc.type === "md" ? FileText : doc.type === "mdx" ? FileCode : File;
  const isMissing = fileStatus === "missing" || doc.status === "missing";

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 lg:px-6 shrink-0 z-10">
        <div className="flex items-center justify-between h-12">
          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <h1 className="text-sm font-medium truncate">{doc.title}</h1>
            {doc.pinned && (
              <Pin className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            {hasUnsavedChanges && (
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unsaved changes" />
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Editor mode toggle */}
            {doc.type !== "txt" && (
              <div className="flex items-center rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setEditorMode("rich")}
                  className={`flex items-center gap-1 px-2.5 h-8 text-xs transition-colors ${
                    editorMode === "rich"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Rich</span>
                </button>
                <button
                  onClick={() => setEditorMode("raw")}
                  className={`flex items-center gap-1 px-2.5 h-8 text-xs transition-colors ${
                    editorMode === "raw"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Raw</span>
                </button>
              </div>
            )}

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePin}
              className="h-8 w-8"
              title={doc.pinned ? "Unpin" : "Pin"}
            >
              {doc.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>

            {/* Chat toggle in header */}
            <Button
              variant={chatOpen ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setChatOpen(!chatOpen)}
              className="h-8 gap-2 px-3"
            >
              {chatOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">Chat</span>
            </Button>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Button
              variant={metaOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setMetaOpen(!metaOpen)}
              className="h-8 w-8"
              title="Document info"
            >
              <Info className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInCursor}
              className="h-8 w-8"
              title="Open in Cursor"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDoc}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving || isMissing}
              size="sm"
              className="h-8 gap-2 px-4 ml-1"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="text-xs">{saving ? "Saving..." : saveMessage === "Saved" ? "Saved" : "Save"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Status banners */}
      {isMissing && (
        <div className="bg-destructive/5 border-b border-destructive/10 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>File not found at {doc.canonicalPath}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRepair} className="h-6 gap-1 text-[10px]">
              <Wrench className="h-3 w-3" />
              Repair
            </Button>
          </div>
        </div>
      )}

      {conflictContent && (
        <div className="bg-yellow-500/5 border-b border-yellow-500/10 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-500 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Conflict: file was modified externally</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDoc} className="h-6 text-[10px]">
              Reload
            </Button>
          </div>
        </div>
      )}

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div
          className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out"
        >
          {/* Metadata panel (collapsible) */}
          {metaOpen && (
            <div className="border-b border-border/30 bg-card/50 px-6 py-4 shrink-0 animate-in slide-in-from-top-2 duration-200">
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground/50 block mb-1">Path</span>
                    <p className="font-mono text-[10px] break-all leading-relaxed">{doc.canonicalPath}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground/50 block mb-1">Workspace</span>
                    <p className="font-mono text-[10px] break-all leading-relaxed">{doc.workspaceRoot}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground/50 block mb-1">Info</span>
                    <p className="text-[10px] space-y-0.5">
                      <span className="block"><span className="text-muted-foreground/50">Type:</span> <span className="font-mono">{doc.type}</span></span>
                      <span className="block"><span className="text-muted-foreground/50">Hash:</span> <span className="font-mono">{doc.contentHash.slice(0, 8)}</span></span>
                      <span className="block"><span className="text-muted-foreground/50">Indexed:</span> {new Date(doc.lastIndexedAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground/50 block mb-1">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] h-5 gap-0.5 px-1.5">
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      <div className="flex gap-0.5">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                          placeholder="+"
                          className="h-5 w-12 text-[10px] px-1.5"
                        />
                      </div>
                    </div>
                    {doc.collections.length > 0 && (
                      <div className="mt-2">
                        <span className="text-muted-foreground/50 block mb-1">Collections</span>
                        <div className="flex flex-wrap gap-1">
                          {doc.collections.map((col) => (
                            <Badge key={col} variant="outline" className="text-[10px] h-5 gap-0.5 px-1.5">
                              {col}
                              <button onClick={() => handleRemoveCollection(col)} className="hover:text-destructive">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
                  <div className="flex gap-0.5">
                    <Input
                      value={collectionInput}
                      onChange={(e) => setCollectionInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
                      placeholder="Add collection..."
                      className="h-6 text-[10px] w-28"
                    />
                    <Button variant="ghost" size="sm" onClick={handleAddCollection} className="h-6 px-1.5">
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-6 gap-1 text-[10px] text-destructive/60 hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {isMissing ? (
                <div className="text-center py-20 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-destructive/30" />
                  <p className="text-sm">This file is missing from disk.</p>
                  <p className="text-xs mt-1 text-muted-foreground/50">
                    Try the repair button above or re-add the file.
                  </p>
                </div>
              ) : editorMode === "rich" && doc.type !== "txt" ? (
                <MilkdownEditor
                  key={doc.id + "-" + doc.contentHash}
                  initialValue={content}
                  onChange={handleContentChange}
                  docId={doc.id}
                />
              ) : (
                <RawEditor
                  value={editedContent}
                  onChange={handleContentChange}
                  readOnly={isMissing}
                />
              )}
            </div>
          </div>
        </div>

        {/* Chat panel — slides in from right */}
        <div
          className={`border-l border-border bg-card shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
            chatOpen ? "w-full md:w-[40%]" : "w-0"
          }`}
          style={{ minWidth: chatOpen ? undefined : 0 }}
        >
          {chatOpen && (
            <div className="w-full h-full min-w-[320px]">
              <ChatPanel docId={doc.id} docTitle={doc.title} />
            </div>
          )}
        </div>
      </div>

      {/* Floating chat button — bottom right, always visible when chat is closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-4 pr-5 h-12 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Chat</span>
        </button>
      )}
    </div>
  );
}
