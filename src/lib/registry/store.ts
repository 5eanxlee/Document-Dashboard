import fs from "node:fs";
import path from "node:path";
import { Registry, DocEntry, emptyRegistry } from "./schema";
import { registryPath, docdashDir, backupsDir } from "./paths";
import { acquireLock } from "./lock";

/** Storage interface — swap this out for SQLite later */
export interface RegistryStore {
  load(): Promise<Registry>;
  save(registry: Registry): Promise<void>;
  withLock<T>(fn: (registry: Registry) => Promise<{ registry: Registry; result: T }>): Promise<T>;
}

export class FileRegistryStore implements RegistryStore {
  async load(): Promise<Registry> {
    const rp = registryPath();
    try {
      const raw = fs.readFileSync(rp, "utf-8");
      const parsed = JSON.parse(raw);
      return Registry.parse(parsed);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return emptyRegistry();
      }
      // If corrupt, back up and return empty
      console.error("Registry corrupted, resetting:", err);
      try {
        const bdir = backupsDir();
        fs.mkdirSync(bdir, { recursive: true });
        fs.copyFileSync(rp, path.join(bdir, `registry-${Date.now()}.json.bak`));
      } catch {}
      return emptyRegistry();
    }
  }

  async save(registry: Registry): Promise<void> {
    const rp = registryPath();
    fs.mkdirSync(path.dirname(rp), { recursive: true });
    const tmp = rp + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), "utf-8");
    fs.renameSync(tmp, rp);
  }

  async withLock<T>(
    fn: (registry: Registry) => Promise<{ registry: Registry; result: T }>
  ): Promise<T> {
    const release = await acquireLock();
    try {
      const registry = await this.load();
      const { registry: updated, result } = await fn(registry);
      await this.save(updated);
      return result;
    } finally {
      release();
    }
  }
}

// Singleton store
let _store: RegistryStore | undefined;
export function getStore(): RegistryStore {
  if (!_store) _store = new FileRegistryStore();
  return _store;
}

/** Convenience: upsert a doc entry by canonical path */
export async function upsertDoc(entry: DocEntry): Promise<DocEntry> {
  const store = getStore();
  return store.withLock(async (registry) => {
    const idx = registry.docs.findIndex(
      (d) => d.canonicalPath === entry.canonicalPath
    );
    if (idx >= 0) {
      // Merge: preserve id, pinned, collections, tags, lastOpenedAt from existing
      const existing = registry.docs[idx];
      const merged: DocEntry = {
        ...entry,
        id: existing.id,
        pinned: existing.pinned,
        tags: entry.tags.length > 0 ? entry.tags : existing.tags,
        collections: entry.collections.length > 0 ? entry.collections : existing.collections,
        lastOpenedAt: existing.lastOpenedAt,
      };
      registry.docs[idx] = merged;
      return { registry, result: merged };
    } else {
      registry.docs.push(entry);
      return { registry, result: entry };
    }
  });
}

/** Get a doc by ID */
export async function getDoc(id: string): Promise<DocEntry | null> {
  const store = getStore();
  const registry = await store.load();
  return registry.docs.find((d) => d.id === id) ?? null;
}

/** Get all docs */
export async function getAllDocs(): Promise<DocEntry[]> {
  const store = getStore();
  const registry = await store.load();
  return registry.docs;
}

/** Update a doc by ID (partial update) */
export async function updateDoc(
  id: string,
  updates: Partial<DocEntry>
): Promise<DocEntry | null> {
  const store = getStore();
  return store.withLock(async (registry) => {
    const idx = registry.docs.findIndex((d) => d.id === id);
    if (idx < 0) return { registry, result: null };
    registry.docs[idx] = { ...registry.docs[idx], ...updates };
    return { registry, result: registry.docs[idx] };
  });
}

/** Delete a doc by ID */
export async function deleteDoc(id: string): Promise<boolean> {
  const store = getStore();
  return store.withLock(async (registry) => {
    const before = registry.docs.length;
    registry.docs = registry.docs.filter((d) => d.id !== id);
    return { registry, result: registry.docs.length < before };
  });
}

/** Ensure .docdash directory structure exists */
export function ensureDocdashDirs(): void {
  fs.mkdirSync(docdashDir(), { recursive: true });
  fs.mkdirSync(backupsDir(), { recursive: true });
  fs.mkdirSync(path.join(docdashDir(), "locks"), { recursive: true });
}
