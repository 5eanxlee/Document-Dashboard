/** Client-side document type matching the API response */
export interface Doc {
  id: string;
  canonicalPath: string;
  workspaceRoot: string;
  title: string;
  type: "md" | "txt" | "mdx";
  tags: string[];
  collections: string[];
  pinned: boolean;
  mtimeMs: number;
  contentHash: string;
  lastIndexedAt: string;
  lastOpenedAt: string | null;
  excerpt: string;
  searchText: string;
  frontmatter: Record<string, unknown>;
  status: "ok" | "missing" | "parse_error" | "conflict";
}

export interface DocDetailResponse {
  doc: Doc;
  content: string | null;
  liveHash: string | null;
  fileStatus: "ok" | "missing" | "changed";
}

export interface SaveResponse {
  doc?: Doc;
  newHash?: string;
  error?: string;
  conflict?: boolean;
  currentHash?: string;
  currentContent?: string;
}
