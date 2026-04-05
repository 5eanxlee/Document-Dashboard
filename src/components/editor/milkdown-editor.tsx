"use client";

import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { prism, prismConfig } from "@milkdown/plugin-prism";
import { refractor } from "refractor";
import mermaidSyntax from "refractor/mermaid";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/style.css";

interface MilkdownEditorProps {
  initialValue: string;
  onChange: (markdown: string) => void;
  docId: string;
}

if (!refractor.registered("mermaid")) {
  refractor.register(mermaidSyntax);
}

export function MilkdownEditor({ initialValue, onChange, docId }: MilkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
    let cancelled = false;

    el.innerHTML = "";

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
            ctx.set(prismConfig.key, {
              configureRefractor: () => refractor,
            });
          })
          .use(commonmark)
          .use(gfm)
          .use(history)
          .use(listener)
          .use(prism)
          .create();

        if (cancelled) {
          editor.destroy();
          return;
        }

        editorInstanceRef.current = editor;


      } catch (err) {
        console.error("Failed to initialize Milkdown editor:", err);
      }
    };

    buildEditor();

    return () => {
      cancelled = true;
      editorInstanceRef.current?.destroy();
      editorInstanceRef.current = null;
      el.innerHTML = "";
    };
  }, [docId, initialValue]);

  return (
    <div
      ref={editorRef}
      className="milkdown-editor prose prose-invert max-w-none min-h-[400px] focus-within:outline-none"
    />
  );
}
