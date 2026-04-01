import path from "node:path";
import { getAllDocs } from "@/lib/registry";

/**
 * Validate that a file path is within an allowed workspace root.
 * Prevents path traversal attacks.
 */
export async function isPathAllowed(filePath: string): Promise<boolean> {
  const resolved = path.resolve(filePath);
  const docs = await getAllDocs();
  const allowedRoots = new Set(docs.map((d) => d.workspaceRoot));

  for (const root of allowedRoots) {
    if (resolved.startsWith(root + path.sep) || resolved === root) {
      return true;
    }
  }
  return false;
}

/**
 * Validate that an asset path is within the document's workspace root.
 */
export function isAssetPathSafe(
  assetPath: string,
  docDir: string,
  workspaceRoot: string
): boolean {
  const resolved = path.resolve(docDir, assetPath);
  // Must be within workspace root
  return resolved.startsWith(workspaceRoot + path.sep) || resolved === workspaceRoot;
}
