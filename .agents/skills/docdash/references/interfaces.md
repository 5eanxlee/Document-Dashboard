# DocDash Interfaces

## Preferred Order

1. Use the `docdash` MCP server.
2. Fall back to the installed DocDash CLI.
3. Use the Next.js app or API routes only when the task needs UI or HTTP-level behavior.

Never edit `.docdash/registry.json` manually.

## Global Codex Install

Run this from the cloned DocDash repository:

- `npm install`
- `npm run codex:install`
- Restart Codex

The installer adds two global Codex config entries:

- a `skills.config` entry pointing at this repo’s `.agents/skills/docdash`
- an `mcp_servers.docdash` entry pointing at this repo’s `bin/docdash-mcp.ts`

If the repository moves to a new path, rerun `npm run codex:install`.

## CLI Surface

- `docdash list`
- `docdash add /absolute/or/relative/path.md`
- `docdash reindex <registered-file>`
- `docdash reindex -- --all`
- `docdash repair <doc-id>`
- `docdash repair -- --all`
- `docdash doctor`

If the `docdash` command is not on PATH, run it from the repo with:

- `npm run docdash list`
- `npm run docdash add /path/to/file.md`

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

- Codex:
  Use `.agents/skills/docdash` for repo discovery or run `npm run codex:install` for global discovery.
- Claude / Cursor / other agent clients:
  Use the mirrored `skills/docdash/` folder plus the repo’s `.mcp.json` or client-specific MCP config.
