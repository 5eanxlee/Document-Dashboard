import fs from "node:fs";
import path from "node:path";
import { appRoot } from "@/lib/registry/paths";

/** Turn a title into a safe filename base (no extension). */
export function slugifyFileBase(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "untitled";
}

/**
 * Resolve a directory under the app repo root. Rejects path traversal.
 * Default relative segment is `content` for dashboard-created files.
 */
export function resolveSafeContentDir(relativeDir: string | undefined): string {
  const root = path.resolve(appRoot());
  const rel = (relativeDir ?? "content").trim() || "content";
  const normalized = path.normalize(rel).replace(/^[/\\]+/, "");
  if (normalized.split(/[/\\]/).some((p) => p === "..")) {
    throw new Error("Invalid directory");
  }
  const resolved = path.resolve(root, normalized);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new Error("Invalid directory");
  }
  return resolved;
}

function uniqueFilePath(dir: string, base: string, ext: string): string {
  const dotExt = ext.startsWith(".") ? ext : `.${ext}`;
  let candidate = path.join(dir, `${base}${dotExt}`);
  let n = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}-${n}${dotExt}`);
    n += 1;
  }
  return candidate;
}

export type NewLocalDocExtension = "md" | "mdx" | "txt";

export interface CreateLocalDocParams {
  displayTitle: string;
  extension: NewLocalDocExtension;
  relativeDir?: string;
}

/** Write a new file on disk; caller registers with DocDash via indexFile + upsertDoc. */
export function createLocalDocFile(params: CreateLocalDocParams): string {
  const { displayTitle, extension } = params;
  const contentDir = resolveSafeContentDir(params.relativeDir);
  fs.mkdirSync(contentDir, { recursive: true });
  const base = slugifyFileBase(displayTitle);
  const filePath = uniqueFilePath(contentDir, base, extension);
  const initialContent =
    extension === "txt" ? `${displayTitle}\n\n` : `# ${displayTitle}\n\n`;
  fs.writeFileSync(filePath, initialContent, "utf-8");
  return filePath;
}
