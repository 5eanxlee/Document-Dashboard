#!/usr/bin/env npx tsx
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";

// Save the caller's working directory BEFORE changing to project root
const callerCwd = process.cwd();

// Set cwd to the project root so registry paths resolve correctly
const projectRoot = path.resolve(__dirname, "..");
process.chdir(projectRoot);

import { ensureDocdashDirs, upsertDoc, getAllDocs, updateDoc, getStore } from "../src/lib/registry";
import { indexFile, isSupportedFile, fileExists } from "../src/lib/documents/indexer";
import { findMovedFile } from "../src/lib/documents/repair";

const program = new Command();
program.name("docdash").description("DocDash CLI — manage your document registry").version("0.1.0");

program
  .command("add <file>")
  .description("Register a file in DocDash")
  .action(async (file: string) => {
    ensureDocdashDirs();
    const absolutePath = path.resolve(callerCwd, file);

    if (!fs.existsSync(absolutePath)) {
      console.error(`Error: File not found: ${absolutePath}`);
      process.exit(1);
    }

    if (!isSupportedFile(absolutePath)) {
      console.error(`Error: Unsupported file type. Supported: .md, .mdx, .txt`);
      process.exit(1);
    }

    // Check if already registered
    const existing = (await getAllDocs()).find((d) => d.canonicalPath === absolutePath);
    const entry = indexFile(absolutePath, existing?.id);
    const result = await upsertDoc(entry);
    const action = existing ? "Updated" : "Added";
    console.log(`${action}: ${result.title}`);
    console.log(`  ID: ${result.id}`);
    console.log(`  Path: ${result.canonicalPath}`);
    console.log(`  Type: ${result.type}`);
    console.log(`  Workspace: ${result.workspaceRoot}`);
  });

program
  .command("reindex")
  .description("Re-index a file or all registered files")
  .argument("[file]", "File to reindex, or omit for --all")
  .option("--all", "Reindex all registered files")
  .action(async (file: string | undefined, opts: { all?: boolean }) => {
    ensureDocdashDirs();
    const docs = await getAllDocs();

    if (file) {
      const absolutePath = path.resolve(callerCwd, file);
      const doc = docs.find((d) => d.canonicalPath === absolutePath);
      if (!doc) {
        console.error(`Error: File not registered: ${absolutePath}`);
        process.exit(1);
      }
      if (!fs.existsSync(absolutePath)) {
        console.error(`Error: File not found on disk: ${absolutePath}`);
        process.exit(1);
      }
      const entry = indexFile(absolutePath, doc.id);
      await upsertDoc(entry);
      console.log(`Reindexed: ${entry.title}`);
    } else if (opts.all) {
      let ok = 0;
      let missing = 0;
      let errors = 0;
      for (const doc of docs) {
        try {
          if (!fs.existsSync(doc.canonicalPath)) {
            await updateDoc(doc.id, { status: "missing" });
            missing++;
            continue;
          }
          const entry = indexFile(doc.canonicalPath, doc.id);
          await upsertDoc(entry);
          ok++;
        } catch (err) {
          console.error(`Error reindexing ${doc.canonicalPath}:`, err);
          await updateDoc(doc.id, { status: "parse_error" });
          errors++;
        }
      }
      console.log(`Reindexed: ${ok} ok, ${missing} missing, ${errors} errors`);
    } else {
      console.error("Specify a file or use --all");
      process.exit(1);
    }
  });

