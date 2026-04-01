import { execSync } from "node:child_process";

const CURSOR_COMMAND = process.env.DOCDASH_CURSOR_CMD || "cursor";

/**
 * Open a file in Cursor editor.
 * Falls back to `open -a Cursor` on macOS.
 */
export function openInCursor(filePath: string): { success: boolean; error?: string } {
  try {
    execSync(`${CURSOR_COMMAND} "${filePath}"`, {
      timeout: 5000,
      stdio: "pipe",
    });
    return { success: true };
  } catch {
    // Fallback: macOS open command
    try {
      execSync(`open -a "Cursor" "${filePath}"`, {
        timeout: 5000,
        stdio: "pipe",
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Could not open file in Cursor: ${(err as Error).message}`,
      };
    }
  }
}
