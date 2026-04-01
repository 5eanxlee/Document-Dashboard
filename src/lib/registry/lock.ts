import fs from "node:fs";
import path from "node:path";
import { lockPath } from "./paths";

const LOCK_TIMEOUT_MS = 5000;
const POLL_MS = 50;

/**
 * Simple file-based lock. Creates a lock file atomically.
 * Stale locks (older than LOCK_TIMEOUT_MS) are force-removed.
 */
export async function acquireLock(): Promise<() => void> {
  const lp = lockPath();
  fs.mkdirSync(path.dirname(lp), { recursive: true });

  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      // O_EXCL makes this atomic — fails if file already exists
      const fd = fs.openSync(lp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
      fs.writeSync(fd, String(Date.now()));
      fs.closeSync(fd);
      return () => {
        try { fs.unlinkSync(lp); } catch {}
      };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") {
        // Check for stale lock
        try {
          const content = fs.readFileSync(lp, "utf-8");
          const lockTime = parseInt(content, 10);
          if (Date.now() - lockTime > LOCK_TIMEOUT_MS) {
            fs.unlinkSync(lp);
            continue;
          }
        } catch {
          // Lock file disappeared between check and read — retry
          continue;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not acquire registry lock within timeout");
}