program
  .command("repair")
  .description("Attempt to repair missing file paths")
  .argument("[file]", "Specific doc ID to repair, or omit for --all")
  .option("--all", "Repair all missing files")
  .action(async (file: string | undefined, opts: { all?: boolean }) => {
    ensureDocdashDirs();
    const docs = await getAllDocs();
    const targets = file
      ? docs.filter((d) => d.id === file || d.canonicalPath === path.resolve(callerCwd, file))
      : opts.all
        ? docs.filter((d) => !fileExists(d))
        : [];

    if (targets.length === 0 && !file && !opts.all) {
      console.error("Specify a file/ID or use --all");
      process.exit(1);
    }

    let repaired = 0;
    let failed = 0;

    for (const doc of targets) {
      if (fileExists(doc)) {
        console.log(`  OK: ${doc.title} (file exists)`);
        continue;
      }
      console.log(`  Searching for moved file: ${doc.title}...`);
      const newPath = await findMovedFile(doc);
      if (newPath) {
        const entry = indexFile(newPath, doc.id);
        await upsertDoc(entry);
        console.log(`  Repaired: ${doc.title} → ${newPath}`);
        repaired++;
      } else {
        await updateDoc(doc.id, { status: "missing" });
        console.log(`  Missing: ${doc.title} (could not find)`);
        failed++;
      }
    }
    console.log(`\nRepair complete: ${repaired} repaired, ${failed} still missing`);
  });

program
  .command("doctor")
  .description("Check registry health and report issues")
  .action(async () => {
    ensureDocdashDirs();
    const docs = await getAllDocs();
    console.log(`DocDash Doctor — ${docs.length} registered documents\n`);

    let issues = 0;

    // Check for missing files
    const missing = docs.filter((d) => !fileExists(d));
    if (missing.length > 0) {
      console.log(`⚠ ${missing.length} files not found on disk:`);
      for (const d of missing) {
        console.log(`  - ${d.title}: ${d.canonicalPath}`);
      }
      issues += missing.length;
    }

    // Check for duplicate paths
    const pathCounts = new Map<string, number>();
    for (const d of docs) {
      pathCounts.set(d.canonicalPath, (pathCounts.get(d.canonicalPath) || 0) + 1);
    }
    const dupes = [...pathCounts.entries()].filter(([, count]) => count > 1);
    if (dupes.length > 0) {
      console.log(`⚠ ${dupes.length} duplicate paths:`);
      for (const [p, count] of dupes) {
        console.log(`  - ${p} (${count} entries)`);
      }
      issues += dupes.length;
    }

    // Check for parse errors
    const parseErrors = docs.filter((d) => d.status === "parse_error");
    if (parseErrors.length > 0) {
      console.log(`⚠ ${parseErrors.length} files with parse errors:`);
      for (const d of parseErrors) {
        console.log(`  - ${d.title}: ${d.canonicalPath}`);
      }
      issues += parseErrors.length;
    }

    // Summary stats
    const types = new Map<string, number>();
    const workspaces = new Set<string>();
    for (const d of docs) {
      types.set(d.type, (types.get(d.type) || 0) + 1);
      workspaces.add(d.workspaceRoot);
    }

    console.log(`\nStats:`);
    console.log(`  Types: ${[...types.entries()].map(([t, c]) => `${t}(${c})`).join(", ") || "none"}`);
    console.log(`  Workspaces: ${workspaces.size}`);
    console.log(`  Pinned: ${docs.filter((d) => d.pinned).length}`);
    console.log(`  Tags: ${[...new Set(docs.flatMap((d) => d.tags))].length}`);
    console.log(`  Collections: ${[...new Set(docs.flatMap((d) => d.collections))].length}`);

    if (issues === 0) {
      console.log(`\n✓ No issues found`);
    } else {
      console.log(`\n✗ ${issues} issue(s) found. Run 'docdash repair --all' to attempt fixes.`);
    }
  });

program
  .command("list")
  .description("List all registered documents")
  .action(async () => {
    const docs = await getAllDocs();
    if (docs.length === 0) {
      console.log("No documents registered. Use 'docdash add <file>' to add one.");
      return;
    }
    for (const d of docs) {
      const status = d.status !== "ok" ? ` [${d.status}]` : "";
      const pinned = d.pinned ? " ★" : "";
      console.log(`${d.id}  ${d.title}${pinned}${status}`);
      console.log(`        ${d.canonicalPath}`);
    }
  });

program.parse();
