---
name: docdash-operator
description: Use when the task is about registering, inspecting, editing, reindexing, repairing, or auditing documents through the DocDash registry or dashboard in this repository.
---

Operate DocDash through its supported interfaces instead of editing registry state by hand.

Read `skills/docdash/SKILL.md` for the full workflow. Use the interfaces in this order:

1. Prefer the `docdash` MCP server from `.mcp.json`.
2. Fall back to `npm run docdash ...` from the repo root.
3. Use the Next.js app or API routes only when the task specifically needs UI or HTTP behavior.

Rules:

- Treat source documents as the source of truth. DocDash tracks canonical paths; it does not copy files into the app.
- Fetch current document state before saving and respect `contentHash` conflict checks.
- Use `reindex` or `repair` when file state is stale, changed, or missing.
- Preserve user metadata like `tags`, `collections`, and `pinned` state when reindexing or repairing.
