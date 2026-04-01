---
name: docdash
description: Register, inspect, edit, reindex, repair, and audit Markdown, MDX, and plain-text documents in a DocDash workspace. Use when an agent needs to manage documents through DocDash instead of editing `.docdash/registry.json` by hand, or when working in this repository and needing the `docdash` CLI, the DocDash MCP server, or DocDash-specific document safety rules such as conflict-aware saves and workspace-scoped repair.
---

# DocDash

## Overview

Use DocDash as the system of record for registered documents. Prefer the `docdash` MCP server; when that is unavailable, use the DocDash CLI from the repository install.

Do not edit `.docdash/registry.json` manually. Let DocDash compute canonical paths, workspace roots, hashes, and repair candidates.

## Interface Order

1. Prefer the configured `docdash` MCP server.
2. Fall back to the installed DocDash CLI.
3. Use the Next.js app or API routes only when the task specifically needs UI or HTTP behavior.

## Core Workflows

### Register Documents

- Use `add_doc` or `docdash add <file>`.
- Only register `.md`, `.mdx`, and `.txt` files.
- Prefer absolute paths when the calling agent is unsure about its working directory.

### Inspect Documents

- Use `get_doc` when you need live file content, hashes, or file status.
- Use `list_docs` when you only need registry metadata or search/filter results.
- Treat `missing`, `changed`, or `parse_error` as maintenance signals. Reindex or repair before assuming registry data is current.

### Edit Safely

- Read the document first and keep its last known `contentHash`.
- Save through `save_doc` so external edits become explicit conflicts instead of silent overwrites.
- On conflicts, compare `currentContent` with your proposed change and retry intentionally.

### Reindex or Repair

- Use `reindex_doc` or `reindex_all` when on-disk content has changed and registry metadata needs to catch up.
- Use `repair_doc` or `repair_all` when files were moved inside their workspace and the canonical path is stale.
- Use `doctor` before bulk cleanup when you need a summary of missing files, duplicates, or parse failures.

## Constraints

- Source documents stay where they are. DocDash stores paths and metadata, not copies.
- Workspace roots come from the enclosing Git repo when present; repair stays inside that workspace.
- Reindexing should preserve user-managed metadata such as tags, collections, and pinned state.
- Prefer DocDash interfaces over ad hoc filesystem writes when the task is fundamentally about DocDash state.

## Reference

Read [references/interfaces.md](references/interfaces.md) when you need the exact Codex install flow, CLI commands, MCP tool names, or the repo-specific Codex/Claude/Hermes entry points.
