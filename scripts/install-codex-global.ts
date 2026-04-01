#!/usr/bin/env npx tsx
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const START_MARKER = "# >>> docdash codex setup >>>";
const END_MARKER = "# <<< docdash codex setup <<<";

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedBlockPattern() {
  return new RegExp(
    `${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}\\n?`,
    "m"
  );
}

function buildManagedBlock(repoRoot: string): string {
  const skillPath = path.join(repoRoot, ".agents", "skills", "docdash");

  return [
    START_MARKER,
    "# Managed by `npm run codex:install` from the DocDash repository.",
    "# Re-run this command if you move the repository.",
    "",
    "[[skills.config]]",
    `path = ${tomlString(skillPath)}`,
    "enabled = true",
    "",
    "[mcp_servers.docdash]",
    'command = "node"',
    'args = ["./node_modules/tsx/dist/cli.mjs", "./bin/docdash-mcp.ts"]',
    `cwd = ${tomlString(repoRoot)}`,
    "enabled = true",
    "startup_timeout_sec = 20",
    "tool_timeout_sec = 120",
    END_MARKER,
  ].join("\n");
}

function replaceManagedBlock(content: string, block: string): { next: string; changed: boolean } {
  const existingPattern = managedBlockPattern();

  const trimmed = content.trimEnd();
  const replaced = existingPattern.test(content)
    ? content.replace(existingPattern, `${block}\n`)
    : `${trimmed}${trimmed ? "\n\n" : ""}${block}\n`;

  return { next: replaced, changed: replaced !== content };
}

function backupIfNeeded(configPath: string, content: string) {
  if (!content) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(`${configPath}.bak.${stamp}`, content, "utf-8");
}

function stripManagedBlock(content: string): string {
  return content.replace(managedBlockPattern(), "");
}

function hasUnmanagedDocdashServerConfig(content: string): boolean {
  return /^\[mcp_servers\.docdash\]$/m.test(stripManagedBlock(content));
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const configPath = path.join(codexHome, "config.toml");

  fs.mkdirSync(codexHome, { recursive: true });

  const current = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf-8")
    : "";

  if (hasUnmanagedDocdashServerConfig(current)) {
    console.error(
      [
        "Found an existing unmanaged `[mcp_servers.docdash]` entry in your Codex config.",
        "Remove or rename that block, then re-run `npm run codex:install`.",
        `Config path: ${configPath}`,
      ].join("\n")
    );
    process.exit(1);
  }

  const managedBlock = buildManagedBlock(repoRoot);
  const { next, changed } = replaceManagedBlock(current, managedBlock);

  if (!changed) {
    console.log(`DocDash Codex config already installed in ${configPath}`);
    console.log("Restart Codex if it is already running.");
    return;
  }

  backupIfNeeded(configPath, current);
  fs.writeFileSync(configPath, next, "utf-8");

  console.log(`Installed DocDash Codex config into ${configPath}`);
  console.log(`Skill path: ${path.join(repoRoot, ".agents", "skills", "docdash")}`);
  console.log(`MCP cwd: ${repoRoot}`);
  console.log("Restart Codex to load the new skill and MCP server.");
}

main();
