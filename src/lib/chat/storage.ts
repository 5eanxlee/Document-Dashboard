import fs from "node:fs";
import path from "node:path";
import { chatsDir } from "@/lib/registry/paths";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  docIds: string[];
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

function ensureChatsDir() {
  const dir = chatsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function threadPath(threadId: string): string {
  return path.join(chatsDir(), `${threadId}.json`);
}

export function getThread(threadId: string): ChatThread | null {
  try {
    const raw = fs.readFileSync(threadPath(threadId), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveThread(thread: ChatThread): void {
  ensureChatsDir();
  const tmp = threadPath(thread.id) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(thread, null, 2));
  fs.renameSync(tmp, threadPath(thread.id));
}

export function deleteThread(threadId: string): void {
  try {
    fs.unlinkSync(threadPath(threadId));
  } catch {
    // already gone
  }
}

export function listThreads(): ChatThread[] {
  const dir = chatsDir();
  try {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    return files
      .map((f) => {
        try {
          const raw = fs.readFileSync(path.join(dir, f), "utf-8");
          return JSON.parse(raw) as ChatThread;
        } catch {
          return null;
        }
      })
      .filter((t): t is ChatThread => t !== null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function listThreadsForDoc(docId: string): ChatThread[] {
  return listThreads().filter((t) => t.docIds.includes(docId));
}
