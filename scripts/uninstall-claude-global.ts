#!/usr/bin/env npx tsx
/**
 * Removes the DocDash MCP server from Claude Code's global settings.
 *
 * Usage:  npm run claude:uninstall
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MCP_NAME = "docdash";

function main() {
  const claudeHome = process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude");
  const settingsPath = path.join(claudeHome, "settings.json");

  if (!fs.existsSync(settingsPath)) {
    console.log(`No Claude Code settings found at ${settingsPath}`);
    return;
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  } catch {
    console.error(`Failed to parse ${settingsPath}. Fix the JSON and re-run.`);
    process.exit(1);
  }

  const mcpServers = settings.mcpServers as Record<string, unknown> | undefined;
  if (!mcpServers || !(MCP_NAME in mcpServers)) {
    console.log("DocDash MCP server not found in Claude Code settings.");
    return;
  }

  // Backup before modifying
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(claudeHome, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(settingsPath, path.join(backupDir, `settings.json.bak.${stamp}`));

  delete mcpServers[MCP_NAME];
  if (Object.keys(mcpServers).length === 0) {
    delete settings.mcpServers;
  } else {
    settings.mcpServers = mcpServers;
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");

  console.log(`Removed DocDash MCP server from ${settingsPath}`);
  console.log("Restart Claude Code to unload the DocDash MCP server.");
}

main();
