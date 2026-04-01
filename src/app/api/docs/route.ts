import { NextRequest, NextResponse } from "next/server";
import { getAllDocs, ensureDocdashDirs } from "@/lib/registry";
import { searchDocs, filterDocs, type FilterOptions } from "@/lib/search";
import { fileExists, hasFileChanged, indexFile } from "@/lib/documents";
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

  return NextResponse.json({ docs });
}
