/**
 * @packageDocumentation
 * Shared filesystem and text-processing helpers for repo-ops-next.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface ReadFileSafeResult {
  ok: boolean;
  content?: string;
  error?: string;
}

/**
 * Read a file relative to the given cwd, returning a structured result instead
 * of throwing. This is intentionally minimal; mutating helpers will be added
 * later.
 */
export function readFileSafe(
  cwd: string,
  relativePath: string
): ReadFileSafeResult {
  const fullPath = path.join(cwd, relativePath);
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    return { ok: true, content };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export interface WriteWithBackupOptions {
  cwd: string;
  relativePath: string;
  content: string;
  backupsDir?: string;
}

export interface WriteWithBackupResult {
  ok: boolean;
  writtenPath?: string;
  backupPath?: string;
  error?: string;
}

/**
 * Write a file relative to the given cwd, creating a timestamped backup of
 * any existing file first. This helper is intended for logs-only flows like
 * changelog and TODO updates.
 */
export function writeWithBackup(
  options: WriteWithBackupOptions
): WriteWithBackupResult {
  const {
    cwd,
    relativePath,
    content,
    backupsDir = ".repo-ops-backups",
  } = options;
  const fullPath = path.join(cwd, relativePath);
  const backupsRoot = path.join(cwd, backupsDir);

  try {
    if (fs.existsSync(fullPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupDir = path.join(backupsRoot, "changelog-backup");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const backupFileName = `${path.basename(relativePath)}.${timestamp}.bak`;
      const backupPath = path.join(backupDir, backupFileName);
      fs.copyFileSync(fullPath, backupPath);
      fs.writeFileSync(fullPath, content, "utf8");
      return { ok: true, writtenPath: fullPath, backupPath };
    }

    if (!fs.existsSync(backupsRoot)) {
      fs.mkdirSync(backupsRoot, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf8");
    return { ok: true, writtenPath: fullPath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Normalize line endings and trim trailing whitespace from each line in the
 * provided text. This is a minimal text-processing helper that can be used
 * when building lists or preparing content for writes.
 */
export function normalizeTextLines(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n");
}
