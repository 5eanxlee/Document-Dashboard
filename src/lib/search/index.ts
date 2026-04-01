import { DocEntry } from "@/lib/registry/schema";

/**
 * Simple in-memory search across document entries.
 * Searches title, excerpt, searchText, tags, and collections.
 * Good enough for <=100 docs.
 */
export function searchDocs(docs: DocEntry[], query: string): DocEntry[] {
  if (!query.trim()) return docs;

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return docs
    .map((doc) => {
      const searchable = [
        doc.title.toLowerCase(),
        doc.excerpt.toLowerCase(),
        doc.searchText,
        ...doc.tags.map((t) => t.toLowerCase()),
        ...doc.collections.map((c) => c.toLowerCase()),
      ].join(" ");

      // Score: how many terms match
      let score = 0;
      for (const term of terms) {
        if (searchable.includes(term)) {
          score++;
          // Boost for title match
          if (doc.title.toLowerCase().includes(term)) score += 2;
          // Boost for tag match
          if (doc.tags.some((t) => t.toLowerCase().includes(term))) score += 1;
        }
      }

      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc);
}

export interface FilterOptions {
  type?: string;
  tag?: string;
  collection?: string;
  workspaceRoot?: string;
  status?: string;
  pinned?: boolean;
}

export function filterDocs(docs: DocEntry[], filters: FilterOptions): DocEntry[] {
  return docs.filter((doc) => {
    if (filters.type && doc.type !== filters.type) return false;
    if (filters.tag && !doc.tags.includes(filters.tag)) return false;
    if (filters.collection && !doc.collections.includes(filters.collection))
      return false;
    if (filters.workspaceRoot && doc.workspaceRoot !== filters.workspaceRoot)
      return false;
    if (filters.status && doc.status !== filters.status) return false;
    if (filters.pinned !== undefined && doc.pinned !== filters.pinned)
      return false;
    return true;
  });
}
