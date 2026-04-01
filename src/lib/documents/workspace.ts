import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Infer workspace root for a file.
 * If the file is inside a git repo, use the git root.
 * Otherwise, use the file's directory.
 */
export function inferWorkspaceRoot(filePath: string): string {
  const dir = path.dirname(filePath);
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: dir,
      encoding: "utf-8",
      timeout: 3000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (gitRoot) return gitRoot;
  } catch {
    // Not a git repo — fall through
  }
  return dir;
}
