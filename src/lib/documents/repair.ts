import fs from "node:fs";
import path from "node:path";
import { DocEntry } from "@/lib/registry/schema";
import { contentHash } from "./parser";

/**
 * Attempt to find a moved file within the workspace root.
 * Uses basename + size + content hash heuristics.
 * Returns the new absolute path if a single clear match is found, or null.
 */
export async function findMovedFile(entry: DocEntry): Promise<string | null> {
  const basename = path.basename(entry.canonicalPath);
  const wsRoot = entry.workspaceRoot;

  try {
    fs.accessSync(wsRoot, fs.constants.R_OK);
  } catch {
    return null;
  }

  const candidates: string[] = [];

  // Walk the workspace root looking for files with the same basename
  function walk(dir: string, depth: number) {
    if (depth > 10) return; // don't go too deep
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        // Skip hidden dirs and node_modules
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          walk(full, depth + 1);
        } else if (e.name === basename) {
          candidates.push(full);
        }
      }
    } catch {
      // Permission denied or similar — skip
    }
  }

  walk(wsRoot, 0);

  if (candidates.length === 0) return null;

  // If exactly one candidate, check if content hash matches
  if (candidates.length === 1) {
    try {
      const content = fs.readFileSync(candidates[0], "utf-8");
      const hash = contentHash(content);
      if (hash === entry.contentHash) {
        return candidates[0];
      }
      // Even if hash doesn't match (file was edited after moving),
      // same basename in same workspace is likely the same file
      return candidates[0];
    } catch {
      return null;
    }
  }

  // Multiple candidates — try to match by content hash
  for (const candidate of candidates) {
    try {
      const content = fs.readFileSync(candidate, "utf-8");
      const hash = contentHash(content);
      if (hash === entry.contentHash) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  // No hash match among multiple candidates — ambiguous
  return null;
}
