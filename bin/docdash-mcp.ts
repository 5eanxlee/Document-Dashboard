#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import packageJson from "../package.json";
import {
  deleteDoc,
  ensureDocdashDirs,
  getAllDocs,
  getDoc,
  updateDoc,
  upsertDoc,
} from "../src/lib/registry";
import type { DocEntry } from "../src/lib/registry/schema";
import {
  contentHash,
  fileExists,
  findMovedFile,
  hasFileChanged,
  indexFile,
  isSupportedFile,
} from "../src/lib/documents";
import { filterDocs, searchDocs, type FilterOptions } from "../src/lib/search";

const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

const docTypeSchema = z.enum(["md", "mdx", "txt"]);
const docStatusSchema = z.enum(["ok", "missing", "parse_error", "conflict"]);
const fileStatusSchema = z.enum(["ok", "missing", "changed"]);

const docSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  canonicalPath: z.string(),
  workspaceRoot: z.string(),
  type: docTypeSchema,
  tags: z.array(z.string()),
  collections: z.array(z.string()),
  pinned: z.boolean(),
  status: docStatusSchema,
  excerpt: z.string(),
  mtimeMs: z.number(),
  contentHash: z.string(),
  lastIndexedAt: z.string(),
  lastOpenedAt: z.string().nullable(),
});

const docDetailSchema = docSummarySchema.extend({
  frontmatter: z.record(z.string(), z.unknown()),
});

const docIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  canonicalPath: z.string(),
});

function summarizeDoc(doc: DocEntry) {
  return {
    id: doc.id,
    title: doc.title,
    canonicalPath: doc.canonicalPath,
    workspaceRoot: doc.workspaceRoot,
    type: doc.type,
    tags: doc.tags,
    collections: doc.collections,
    pinned: doc.pinned,
    status: doc.status,
    excerpt: doc.excerpt,
    mtimeMs: doc.mtimeMs,
    contentHash: doc.contentHash,
    lastIndexedAt: doc.lastIndexedAt,
    lastOpenedAt: doc.lastOpenedAt,
  };
}

function detailDoc(
  doc: DocEntry,
  content: string | null,
  liveHash: string | null,
  fileStatus: z.infer<typeof fileStatusSchema>,
  truncated: boolean
) {
  return {
    doc: {
      ...summarizeDoc(doc),
      frontmatter: doc.frontmatter,
    },
    content,
    liveHash,
    fileStatus,
    truncated,
  };
}

function issueFromDoc(doc: DocEntry) {
  return {
    id: doc.id,
    title: doc.title,
    canonicalPath: doc.canonicalPath,
  };
}

function resolveFilePath(inputPath: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(projectRoot, inputPath);
}

function normalizeStringList(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function okResult<T extends Record<string, unknown>>(structuredContent: T) {
  return {
    content: [{ type: "text" as const, text: formatText(structuredContent) }],
    structuredContent,
  };
}

function errorResult(message: string, details?: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: details ? `${message}\n\n${formatText(details)}` : message,
      },
    ],
    isError: true,
  };
}

async function refreshDocEntry(doc: DocEntry): Promise<DocEntry> {
  if (!fileExists(doc)) {
    if (doc.status !== "missing") {
      const updated = await updateDoc(doc.id, { status: "missing" });
      return updated ?? { ...doc, status: "missing" };
    }
    return doc;
  }

  if (doc.status === "missing" || hasFileChanged(doc)) {
    try {
      const reindexed = indexFile(doc.canonicalPath, doc.id);
      return await upsertDoc(reindexed);
    } catch {
      const updated = await updateDoc(doc.id, { status: "parse_error" });
      return updated ?? { ...doc, status: "parse_error" };
    }
  }

  return doc;
}

async function refreshAllDocs(): Promise<DocEntry[]> {
  ensureDocdashDirs();
  const docs = await getAllDocs();
  const refreshed: DocEntry[] = [];

  for (const doc of docs) {
    refreshed.push(await refreshDocEntry(doc));
  }

  return refreshed;
}

async function getFreshDoc(id: string): Promise<DocEntry | null> {
  ensureDocdashDirs();
  const doc = await getDoc(id);
  if (!doc) return null;
  return refreshDocEntry(doc);
}

const server = new McpServer({
  name: "docdash",
  version: packageJson.version,
});

