#!/usr/bin/env npx tsx
/**
 * Adds the DocDash MCP server to Claude Code's global settings (~/.claude/settings.json)
 * so it is available from any directory or interface.
 *
 * Usage:  npm run claude:install
 * Undo:   npm run claude:uninstall
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MCP_NAME = "docdash";

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const claudeHome = process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude");
  const settingsPath = path.join(claudeHome, "settings.json");

  // Ensure ~/.claude exists
  fs.mkdirSync(claudeHome, { recursive: true });

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    } catch {
      console.error(`Failed to parse ${settingsPath}. Fix the JSON and re-run.`);
      process.exit(1);
    }
  }

  // Build the MCP server entry — uses tsx to run the TypeScript MCP server
  // with the repo as cwd so all relative imports resolve correctly.
  const mcpEntry = {
    command: "node",
    args: [
      path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs"),
      path.join(repoRoot, "bin", "docdash-mcp.ts"),
    ],
    cwd: repoRoot,
    env: {},
  };

  // Merge into settings
  const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
  const existing = mcpServers[MCP_NAME];

  if (existing && JSON.stringify(existing) === JSON.stringify(mcpEntry)) {
    console.log(`DocDash MCP server already configured in ${settingsPath}`);
    console.log("Restart Claude Code if it is already running.");
    return;
  }

  // Backup before modifying
  if (fs.existsSync(settingsPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(claudeHome, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(settingsPath, path.join(backupDir, `settings.json.bak.${stamp}`));
  }

  mcpServers[MCP_NAME] = mcpEntry;
  settings.mcpServers = mcpServers;

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");

  console.log(`Installed DocDash MCP server into ${settingsPath}`);
  console.log(`  command: node`);
  console.log(`  args: ${mcpEntry.args.join(" ")}`);
  console.log(`  cwd: ${repoRoot}`);
  console.log("");
  console.log("Restart Claude Code to load the DocDash MCP server.");
}

main();
