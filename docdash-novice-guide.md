# A Complete Novice's Guide to Document-Dashboard (DocDash)

Welcome to DocDash! If you are completely new to software engineering or just new to this codebase, this guide will walk you through what this project is, how it's built, why it's organized the way it is, and the basic TypeScript concepts that make it tick.

---

## 1. The Fundamentals: What is DocDash?

At its core, **DocDash** is a "local-first document dashboard." Imagine a smart folder that keeps track of all your Markdown (`.md`), plain text (`.txt`), and MDX (`.mdx`) files scattered across your Mac. 

Instead of moving or copying your files into a new database, DocDash acts like a very smart **index or registry**. 

### How it works:
1. **You register a file:** You tell DocDash, "Hey, keep track of this file."
2. **DocDash remembers:** It saves the *path* to that file (e.g., `/Users/you/Documents/notes.md`) in its internal registry.
3. **Live editing:** When you open the file in the DocDash web app, DocDash reads the live file from your hard drive, lets you edit it using a nice rich-text editor (similar to Notion), and when you hit save, it saves your changes straight back to the original file.
4. **AI integration:** It comes with an "MCP Server" (Model Context Protocol). This means AI tools like Claude, Cursor, and Codex can securely read and edit your registered documents.

---

## 2. What was Installed? (The Ingredients)

When you look at the `package.json` file, you'll see a list of "dependencies." Think of these as pre-built Lego blocks we installed to avoid reinventing the wheel. Here are the most important ones:

* **Next.js & React (`next`, `react`)**: This is the core engine for the web application. React handles the interactive user interface (buttons, editors, lists), while Next.js handles the "backend" (API routes, server setup, and routing).
* **Tailwind CSS (`tailwindcss`, `@tailwindcss/postcss`)**: A styling tool. Instead of writing complex CSS files, we use special class names right in our code (like `text-center` or `bg-blue-500`) to design the app quickly.
* **shadcn/ui & Radix UI (`lucide-react`, `clsx`, `tailwind-merge`)**: A collection of beautiful, accessible UI components (buttons, dialogs, dropdowns) that we can copy-paste and customize. `lucide-react` provides the icons.
* **Milkdown (`@milkdown/core`, etc.)**: This is the engine behind the Notion-style rich-text editor. It translates what you type into Markdown automatically.
* **Zod (`zod`)**: A "bouncer" for our data. It checks that the data going in and out of our app is exactly what we expect (e.g., ensuring a document has a `title` that is a string).
* **Commander (`commander`)**: This helps build the Command Line Interface (CLI). It allows you to run commands like `npm run docdash list` in your terminal.
* **Model Context Protocol SDK (`@modelcontextprotocol/sdk`)**: This is the bridge that lets AI agents (like Claude or Cursor) talk to your DocDash registry safely.

---

## 3. Why are the folders organized this way?

The structure of the project is standard for a modern Next.js application, combined with some custom folders for our CLI and AI integrations.

### The App Core
* **`src/` (Source Code)**: The meat of the application. Everything inside here is code we wrote.
  * **`src/app/`**: This is the Next.js App Router. Every folder here represents a URL on the website.
    * `page.tsx`: The main dashboard page you see when you visit `http://localhost:3000`.
    * `docs/[id]/page.tsx`: The specific page for editing a single document.
    * `api/`: The backend server routes. When the web app needs to save a file, it sends a message to `src/app/api/docs/[id]/route.ts`, which then writes to your hard drive.
  * **`src/components/`**: Reusable UI blocks. 
    * `ui/`: Basic building blocks (Buttons, Badges, Inputs).
    * `editor/`: The Milkdown text editor components.
    * `dashboard/`: The layout pieces for the main screen (search bars, document cards).
  * **`src/lib/`**: The "brains" or business logic of the app. This is code that doesn't deal with UI, but handles data.
    * `registry/`: Code that manages the `.docdash/registry.json` database.
    * `documents/`: Code that parses files, reads your hard drive, and fixes broken links if you move a file.

### The Utilities & Bots
* **`bin/`**: Short for "binaries". This contains the scripts that run in your terminal. `docdash.ts` is the CLI you interact with, and `docdash-mcp.ts` is the server that AI agents talk to.
* **`scripts/`**: Helper tools for installing the app globally on your Mac so it runs in the background.

### The Hidden Workspaces (Folders starting with `.`)
* **`.docdash/`**: This is DocDash's own brain. It stores `registry.json` (the list of all your files) and locks/backups to ensure your data is safe.
* **`.claude/`, `.agents/`, `.cursor/`, `skills/`**: These folders contain "instruction manuals" (like `SKILL.md`) that tell AI tools exactly how to interact with DocDash. For example, it tells Claude, "If the user asks to find a file, use the DocDash MCP tool called `list_docs`."

---

## 4. Basic TypeScript that makes it work

TypeScript is just JavaScript with **strict rules (types)**. It prevents bugs by ensuring that a `number` isn't accidentally treated as a `string`. 

Here is a look at the most foundational concept in this app: **The Document Model**.

### Defining what a "Document" is using Zod
If you look inside `src/lib/registry/schema.ts`, you will see something like this:

```typescript
import { z } from "zod";

// 1. Define strict options for the status of a document
export const DocStatus = z.enum(["ok", "missing", "parse_error", "conflict"]);
export type DocStatus = z.infer<typeof DocStatus>;

// 2. Define the exact shape of a Document Entry
export const DocEntry = z.object({
  id: z.string(),
  canonicalPath: z.string(), // The absolute path on your Mac
  workspaceRoot: z.string(), 
  title: z.string(),
  type: z.enum(["md", "txt", "mdx"]),
  tags: z.array(z.string()).default([]), // An array of text strings
  mtimeMs: z.number(), // The time it was last modified (in milliseconds)
  contentHash: z.string(), // A unique fingerprint of the file's content
  status: DocStatus.default("ok"),
});

// 3. Extract a TypeScript Type from the Zod Schema
export type DocEntry = z.infer<typeof DocEntry>;
```

**Why do we do this?**
Because DocDash reads files from your hard drive and saves them to a `registry.json` database, we need to be 100% sure the data isn't corrupted. 

* **Zod** (`z.object(...)`) acts as a runtime validator. When DocDash loads `registry.json`, it passes the data through `DocEntry.parse()`. If a document is missing an `id` or a `canonicalPath`, Zod instantly throws an error, preventing the app from crashing later on.
* **TypeScript** (`export type DocEntry`) acts as a developer tool. When we are writing code in the editor, if we try to type `document.name` instead of `document.title`, TypeScript puts a red squiggly line under it, telling us we made a typo.

### How the frontend and backend talk

Inside `src/lib/types.ts`, we define standard shapes for API responses.

```typescript
export interface DocDetailResponse {
  doc: DocEntry;
  content: string | null;
  liveHash: string | null;
  fileStatus: "ok" | "missing" | "changed";
}
```

When the React frontend asks the Next.js backend for a document, the backend promises to return data that matches `DocDetailResponse`. This means the frontend *knows* it can safely use `response.doc.title` to display the title on the screen, and `response.content` to put the text inside the editor. 

This strict contract is what allows DocDash to safely read, edit, and save files to your hard drive without accidentally deleting or corrupting your data!
