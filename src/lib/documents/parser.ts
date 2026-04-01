import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import { DocType } from "@/lib/registry/schema";

export interface ParsedDoc {
  title: string;
  type: DocType;
  excerpt: string;
  searchText: string;
  frontmatter: Record<string, unknown>;
  content: string; // body without frontmatter
  rawContent: string; // full file content
}

/** Infer document type from file extension */
export function inferDocType(filePath: string): DocType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
      return "md";
    case ".mdx":
      return "mdx";
    case ".txt":
      return "txt";
    default:
      return "txt";
  }
}

/** Parse a document file and extract metadata */
export function parseDocument(filePath: string, rawContent?: string): ParsedDoc {
  const content = rawContent ?? fs.readFileSync(filePath, "utf-8");
  const type = inferDocType(filePath);

  if (type === "txt") {
    return parsePlainText(filePath, content);
  }

  return parseMarkdown(filePath, content, type);
}

function parseMarkdown(
  filePath: string,
  rawContent: string,
  type: DocType
): ParsedDoc {
  let frontmatter: Record<string, unknown> = {};
  let body = rawContent;

  try {
    const parsed = matter(rawContent);
    frontmatter = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch {
    // If frontmatter parsing fails, use raw content
  }

  const title =
    (frontmatter.title as string) ||
    extractMarkdownTitle(body) ||
    path.basename(filePath, path.extname(filePath));

  const excerpt = extractExcerpt(body, 200);
  const searchText = buildSearchText(title, body, frontmatter);

  return {
    title,
    type,
    excerpt,
    searchText,
    frontmatter,
    content: body,
    rawContent,
  };
}

function parsePlainText(filePath: string, rawContent: string): ParsedDoc {
  const title = path.basename(filePath, path.extname(filePath));
  const excerpt = extractExcerpt(rawContent, 200);
  const searchText = buildSearchText(title, rawContent, {});

  return {
    title,
    type: "txt",
    excerpt,
    searchText,
    frontmatter: {},
    content: rawContent,
    rawContent,
  };
}

/** Extract first H1 from markdown */
function extractMarkdownTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Extract first N chars of meaningful text */
function extractExcerpt(content: string, maxLen: number): string {
  const text = content
    .replace(/^---[\s\S]*?---/m, "") // remove frontmatter
    .replace(/^#+\s+.+$/gm, "") // remove headings
    .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // links -> text
    .replace(/[*_~`]/g, "") // remove formatting chars
    .replace(/\n{2,}/g, "\n") // collapse blank lines
    .trim();

  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

/** Build search-friendly text blob */
function buildSearchText(
  title: string,
  content: string,
  frontmatter: Record<string, unknown>
): string {
  const parts = [title];

  // Add tags from frontmatter
  const tags = frontmatter.tags;
  if (Array.isArray(tags)) {
    parts.push(...tags.map(String));
  }

  // Add stripped content
  const stripped = content
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]*`/g, "") // remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // links -> text
    .replace(/[#*_~`>\-|]/g, " ") // remove md formatting
    .replace(/\s+/g, " ")
    .trim();

  parts.push(stripped);

  // Truncate to reasonable size for in-memory search
  return parts.join(" ").slice(0, 5000).toLowerCase();
}

/** Compute content hash for change detection */
export function contentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}
