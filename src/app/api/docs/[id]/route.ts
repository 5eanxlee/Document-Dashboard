import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getDoc, updateDoc } from "@/lib/registry";
import { contentHash, indexFile } from "@/lib/documents";

export const dynamic = "force-dynamic";

/** GET /api/docs/[id] — Get document with live file content */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Read live content from disk
  let content: string | null = null;
  let liveHash: string | null = null;
  let fileStatus: "ok" | "missing" | "changed" = "ok";

  try {
    content = fs.readFileSync(doc.canonicalPath, "utf-8");
    liveHash = contentHash(content);
    if (liveHash !== doc.contentHash) {
      fileStatus = "changed";
    }
  } catch {
    fileStatus = "missing";
    if (doc.status !== "missing") {
      await updateDoc(id, { status: "missing" });
    }
  }

  // Update lastOpenedAt
  await updateDoc(id, { lastOpenedAt: new Date().toISOString() });

  return NextResponse.json({
    doc,
    content,
    liveHash,
    fileStatus,
  });
}

/** PUT /api/docs/[id] — Save content back to file with conflict detection */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDoc(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content, expectedHash } = body as {
    content: string;
    expectedHash: string;
  };

  if (!content || !expectedHash) {
    return NextResponse.json(
      { error: "Missing content or expectedHash" },
      { status: 400 }
    );
  }

  // Conflict detection: check if file changed since the editor loaded it
  try {
    const currentContent = fs.readFileSync(doc.canonicalPath, "utf-8");
    const currentHash = contentHash(currentContent);

    if (currentHash !== expectedHash) {
      return NextResponse.json(
        {
          error: "Conflict detected",
          conflict: true,
          currentHash,
          currentContent,
        },
        { status: 409 }
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
    throw err;
  }

  // Atomic write: write to temp file then rename
  const tmpPath = doc.canonicalPath + ".docdash-tmp";
  try {
    fs.writeFileSync(tmpPath, content, "utf-8");
    fs.renameSync(tmpPath, doc.canonicalPath);
  } catch (err) {
    // Clean up temp file on error
    try { fs.unlinkSync(tmpPath); } catch {}
    return NextResponse.json(
      { error: `Write failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // Re-index the file after save
  const entry = indexFile(doc.canonicalPath, doc.id);
  const { upsertDoc } = await import("@/lib/registry");
  await upsertDoc(entry);

  return NextResponse.json({
    doc: entry,
    newHash: entry.contentHash,
  });
}

/** PATCH /api/docs/[id] — Update metadata (tags, collections, pinned, etc.) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific metadata fields
  const allowedFields = ["tags", "collections", "pinned"] as const;
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const updated = await updateDoc(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ doc: updated });
}

/** DELETE /api/docs/[id] — Remove document from registry */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { deleteDoc } = await import("@/lib/registry");
  const deleted = await deleteDoc(id);
  if (!deleted) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
