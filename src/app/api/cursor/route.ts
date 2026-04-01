import { NextRequest, NextResponse } from "next/server";
import { getDoc } from "@/lib/registry";
import { openInCursor } from "@/lib/integrations/cursor";

export const dynamic = "force-dynamic";

/** POST /api/cursor — Open a document in Cursor */
export async function POST(request: NextRequest) {
  const { docId } = await request.json();
  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const doc = await getDoc(docId);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const result = openInCursor(doc.canonicalPath);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