server.registerTool(
  "list_docs",
  {
    description:
      "List registered DocDash documents with optional search and metadata filters.",
    inputSchema: {
      query: z.string().optional(),
      type: docTypeSchema.optional(),
      tag: z.string().optional(),
      collection: z.string().optional(),
      workspaceRoot: z.string().optional(),
      status: docStatusSchema.optional(),
      pinnedOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
    outputSchema: {
      totalMatches: z.number().int(),
      returned: z.number().int(),
      docs: z.array(docSummarySchema),
    },
  },
  async ({ query, type, tag, collection, workspaceRoot, status, pinnedOnly, limit }) => {
    let docs = await refreshAllDocs();

    const filters: FilterOptions = {
      type,
      tag,
      collection,
      workspaceRoot,
      status,
      pinned: pinnedOnly,
    };

    docs = filterDocs(docs, filters);
    if (query) {
      docs = searchDocs(docs, query);
    }

    const totalMatches = docs.length;
    const cappedDocs = docs.slice(0, limit ?? 100).map(summarizeDoc);

    return okResult({
      totalMatches,
      returned: cappedDocs.length,
      docs: cappedDocs,
    });
  }
);

server.registerTool(
  "get_doc",
  {
    description:
      "Read a registered document with live file status and optional content.",
    inputSchema: {
      id: z.string(),
      includeContent: z.boolean().optional(),
      maxChars: z.number().int().min(1).optional(),
    },
    outputSchema: {
      doc: docDetailSchema,
      content: z.string().nullable(),
      liveHash: z.string().nullable(),
      fileStatus: fileStatusSchema,
      truncated: z.boolean(),
    },
  },
  async ({ id, includeContent, maxChars }) => {
    let doc = await getFreshDoc(id);
    if (!doc) {
      return errorResult(`Document not found: ${id}`);
    }

    let content: string | null = null;
    let liveHash: string | null = null;
    let fileStatus: z.infer<typeof fileStatusSchema> = "ok";
    let truncated = false;

    try {
      const rawContent = fs.readFileSync(doc.canonicalPath, "utf-8");
      liveHash = contentHash(rawContent);
      fileStatus = liveHash === doc.contentHash ? "ok" : "changed";

      if (includeContent !== false) {
        if (maxChars && rawContent.length > maxChars) {
          content = rawContent.slice(0, maxChars);
          truncated = true;
        } else {
          content = rawContent;
        }
      }
    } catch {
      fileStatus = "missing";
      const updated = await updateDoc(doc.id, { status: "missing" });
      doc = updated ?? { ...doc, status: "missing" };
    }

    const opened = await updateDoc(doc.id, { lastOpenedAt: new Date().toISOString() });
    if (opened) {
      doc = opened;
    }

    return okResult(detailDoc(doc, content, liveHash, fileStatus, truncated));
  }
);

server.registerTool(
  "add_doc",
  {
    description:
      "Register a Markdown, MDX, or plain-text file with DocDash.",
    inputSchema: {
      path: z.string(),
    },
    outputSchema: {
      action: z.enum(["added", "updated"]),
      doc: docSummarySchema,
    },
  },
  async ({ path: inputPath }) => {
    ensureDocdashDirs();
    const absolutePath = resolveFilePath(inputPath);

    if (!fs.existsSync(absolutePath)) {
      return errorResult(`File not found: ${absolutePath}`);
    }

    if (!isSupportedFile(absolutePath)) {
      return errorResult(
        "Unsupported file type. Supported extensions are .md, .mdx, and .txt.",
        { path: absolutePath }
      );
    }

    const existing = (await getAllDocs()).find((doc) => doc.canonicalPath === absolutePath);
    const indexed = indexFile(absolutePath, existing?.id);
    const stored = await upsertDoc(indexed);

    return okResult({
      action: existing ? "updated" : "added",
      doc: summarizeDoc(stored),
    });
  }
);

server.registerTool(
  "save_doc",
  {
    description:
      "Save content back to a registered document using DocDash conflict detection.",
    inputSchema: {
      id: z.string(),
      content: z.string(),
      expectedHash: z.string(),
    },
    outputSchema: {
      status: z.enum(["saved", "conflict"]),
      doc: docSummarySchema.optional(),
      newHash: z.string().optional(),
      currentHash: z.string().optional(),
      currentContent: z.string().optional(),
    },
  },
  async ({ id, content, expectedHash }) => {
    const doc = await getFreshDoc(id);
    if (!doc) {
      return errorResult(`Document not found: ${id}`);
    }

    let currentContent: string;
    try {
      currentContent = fs.readFileSync(doc.canonicalPath, "utf-8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return errorResult(`File not found on disk: ${doc.canonicalPath}`);
      }
      return errorResult("Failed to read current document content.", {
        message: (error as Error).message,
      });
    }

    const currentHash = contentHash(currentContent);
    if (currentHash !== expectedHash) {
      return okResult({
        status: "conflict",
        currentHash,
        currentContent,
      });
    }

    const tmpPath = `${doc.canonicalPath}.docdash-tmp`;
    try {
      fs.writeFileSync(tmpPath, content, "utf-8");
      fs.renameSync(tmpPath, doc.canonicalPath);
    } catch (error) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {}

      return errorResult("Write failed.", {
        message: (error as Error).message,
      });
    }

    const reindexed = indexFile(doc.canonicalPath, doc.id);
    const stored = await upsertDoc(reindexed);

    return okResult({
      status: "saved",
      doc: summarizeDoc(stored),
      newHash: stored.contentHash,
    });
  }
);

