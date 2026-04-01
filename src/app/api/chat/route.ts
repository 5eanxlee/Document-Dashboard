import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getDoc, getAllDocs } from "@/lib/registry";
import fs from "node:fs";

export async function POST(req: Request) {
  const { messages, docId, docIds } = await req.json();

  // Support single docId or multiple docIds
  const ids: string[] = docIds || (docId ? [docId] : []);

  // Load document contents for context
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

  let systemPrompt: string;
  if (docContexts.length === 1) {
    systemPrompt = `You are a helpful assistant answering questions about a document titled "${docContexts[0].title}".

Here is the full document content:

---
${docContexts[0].content}
---

Answer questions about this document. Be concise and direct. If the user asks something that goes beyond the document, you can use web search to find additional context. When referencing the document, quote relevant sections.`;
  } else if (docContexts.length > 1) {
    const docsBlock = docContexts
      .map((d, i) => `=== Document ${i + 1}: ${d.title} ===\n${d.content}`)
      .join("\n\n");
    systemPrompt = `You are a helpful assistant answering questions about ${docContexts.length} documents.

Here are the documents:

${docsBlock}

Answer questions about these documents. Be concise and direct. When referencing a document, name it. If the user asks something that goes beyond the documents, you can use web search to find additional context.`;
  } else {
    systemPrompt = "You are a helpful assistant. Answer questions concisely.";
  }

  const result = streamText({
    model: openai("gpt-4o-search-preview"),
    system: systemPrompt,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
