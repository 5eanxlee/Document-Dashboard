#!/usr/bin/env npx tsx
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LABEL = "com.docdash.web";
const HOST = "127.0.0.1";
const PORT = process.env.DOCDASH_PORT || "3000";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plistPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
}

function serviceTarget() {
  if (typeof process.getuid !== "function") {
    throw new Error("This installer requires a Unix-like environment with launchctl.");
  }
  return `gui/${process.getuid()}`;
}

function nextBin(repoRoot: string) {
  return path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
}

function logsDir(repoRoot: string) {
  return path.join(repoRoot, ".docdash", "logs");
}

function writePlist(repoRoot: string) {
  const nodePath = process.execPath;
  const nextPath = nextBin(repoRoot);
  const outLog = path.join(logsDir(repoRoot), "docdash-web.out.log");
  const errLog = path.join(logsDir(repoRoot), "docdash-web.err.log");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(LABEL)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(nodePath)}</string>
    <string>${escapeXml(nextPath)}</string>
    <string>start</string>
    <string>--hostname</string>
    <string>${escapeXml(HOST)}</string>
    <string>--port</string>
    <string>${escapeXml(PORT)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(repoRoot)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${escapeXml(os.homedir())}</string>
    <key>PATH</key>
    <string>${escapeXml(process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin")}</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${escapeXml(outLog)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(errLog)}</string>
</dict>
</plist>
`;

  const filePath = plistPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.mkdirSync(logsDir(repoRoot), { recursive: true });
  fs.writeFileSync(filePath, plist, "utf-8");
  return filePath;
}

function runLaunchctl(args: string[], stdio: "inherit" | "pipe" = "pipe") {
  execFileSync("launchctl", args, { stdio });
}

function stopExistingService(filePath: string) {
  try {
    runLaunchctl(["bootout", serviceTarget(), filePath]);
  } catch {}
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const nextPath = nextBin(repoRoot);

  if (!fs.existsSync(nextPath)) {
    console.error("Next.js is not installed. Run `npm install` first.");
    process.exit(1);
  }

  console.log("Building DocDash for production...");
  execFileSync(process.execPath, [nextPath, "build"], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  const filePath = writePlist(repoRoot);
  stopExistingService(filePath);

  runLaunchctl(["bootstrap", serviceTarget(), filePath]);
  runLaunchctl(["kickstart", "-k", `${serviceTarget()}/${LABEL}`]);

  console.log(`Installed DocDash web service: ${LABEL}`);
  console.log(`Plist: ${filePath}`);
  console.log(`URL: http://${HOST}:${PORT}`);
  console.log("The service will now start automatically when you log in.");
}

main();
