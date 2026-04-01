import { listThreads, listThreadsForDoc, saveThread, deleteThread, getThread } from "@/lib/chat/storage";
import type { ChatThread } from "@/lib/chat/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  const threads = docId ? listThreadsForDoc(docId) : listThreads();
  // Return summaries (without full messages) for listing
  const summaries = threads.map(({ messages, ...rest }) => ({
    ...rest,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.slice(0, 100) || "",
  }));
  return Response.json({ threads: summaries });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (body.action === "delete" && body.threadId) {
    deleteThread(body.threadId);
    return Response.json({ ok: true });
  }

  if (body.action === "load" && body.threadId) {
    const thread = getThread(body.threadId);
    if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });
    return Response.json({ thread });
  }

  // Save thread
  const thread: ChatThread = body.thread;
  if (!thread?.id) {
    return Response.json({ error: "Missing thread data" }, { status: 400 });
  }
  thread.updatedAt = new Date().toISOString();
  saveThread(thread);
  return Response.json({ ok: true });
}
