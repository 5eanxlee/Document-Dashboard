import { NextRequest, NextResponse } from "next/server";
import { getAllDocs, ensureDocdashDirs } from "@/lib/registry";
import { searchDocs, filterDocs, type FilterOptions } from "@/lib/search";
import {
  fileExists,
  hasFileChanged,
  indexFile,
  createLocalDocFile,
  type NewLocalDocExtension,
} from "@/lib/documents";
import { upsertDoc, updateDoc } from "@/lib/registry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  ensureDocdashDirs();
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const collection = searchParams.get("collection") || undefined;
  const workspaceRoot = searchParams.get("workspace") || undefined;
  const status = searchParams.get("status") || undefined;
  const pinnedOnly = searchParams.get("pinned") === "true" ? true : undefined;

  let docs = await getAllDocs();

  // Check file status for each doc and auto-refresh if changed
  for (const doc of docs) {
    if (!fileExists(doc)) {
      if (doc.status !== "missing") {
        await updateDoc(doc.id, { status: "missing" });
        doc.status = "missing";
      }
    } else if (doc.status === "missing") {
      // File reappeared
      try {
        const entry = indexFile(doc.canonicalPath, doc.id);
        await upsertDoc(entry);
        Object.assign(doc, entry);
      } catch {}
    } else if (hasFileChanged(doc)) {
      try {
        const entry = indexFile(doc.canonicalPath, doc.id);
        await upsertDoc(entry);
        Object.assign(doc, entry);
      } catch {}
    }
  }

  // Apply filters
  const filters: FilterOptions = { type, tag, collection, workspaceRoot, status, pinned: pinnedOnly };
  docs = filterDocs(docs, filters);

  // Apply search
  if (query) {
    docs = searchDocs(docs, query);
  }

  // Sort by registration time (most recently added first)
  docs.sort((a, b) => new Date(b.lastIndexedAt).getTime() - new Date(a.lastIndexedAt).getTime());

  return NextResponse.json({ docs });
}

/** POST /api/docs — Create a new file on disk and register it with DocDash */
export async function POST(request: NextRequest) {
  ensureDocdashDirs();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const titleRaw = typeof raw.title === "string" ? raw.title.trim() : "";
  const displayTitle = titleRaw.slice(0, 200) || "Untitled";

  const extIn = raw.extension;
  const extension: NewLocalDocExtension =
    extIn === "mdx" || extIn === "txt" ? extIn : "md";

  const relativeDir =
    typeof raw.relativeDir === "string" ? raw.relativeDir : undefined;

  let absolutePath: string;
  try {
    absolutePath = createLocalDocFile({
      displayTitle,
      extension,
      relativeDir,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json(
      { error: message === "Invalid directory" ? "Invalid directory" : "Could not create file" },
      { status: 400 }
    );
  }

  const entry = indexFile(absolutePath);
  const stored = await upsertDoc(entry);
  return NextResponse.json({ doc: stored });
}
