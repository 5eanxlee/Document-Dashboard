# DocDash Interfaces

## Preferred Order

1. Use the `docdash` MCP server from `.mcp.json`.
2. Fall back to `npm run docdash ...` from the repo root.
3. Use the Next.js app or API routes only when the task needs UI or HTTP-level behavior.

Never edit `.docdash/registry.json` manually.

## Global Codex Install

Run this from the cloned DocDash repository:

- `npm install`
- `npm run codex:install`
- Restart Codex

The installer writes a managed block to `~/.codex/config.toml` that points Codex at this repo’s skill and MCP server. Re-run it if the repository moves to a new path.

## CLI Surface

- `npm run docdash list`
- `npm run docdash add /absolute/or/relative/path.md`
- `npm run docdash reindex <registered-file>`
- `npm run docdash reindex -- --all`
- `npm run docdash repair <doc-id>`
- `npm run docdash repair -- --all`
- `npm run docdash doctor`

## MCP Tools

| Tool | Use for |
| --- | --- |
| `list_docs` | Search or filter the registry |
| `get_doc` | Read live document state and optional content |
| `add_doc` | Register a new file |
| `save_doc` | Save with conflict detection |
| `update_doc_metadata` | Update tags, collections, or pinned state |
| `remove_doc` | Remove a registry entry without deleting the file |
| `reindex_doc` | Re-index one registered file |
| `reindex_all` | Re-index every registered file |
| `repair_doc` | Repair one missing file path |
| `repair_all` | Repair all missing file paths |
| `doctor` | Audit registry health |

## Agent Entry Points

- Codex / ChatGPT Skills / Hermes / other Agent Skills clients:
  Load the `skills/docdash/` folder as the canonical skill bundle.
- Codex global install:
  Run `npm run codex:install` to make the DocDash skill and MCP server available from any directory.
- Claude Code:
  Use `CLAUDE.md`, `.claude/agents/docdash-operator.md`, and project `.mcp.json`.
- MCP-capable agents without skills support:
  Start `npm run docdash:mcp` or load the project `.mcp.json` file.
