"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Extension = "md" | "mdx" | "txt";

export function NewDocDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [extension, setExtension] = useState<Extension>("md");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle("");
    setExtension("md");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) reset();
    },
    [reset]
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          extension,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not create document");
        return;
      }
      const id = data.doc?.id as string | undefined;
      if (!id) {
        setError("Unexpected response");
        return;
      }
      setOpen(false);
      reset();
      onCreated(id);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }, [title, extension, onCreated, reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" size="sm" className="gap-1.5 rounded-lg shadow-sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" />
        <span className="text-xs font-medium">New document</span>
      </Button>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/80 p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 border-b border-border/60 bg-muted/20 px-6 py-5 text-left dark:bg-muted/10">
          <DialogTitle className="text-base font-semibold tracking-tight">New document</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Creates a file under <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">content/</code>{" "}
            and registers it in DocDash.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-2">
            <label htmlFor="new-doc-title" className="text-xs font-medium text-muted-foreground">
              Title
            </label>
            <Input
              id="new-doc-title"
              placeholder="Untitled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="new-doc-ext" className="text-xs font-medium text-muted-foreground">
              Format
            </label>
            <select
              id="new-doc-ext"
              value={extension}
              onChange={(e) => setExtension(e.target.value as Extension)}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="md">Markdown (.md)</option>
              <option value="mdx">MDX (.mdx)</option>
              <option value="txt">Plain text (.txt)</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="mx-0 mb-0 gap-2 border-t border-border/60 bg-muted/15 px-6 py-4 dark:bg-muted/10 sm:justify-end">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="rounded-lg shadow-sm" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
