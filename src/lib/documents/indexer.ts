import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { DocEntry } from "@/lib/registry/schema";
import { parseDocument, contentHash, inferDocType } from "./parser";
import { inferWorkspaceRoot } from "./workspace";

const SUPPORTED_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

/** Check if a file extension is supported */
export function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/**
 * Index a file and produce a DocEntry.
 * If an existing entry is provided, reuse its ID.
 */
export function indexFile(
  absolutePath: string,
  existingId?: string
): DocEntry {
  const stat = fs.statSync(absolutePath);
  const rawContent = fs.readFileSync(absolutePath, "utf-8");
  const parsed = parseDocument(absolutePath, rawContent);
  const hash = contentHash(rawContent);
  const wsRoot = inferWorkspaceRoot(absolutePath);

  // Extract tags from frontmatter if present
  const fmTags = Array.isArray(parsed.frontmatter.tags)
    ? parsed.frontmatter.tags.map(String)
    : [];

  return {
    id: existingId || nanoid(),
    canonicalPath: absolutePath,
    workspaceRoot: wsRoot,
    title: parsed.title,
    type: inferDocType(absolutePath),
    tags: fmTags,
    collections: [],
    pinned: false,
    mtimeMs: stat.mtimeMs,
    contentHash: hash,
    lastIndexedAt: new Date().toISOString(),
    lastOpenedAt: null,
    excerpt: parsed.excerpt,
    searchText: parsed.searchText,
    frontmatter: parsed.frontmatter,
    status: "ok",
  };
}

/**
 * Check if a file has changed since last index.
 * Returns true if the file content or mtime has changed.
 */
export function hasFileChanged(entry: DocEntry): boolean {
  try {
    const stat = fs.statSync(entry.canonicalPath);
    if (stat.mtimeMs !== entry.mtimeMs) {
      // mtime changed — verify with hash
      const content = fs.readFileSync(entry.canonicalPath, "utf-8");
      const hash = contentHash(content);
      return hash !== entry.contentHash;
    }
    return false;
  } catch {
    return true; // file missing or unreadable
  }
}

/** Check if the file at the registered path still exists */
export function fileExists(entry: DocEntry): boolean {
  try {
    fs.accessSync(entry.canonicalPath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
