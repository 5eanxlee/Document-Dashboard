"use client";

import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "@/components/markdown/mermaid-diagram";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return "";
}

function getMermaidChart(children: ReactNode): string | null {
  const firstChild = Children.toArray(children)[0];

  if (
    !isValidElement<{ className?: string; children?: ReactNode }>(firstChild) ||
    typeof firstChild.type !== "string" ||
    firstChild.type !== "code"
  ) {
    return null;
  }

  const className = firstChild.props.className ?? "";
  if (!className.split(/\s+/).includes("language-mermaid")) {
    return null;
  }

  return extractText(firstChild.props.children).replace(/\n$/, "");
}

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => {
    const isExternal = Boolean(href && !href.startsWith("#") && !href.startsWith("/"));

    return (
      <a
        {...props}
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer noopener" : undefined}
      >
        {children}
      </a>
    );
  },
  pre: ({ children, ...props }) => {
    const chart = getMermaidChart(children);
    if (chart) {
      return <MermaidDiagram chart={chart} />;
    }

    return <pre {...props}>{children}</pre>;
  },
  table: ({ children, ...props }) => (
    <div className="tableWrapper markdown-table-viewport">
      <table {...props}>{children}</table>
    </div>
  ),
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div
      className={
        className
          ? `milkdown-editor doc-preview max-w-none min-h-[400px] ${className}`
          : "milkdown-editor doc-preview max-w-none min-h-[400px]"
      }
    >
      <div className="milkdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
