import { z } from "zod";

export const DocStatus = z.enum(["ok", "missing", "parse_error", "conflict"]);
export type DocStatus = z.infer<typeof DocStatus>;

export const DocType = z.enum(["md", "txt", "mdx"]);
export type DocType = z.infer<typeof DocType>;

export const DocEntry = z.object({
  id: z.string(),
  canonicalPath: z.string(),
  workspaceRoot: z.string(),
  title: z.string(),
  type: DocType,
  tags: z.array(z.string()).default([]),
  collections: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  mtimeMs: z.number(),
  contentHash: z.string(),
  lastIndexedAt: z.string(), // ISO date
  lastOpenedAt: z.string().nullable().default(null),
  excerpt: z.string().default(""),
  searchText: z.string().default(""),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  status: DocStatus.default("ok"),
});
export type DocEntry = z.infer<typeof DocEntry>;

export const Registry = z.object({
  version: z.literal(1),
  docs: z.array(DocEntry),
});
export type Registry = z.infer<typeof Registry>;

export function emptyRegistry(): Registry {
  return { version: 1, docs: [] };
}
