"use client";

import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/style.css";

interface MilkdownEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  docId: string;
}

export function MilkdownEditor({ initialValue, onChange, readOnly, docId }: MilkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const prevDocIdRef = useRef<string>(docId);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Make links directly clickable — capture phase so we intercept before ProseMirror
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor?.href) {
        e.preventDefault();
        e.stopPropagation();
        window.open(anchor.href, "_blank", "noopener");
      }
    };
    el.addEventListener("click", handler, true);
    return () => el.removeEventListener("click", handler, true);
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const el = editorRef.current;

    // If docId changed, destroy and rebuild
    if (editorInstanceRef.current && prevDocIdRef.current !== docId) {
      editorInstanceRef.current.destroy();
      editorInstanceRef.current = null;
    }
    prevDocIdRef.current = docId;

    // Build the editor
    const buildEditor = async () => {
      try {
        const editor = await Editor.make()
          .config(nord)
          .config((ctx) => {
            ctx.set(rootCtx, el);
            ctx.set(defaultValueCtx, initialValue);
            ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
              onChangeRef.current(markdown);
            });
          })
          .use(commonmark)
          .use(gfm)
          .use(history)
          .use(listener)
          .create();

        editorInstanceRef.current = editor;
      } catch (err) {
        console.error("Failed to initialize Milkdown editor:", err);
      }
    };

    buildEditor();

    return () => {
      editorInstanceRef.current?.destroy();
      editorInstanceRef.current = null;
    };
  }, [docId, initialValue]);

  return (
    <div
      ref={editorRef}
      className="milkdown-editor prose prose-invert max-w-none min-h-[400px] focus-within:outline-none"
    />
  );
}
