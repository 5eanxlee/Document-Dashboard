#!/usr/bin/env npx tsx
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LABEL = "com.docdash.web";

function plistPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
}

function serviceTarget() {
  if (typeof process.getuid !== "function") {
    throw new Error("This uninstaller requires a Unix-like environment with launchctl.");
  }
  return `gui/${process.getuid()}`;
}

function main() {
  const filePath = plistPath();

  if (fs.existsSync(filePath)) {
    try {
      execFileSync("launchctl", ["bootout", serviceTarget(), filePath], {
        stdio: "pipe",
      });
    } catch {}

    fs.unlinkSync(filePath);
    console.log(`Removed DocDash web service: ${LABEL}`);
    console.log(`Deleted plist: ${filePath}`);
    return;
  }

  console.log(`No DocDash web service plist found at ${filePath}`);
}

main();
