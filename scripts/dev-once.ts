#!/usr/bin/env npx tsx
/**
 * Runs `next dev` only if another dev server is not already holding the
 * project lock. Avoids the confusing case where Next binds a new port, prints
 * "Ready", then exits with "Another next dev server is already running."
 *
 * Forward extra CLI args after the script name, e.g.:
 *   npm run dev -- -p 4000
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const lockPath = path.join(repoRoot, ".next", "dev", "lock");
const nextCli = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ESRCH") return false;
    throw e;
  }
}

function main(): void {
  if (fs.existsSync(lockPath)) {
    let raw: string;
    try {
      raw = fs.readFileSync(lockPath, "utf-8");
    } catch {
      raw = "";
    }
    let pid: number | undefined;
    let appUrl: string | undefined;
    try {
      const info = JSON.parse(raw) as { pid?: number; appUrl?: string };
      if (typeof info.pid === "number") pid = info.pid;
      if (typeof info.appUrl === "string") appUrl = info.appUrl;
    } catch {
      /* ignore */
    }

    if (pid !== undefined && isPidRunning(pid)) {
      console.info(
        `Dev server already running for this project${appUrl ? ` (${appUrl})` : ""}.`,
      );
      console.info(`PID ${pid}. Use that terminal or stop it before starting another.`);
      process.exit(0);
    }

    try {
      fs.unlinkSync(lockPath);
    } catch {
      /* another start may be racing; next dev will report lock error */
    }
  }

  const forwarded = process.argv.slice(2);
  const result = spawnSync(
    process.execPath,
    [nextCli, "dev", "--hostname", "127.0.0.1", ...forwarded],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
  process.exit(result.status ?? 1);
}

main();
