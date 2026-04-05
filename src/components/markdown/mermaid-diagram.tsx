"use client";

import { useEffect, useId, useRef, useState } from "react";

type MermaidInstance = typeof import("mermaid").default;
type MermaidThemeMode = "dark" | "light";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let mermaidPromise: Promise<MermaidInstance> | null = null;

function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((mod) => mod.default);
  return mermaidPromise;
}

function getThemeMode(): MermaidThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function useThemeMode() {
  const [themeMode, setThemeMode] = useState<MermaidThemeMode>(getThemeMode);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setThemeMode(root.classList.contains("dark") ? "dark" : "light");
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return themeMode;
}

function getMermaidConfig(
  themeMode: MermaidThemeMode
): Parameters<MermaidInstance["initialize"]>[0] {
  return {
    startOnLoad: false,
    securityLevel: "strict" as const,
    theme: themeMode === "dark" ? "dark" : "neutral",
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
    themeVariables: {
      background: "transparent",
    },
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
  };
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const themeMode = useThemeMode();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const diagramId = useId().replace(/:/g, "");

  useEffect(() => {
    const canvas = canvasRef.current;
    let cancelled = false;

    if (!canvas) return;

    const renderDiagram = async () => {
      canvas.innerHTML = "";
      setStatus("loading");
      setErrorMessage(null);

      try {
        const mermaid = await loadMermaid();
        mermaid.initialize(getMermaidConfig(themeMode));

        const { svg, bindFunctions } = await mermaid.render(
          `docdash-mermaid-${diagramId}-${themeMode}`,
          chart
        );

        if (cancelled) return;

        canvas.innerHTML = svg;
        bindFunctions?.(canvas);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;

        canvas.innerHTML = "";

        console.error("Failed to render Mermaid diagram:", error);
        setErrorMessage(error instanceof Error ? error.message : "Unknown Mermaid render error.");
        setStatus("error");
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
      canvas.innerHTML = "";
    };
  }, [chart, diagramId, themeMode]);

  return (
    <div className={className ? `mermaid-diagram ${className}` : "mermaid-diagram"}>
      <div className="mermaid-diagram__header">
        <span className="mermaid-diagram__label">Mermaid</span>
        <span
          className={
            status === "error"
              ? "mermaid-diagram__status mermaid-diagram__status--error"
              : "mermaid-diagram__status"
          }
        >
          {status === "loading" ? "Rendering..." : status === "error" ? "Fallback" : "Rendered"}
        </span>
      </div>

      {status === "error" ? (
        <div className="mermaid-diagram__fallback">
          <p className="mermaid-diagram__error">
            {errorMessage || "Unable to render this Mermaid diagram."}
          </p>
          <pre>
            <code>{chart}</code>
          </pre>
        </div>
      ) : (
        <div className="mermaid-diagram__viewport" aria-busy={status === "loading"}>
          <div
            ref={canvasRef}
            className={
              status === "ready"
                ? "mermaid-diagram__canvas"
                : "mermaid-diagram__canvas mermaid-diagram__canvas--hidden"
            }
            role="img"
            aria-label="Rendered Mermaid diagram"
          />
          {status === "loading" && (
            <div className="mermaid-diagram__loading">Rendering diagram...</div>
          )}
        </div>
      )}
    </div>
  );
}