server.registerTool(
  "update_doc_metadata",
  {
    description:
      "Update a document's tags, collections, or pinned state without reindexing content.",
    inputSchema: {
      id: z.string(),
      tags: z.array(z.string()).optional(),
      collections: z.array(z.string()).optional(),
      pinned: z.boolean().optional(),
    },
    outputSchema: {
      doc: docSummarySchema,
    },
  },
  async ({ id, tags, collections, pinned }) => {
    const updates: Partial<DocEntry> = {};

    if (tags !== undefined) {
      updates.tags = normalizeStringList(tags) ?? [];
    }
    if (collections !== undefined) {
      updates.collections = normalizeStringList(collections) ?? [];
    }
    if (pinned !== undefined) {
      updates.pinned = pinned;
    }

    if (Object.keys(updates).length === 0) {
      return errorResult("No metadata fields provided. Supply tags, collections, or pinned.");
    }

    const updated = await updateDoc(id, updates);
    if (!updated) {
      return errorResult(`Document not found: ${id}`);
    }

    return okResult({
      doc: summarizeDoc(updated),
    });
  }
);

server.registerTool(
  "remove_doc",
  {
    description: "Remove a document from the DocDash registry without deleting the source file.",
    inputSchema: {
      id: z.string(),
    },
    outputSchema: {
      success: z.literal(true),
      id: z.string(),
    },
  },
  async ({ id }) => {
    const removed = await deleteDoc(id);
    if (!removed) {
      return errorResult(`Document not found: ${id}`);
    }

    return okResult({
      success: true,
      id,
    });
  }
);

server.registerTool(
  "reindex_doc",
  {
    description: "Re-index a single registered document from its current on-disk contents.",
    inputSchema: {
      id: z.string(),
    },
    outputSchema: {
      status: z.literal("reindexed"),
      doc: docSummarySchema,
    },
  },
  async ({ id }) => {
    const doc = await getDoc(id);
    if (!doc) {
      return errorResult(`Document not found: ${id}`);
    }

    if (!fs.existsSync(doc.canonicalPath)) {
      await updateDoc(id, { status: "missing" });
      return errorResult(`File not found on disk: ${doc.canonicalPath}`);
    }

    try {
      const reindexed = indexFile(doc.canonicalPath, doc.id);
      const stored = await upsertDoc(reindexed);
      return okResult({
        status: "reindexed",
        doc: summarizeDoc(stored),
      });
    } catch (error) {
      await updateDoc(id, { status: "parse_error" });
      return errorResult("Reindex failed.", {
        message: (error as Error).message,
        path: doc.canonicalPath,
      });
    }
  }
);

server.registerTool(
  "reindex_all",
  {
    description: "Re-index every registered document and mark missing or broken entries.",
    outputSchema: {
      reindexed: z.number().int(),
      missing: z.number().int(),
      errors: z.number().int(),
    },
  },
  async () => {
    ensureDocdashDirs();
    const docs = await getAllDocs();
    let reindexed = 0;
    let missing = 0;
    let errors = 0;

    for (const doc of docs) {
      try {
        if (!fs.existsSync(doc.canonicalPath)) {
          await updateDoc(doc.id, { status: "missing" });
          missing++;
          continue;
        }

        const indexed = indexFile(doc.canonicalPath, doc.id);
        await upsertDoc(indexed);
        reindexed++;
      } catch {
        await updateDoc(doc.id, { status: "parse_error" });
        errors++;
      }
    }

    return okResult({
      reindexed,
      missing,
      errors,
    });
  }
);

