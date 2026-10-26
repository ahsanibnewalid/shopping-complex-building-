#!/usr/bin/env node
/**
 * Safely restores files missing from the repository root from the Kimi Agent
 * project archive. Existing files are never overwritten, preserving newer
 * payment/security work already merged into main.
 *
 * Triggered from GitHub Actions or run locally; preserves existing files.
 * Usage: node scripts/restore-missing-baseline.mjs "/path/to/Kimi_Agent_Complete Shopping Complex SaaS.zip"
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const archive = process.argv[2];
if (!archive) {
  console.error("Usage: node scripts/restore-missing-baseline.mjs <archive.zip>");
  process.exit(2);
}
if (!existsSync(archive)) {
  console.error(`Archive not found: ${archive}`);
  process.exit(2);
}

const root = process.cwd();
const entries = execFileSync("unzip", ["-Z1", archive], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
}).split(/\r?\n/).filter(Boolean);

let restored = 0;
let skipped = 0;
const failures = [];

for (const entry of entries) {
  if (!entry.startsWith("app/") || entry.endsWith("/")) continue;

  // Only allow normal relative paths within the expected app/ archive root.
  const relative = entry.slice("app/".length);
  if (!relative || path.posix.isAbsolute(relative) ||
      relative.split("/").some((part) => part === ".." || part === ".")) {
    failures.push(`Rejected unsafe archive path: ${entry}`);
    continue;
  }

  const destination = path.resolve(root, relative);
  if (destination !== root && !destination.startsWith(root + path.sep)) {
    failures.push(`Rejected path outside repository: ${entry}`);
    continue;
  }

  // Deliberately do not replace files already in the repository.
  if (existsSync(destination)) {
    skipped++;
    continue;
  }

  try {
    const content = execFileSync("unzip", ["-p", archive, entry], {
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    });
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content, { flag: "wx" });
    restored++;
    console.log(`RESTORED ${relative}`);
  } catch (error) {
    failures.push(`Failed ${relative}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\nRestored: ${restored}; skipped existing files: ${skipped}; errors: ${failures.length}`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
}
