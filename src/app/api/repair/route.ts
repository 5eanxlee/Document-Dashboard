import { NextRequest, NextResponse } from "next/server";
import { getDoc, updateDoc, upsertDoc } from "@/lib/registry";
import { findMovedFile, indexFile, fileExists } from "@/lib/documents";

export const dynamic = "force-dynamic";

/** POST /api/repair — Attempt to repair a missing document */
export async function POST(request: NextRequest) {
  const { docId } = await request.json();
  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const doc = await getDoc(docId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (fileExists(doc)) {
    return NextResponse.json({ status: "ok", message: "File exists" });
  }

  const newPath = await findMovedFile(doc);
  if (newPath) {
    const entry = indexFile(newPath, doc.id);
    await upsertDoc(entry);
    return NextResponse.json({
      status: "repaired",
      oldPath: doc.canonicalPath,
      newPath,
      doc: entry,
    });
  }

  await updateDoc(doc.id, { status: "missing" });
  return NextResponse.json({
    status: "missing",
    message: "Could not find moved file",
  });
}
