# DocDash

A local-first document dashboard. Register files from anywhere on your Mac, browse them in one place, edit them, and push changes back to the original files.

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Codex app, Codex CLI, or Codex IDE extension if you want the global Codex integration

### Install

```bash
git clone https://github.com/5eanxlee/Document-Dashboard.git
cd Document-Dashboard
npm install
cp .env.example .env.local
```

You can leave `.env.local` without an `OPENAI_API_KEY` if you only want the DocDash dashboard, CLI, and MCP server. Add your own key only if you want the in-app chat features.

### Use Without The Web UI

If you only want Codex, Claude, Cursor MCP, or the DocDash CLI, you do not need the Next.js app running at all.

- Codex uses the global skill and `docdash` MCP server
- MCP-capable clients can use `bin/docdash-mcp.ts`
- The CLI works directly through `npm run docdash ...`

### Environment

Copy `.env.example` to `.env.local` and fill in your own values.

- `OPENAI_API_KEY` is only required for the in-app chat features.
- `DOCDASH_CURSOR_CMD` is optional and defaults to `cursor`.

### Run The Web App

```bash
npm run dev
```

Open http://127.0.0.1:3000

`npm run dev` is only for development.

### Keep The Web App Running In The Background (macOS)

If you want the browser dashboard without manually starting it every time, install the LaunchAgent:

```bash
npm run docdash:web:install
```

That command:

- builds the app for production
- installs a `launchd` user agent
- starts DocDash automatically at login
- serves the UI at `http://127.0.0.1:3000`

To remove it:

```bash
npm run docdash:web:uninstall
```

### Make DocDash Available To Codex Everywhere

From the cloned repository, run:

```bash
npm install
npm run codex:install
```

Then restart Codex. This writes a managed block to `~/.codex/config.toml` that:

- registers the global DocDash skill from this repo’s `.agents/skills/docdash`
- registers a global `docdash` MCP server that runs against this cloned repository
- leaves a timestamped backup of the prior config beside `config.toml`

If you move the repository later, run `npm run codex:install` again. To remove the integration, run `npm run codex:uninstall`.

## AI Agent Setup

This repo now ships three agent-facing surfaces:

- `.agents/skills/docdash/` - Codex-native repo skill location
- `skills/docdash/` - portable Agent Skills bundle for Codex, ChatGPT Skills, Hermes, and other skills-compatible agents
- `.claude/agents/docdash-operator.md` - Claude Code project subagent for DocDash-specific tasks
- `.mcp.json` - project-scoped MCP config exposing `docdash` plus `next-devtools`

The agent surfaces do not depend on the web UI running. They call DocDash through the CLI or MCP server directly.

Start the DocDash MCP server manually if your client does not auto-load `.mcp.json`:

```bash
npm run docdash:mcp
```

Main DocDash MCP tools:

- `list_docs`
- `get_doc`
- `add_doc`
- `save_doc`
- `update_doc_metadata`
- `remove_doc`
- `reindex_doc`
- `reindex_all`
- `repair_doc`
- `repair_all`
- `doctor`

## Register Documents

```bash
# Add a file
npm run docdash add /path/to/file.md

# List registered documents
npm run docdash list

# Re-index all documents
npm run docdash reindex -- --all

# Check registry health
npm run docdash doctor

# Repair missing file paths
npm run docdash repair -- --all
```

Supported file types: `.md`, `.mdx`, `.txt`

## How It Works

- **Files stay where they are.** DocDash stores a registry of file paths, not copies.
- **Live content.** Opening a document reads the file from disk in real-time.
- **Edit and save back.** Changes in the dashboard are written to the original file.
- **Conflict detection.** If a file changes externally while you're editing, DocDash warns you.
- **Auto-repair.** If a file moves within its workspace, DocDash can find it by name and content hash.

## Architecture

```
Document-Dashboard/
├── .agents/
│   └── skills/
│       └── docdash/           # Codex-native skill location
├── .claude/
│   └── agents/
│       └── docdash-operator.md # Claude Code subagent
├── .docdash/                  # App state (gitignored)
│   ├── registry.json          # File registry
│   ├── backups/               # Registry backups
│   └── locks/                 # File locks
├── .mcp.json                  # Project MCP servers
├── bin/
│   ├── docdash.ts             # CLI entry point
│   └── docdash-mcp.ts         # MCP server entry point
├── skills/
│   └── docdash/
│       ├── SKILL.md           # Portable agent skill
│       └── references/        # Skill reference docs
├── scripts/
│   ├── install-codex-global.ts   # Global Codex setup
│   └── uninstall-codex-global.ts # Remove global Codex setup
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard list view
│   │   ├── docs/[id]/page.tsx # Document detail + editor
│   │   └── api/               # API routes
│   │       ├── docs/          # CRUD for documents
│   │       ├── assets/        # Serve relative assets
│   │       ├── cursor/        # Open in Cursor
│   │       └── repair/        # Auto-repair missing files
│   ├── components/
│   │   ├── dashboard/         # List view components
│   │   ├── editor/            # Milkdown + raw editor
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── registry/          # File-backed registry store
│       ├── documents/         # Parsing, indexing, repair
│       ├── search/            # In-memory search
│       └── integrations/      # Cursor integration
└── next.config.ts
```

### Storage

The registry is a JSON file at `.docdash/registry.json`. Reads and writes are protected by a file lock. The storage layer is behind an interface (`RegistryStore`) so it can be swapped to SQLite later.

### Identity

A document's canonical absolute path is its identity. Re-adding the same file updates the existing record.

### Workspace Root

If a file is inside a git repo, the git root is used as the workspace root. Otherwise the file's directory. This is used for:
- Asset resolution (relative paths resolve within the workspace)
- Auto-repair (search for moved files within the workspace)

### Editor

- **Markdown/MDX**: Milkdown rich editor (Notion-style) with a raw markdown fallback
- **Plain text**: Raw text editor
- **MDX with imports**: Falls back to raw mode (no arbitrary code execution)
- **Cmd+S** to save from the editor

### Security

- Bound to `127.0.0.1` only
- Asset serving validates paths are within allowed workspace roots
- Registry writes use atomic temp-file + rename
- File locking prevents concurrent corruption

## CLI Commands

| Command | Description |
|---------|-------------|
| `npm run docdash add <file>` | Register a file |
| `npm run docdash list` | List all registered documents |
| `npm run docdash reindex <file>` | Re-index a specific file |
| `npm run docdash reindex -- --all` | Re-index all files |
| `npm run docdash repair <id>` | Repair a specific document |
| `npm run docdash repair -- --all` | Repair all missing files |
| `npm run docdash doctor` | Health check |
| `npm run codex:install` | Register DocDash globally in Codex |
| `npm run codex:uninstall` | Remove the global Codex registration |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/docs` | GET | List/search/filter documents |
| `/api/docs/[id]` | GET | Get document with live content |
| `/api/docs/[id]` | PUT | Save content (with conflict detection) |
| `/api/docs/[id]` | PATCH | Update metadata (tags, collections, pinned) |
| `/api/docs/[id]` | DELETE | Remove from registry |
| `/api/assets` | GET | Serve relative assets |
| `/api/cursor` | POST | Open file in Cursor |
| `/api/repair` | POST | Auto-repair a missing file |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOCDASH_CURSOR_CMD` | `cursor` | Command to open files in Cursor |