server.registerTool(
  "repair_doc",
  {
    description: "Attempt to repair a missing document by finding its moved file inside the workspace root.",
    inputSchema: {
      id: z.string(),
    },
    outputSchema: {
      status: z.enum(["ok", "repaired", "missing"]),
      doc: docSummarySchema.optional(),
      oldPath: z.string().optional(),
      newPath: z.string().optional(),
      message: z.string().optional(),
    },
  },
  async ({ id }) => {
    const doc = await getDoc(id);
    if (!doc) {
      return errorResult(`Document not found: ${id}`);
    }

    if (fileExists(doc)) {
      return okResult({
        status: "ok",
        doc: summarizeDoc(doc),
        message: "File exists at the registered path.",
      });
    }

    const newPath = await findMovedFile(doc);
    if (newPath) {
      const indexed = indexFile(newPath, doc.id);
      const stored = await upsertDoc(indexed);
      return okResult({
        status: "repaired",
        doc: summarizeDoc(stored),
        oldPath: doc.canonicalPath,
        newPath,
      });
    }

    await updateDoc(doc.id, { status: "missing" });
    return okResult({
      status: "missing",
      message: "Could not find a moved file inside the workspace root.",
    });
  }
);

server.registerTool(
  "repair_all",
  {
    description: "Attempt to repair every currently missing document.",
    outputSchema: {
      repaired: z.number().int(),
      stillMissing: z.number().int(),
      repairedDocs: z.array(docSummarySchema),
      missingDocs: z.array(docIssueSchema),
    },
  },
  async () => {
    const docs = await refreshAllDocs();
    const repairedDocs: ReturnType<typeof summarizeDoc>[] = [];
    const missingDocs: ReturnType<typeof issueFromDoc>[] = [];

    for (const doc of docs) {
      if (fileExists(doc)) {
        continue;
      }

      const newPath = await findMovedFile(doc);
      if (newPath) {
        const indexed = indexFile(newPath, doc.id);
        const stored = await upsertDoc(indexed);
        repairedDocs.push(summarizeDoc(stored));
      } else {
        await updateDoc(doc.id, { status: "missing" });
        missingDocs.push(issueFromDoc(doc));
      }
    }

    return okResult({
      repaired: repairedDocs.length,
      stillMissing: missingDocs.length,
      repairedDocs,
      missingDocs,
    });
  }
);

server.registerTool(
  "doctor",
  {
    description: "Run the DocDash registry health check and summarize problems.",
    outputSchema: {
      docCount: z.number().int(),
      missingDocs: z.array(docIssueSchema),
      duplicatePaths: z.array(
        z.object({
          canonicalPath: z.string(),
          count: z.number().int(),
        })
      ),
      parseErrorDocs: z.array(docIssueSchema),
      stats: z.object({
        types: z.record(z.string(), z.number().int()),
        workspaces: z.number().int(),
        pinned: z.number().int(),
        tags: z.number().int(),
        collections: z.number().int(),
      }),
      issues: z.number().int(),
    },
  },
  async () => {
    const docs = await refreshAllDocs();
    const missingDocs = docs.filter((doc) => !fileExists(doc)).map(issueFromDoc);
    const parseErrorDocs = docs
      .filter((doc) => doc.status === "parse_error")
      .map(issueFromDoc);

    const pathCounts = new Map<string, number>();
    for (const doc of docs) {
      pathCounts.set(doc.canonicalPath, (pathCounts.get(doc.canonicalPath) || 0) + 1);
    }

    const duplicatePaths = [...pathCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([canonicalPath, count]) => ({ canonicalPath, count }));

    const typeCounts = new Map<string, number>();
    const workspaceRoots = new Set<string>();
    const tags = new Set<string>();
    const collections = new Set<string>();

    for (const doc of docs) {
      typeCounts.set(doc.type, (typeCounts.get(doc.type) || 0) + 1);
      workspaceRoots.add(doc.workspaceRoot);
      for (const tag of doc.tags) tags.add(tag);
      for (const collection of doc.collections) collections.add(collection);
    }

    const issues = missingDocs.length + duplicatePaths.length + parseErrorDocs.length;

    return okResult({
      docCount: docs.length,
      missingDocs,
      duplicatePaths,
      parseErrorDocs,
      stats: {
        types: Object.fromEntries(typeCounts.entries()),
        workspaces: workspaceRoots.size,
        pinned: docs.filter((doc) => doc.pinned).length,
        tags: tags.size,
        collections: collections.size,
      },
      issues,
    });
  }
);

async function main() {
  ensureDocdashDirs();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("DocDash MCP server error:", error);
  process.exit(1);
});
