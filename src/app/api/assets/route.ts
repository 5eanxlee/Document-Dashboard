import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDoc } from "@/lib/registry";
import { isAssetPathSafe } from "@/lib/documents/security";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** GET /api/assets?docId=xxx&path=relative/path/to/asset */
export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");
  const assetPath = request.nextUrl.searchParams.get("path");

  if (!docId || !assetPath) {
    return NextResponse.json(
      { error: "Missing docId or path" },
      { status: 400 }
    );
  }

  const doc = await getDoc(docId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const docDir = path.dirname(doc.canonicalPath);

  // Security: validate the resolved path is within workspace root
  if (!isAssetPathSafe(assetPath, docDir, doc.workspaceRoot)) {
    return NextResponse.json(
      { error: "Access denied: path outside workspace" },
      { status: 403 }
    );
  }

  const resolvedPath = path.resolve(docDir, assetPath);

  try {
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const data = fs.readFileSync(resolvedPath);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
}
