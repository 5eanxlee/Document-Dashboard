#!/usr/bin/env npx tsx
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const START_MARKER = "# >>> docdash codex setup >>>";
const END_MARKER = "# <<< docdash codex setup <<<";

function main() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const configPath = path.join(codexHome, "config.toml");

  if (!fs.existsSync(configPath)) {
    console.log(`No Codex config found at ${configPath}`);
    return;
  }

  const current = fs.readFileSync(configPath, "utf-8");
  const pattern = new RegExp(
    `\\n?${START_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
    "m"
  );
  const next = current.replace(pattern, "\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";

  if (next === current) {
    console.log("DocDash Codex config block not found.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(`${configPath}.bak.${stamp}`, current, "utf-8");
  fs.writeFileSync(configPath, next, "utf-8");

  console.log(`Removed DocDash Codex config from ${configPath}`);
  console.log("Restart Codex to unload the DocDash skill and MCP server.");
}

main();
