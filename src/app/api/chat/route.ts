import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { getDoc } from "@/lib/registry";
import fs from "node:fs";

// ~4 chars per token; gpt-5.4 has a large context window so allow up to ~1M tokens.
const MAX_DOC_CHARS = 4_000_000;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n\n[Document truncated — showing first " + Math.round(limit / 1000) + "k characters]";
}

export async function POST(req: Request) {
  const { messages, docId, docIds } = await req.json();

  const ids: string[] = docIds || (docId ? [docId] : []);

  const docContexts: { title: string; content: string }[] = [];
  for (const id of ids) {
    const doc = await getDoc(id);
    if (!doc) continue;
    try {
      const content = fs.readFileSync(doc.canonicalPath, "utf-8");
      docContexts.push({ title: doc.title, content });
    } catch {
      docContexts.push({ title: doc.title, content: `[File not readable at ${doc.canonicalPath}]` });
    }
  }

  // Divide character budget evenly across documents
  const perDocLimit = Math.floor(MAX_DOC_CHARS / Math.max(docContexts.length, 1));

  let systemPrompt: string;
  if (docContexts.length === 1) {
    const body = truncate(docContexts[0].content, perDocLimit);
    systemPrompt = `You are a helpful assistant answering questions about a document titled "${docContexts[0].title}".

Here is the document content:

---
${body}
---

Answer questions about this document. Be concise and direct. When referencing the document, quote relevant sections.`;
  } else if (docContexts.length > 1) {
    const docsBlock = docContexts
      .map((d, i) => `=== Document ${i + 1}: ${d.title} ===\n${truncate(d.content, perDocLimit)}`)
      .join("\n\n");
    systemPrompt = `You are a helpful assistant answering questions about ${docContexts.length} documents.

Here are the documents:

${docsBlock}

Answer questions about these documents. Be concise and direct. When referencing a document, name it.`;
  } else {
    systemPrompt = "You are a helpful assistant. Answer questions concisely.";
  }

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-5.4"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
