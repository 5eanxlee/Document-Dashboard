import path from "node:path";

/** Root of the app repository */
export function appRoot(): string {
  // Walk up from this file to find the repo root (where package.json lives)
  // In Next.js, process.cwd() is the project root
  return process.cwd();
}

export function docdashDir(): string {
  return path.join(appRoot(), ".docdash");
}

export function registryPath(): string {
  return path.join(docdashDir(), "registry.json");
}

export function lockPath(): string {
  return path.join(docdashDir(), "locks", "registry.lock");
}

export function backupsDir(): string {
  return path.join(docdashDir(), "backups");
}

export function chatsDir(): string {
  return path.join(docdashDir(), "chats");
}
