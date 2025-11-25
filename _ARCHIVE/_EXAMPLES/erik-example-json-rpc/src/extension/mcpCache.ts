/**
 * @packageDocumentation Utilities for managing the local cache directory.
 *
 * Module for working with on-disk cache artifacts shared across tools and agents.
 * The cache directory name is derived via {@link getCacheDirectoryName} and
 * defaults to a hidden, dot-prefixed folder (e.g., `.usercontext-mcp-extension`).
 */

import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { getCacheDirectoryName, getExtensionName } from "@shared/env";

/** Name of the subdirectory that stores cross-tool shared cache entries. */
const SHARED_CACHE_DIR = "shared";

/**
 * Resolve global VS Code extension storage root (minimal approximation for now).
 *
 * @returns {string} Absolute path to the global extensions root directory.
 */
function getGlobalExtensionsRoot(): string {
  // VS Code does not expose an API for the extensions install folder; approximate using user home.
  // On Windows we align with %USERPROFILE%/.vscode/extensions; on other platforms use ~/.vscode/extensions.
  return path.join(os.homedir(), ".vscode", "extensions");
}

/**
 * Minimal representation of a cached artifact that can be exchanged across tools.
 *
 * @template T - Payload type stored in the cache entry.
 */
export interface SharedCacheEntry<T = unknown> {
  /** Uniquely identifies the record on disk. */
  key: string;
  /** Name of the tool that produced the cached payload. */
  toolName: string;
  /** Timestamp recorded when the value was persisted. */
  timestamp: string;
  /** Arbitrary payload produced by the tool. */
  value: T;
  /** Optional metadata hints for downstream orchestration. */
  metadata?: Record<string, unknown>;
}

/** Structure for log entries persisted inside `.mcp-cache`. */
export interface ToolLogEntry {
  /** ISO timestamp when the invocation took place. */
  timestamp: string;
  /** Tool identifier that generated the log entry. */
  toolName: string;
  /** Arguments sent to the MCP server. */
  args: Record<string, unknown>;
  /** High-level conversation context that accompanied the request. */
  context: string[];
  /** Raw payload returned by the server, if any. */
  response?: unknown;
  /** Human-readable error message when an invocation fails. */
  error?: string;
}

/**
 * Ensure the workspace has a `.mcp-cache` directory and return its path.
 *
 * @returns {Promise<string>} - Absolute path to the cache directory.
 */
export async function ensureCacheDirectory(): Promise<string> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const newCacheFolderName = getCacheDirectoryName(); // hidden name (e.g., .usercontext-mcp-extension)
  const oldCacheFolderName = getExtensionName(); // legacy (no leading dot)

  const localBase = workspaceRoot ?? os.homedir();
  const localCache = path.join(localBase, newCacheFolderName);
  const localOldCache = path.join(localBase, oldCacheFolderName);

  // Migrate local cache if needed (best-effort; do not throw)
  try {
    await migrateDirectory(localOldCache, localCache);
  } catch {
    // ignore migration errors; continue with fresh directory
  }
  await fs.mkdir(localCache, { recursive: true });

  // Also ensure global cache exists for cross-workspace sharing.
  const globalRoot = getGlobalExtensionsRoot();
  const globalCache = path.join(globalRoot, newCacheFolderName);
  const globalOldCache = path.join(globalRoot, oldCacheFolderName);

  // Migrate global cache if needed (best-effort; do not throw)
  try {
    await migrateDirectory(globalOldCache, globalCache);
  } catch {
    // ignore migration errors
  }
  await fs.mkdir(globalCache, { recursive: true });

  return localCache;
}

/**
 * Safely migrate a directory from an old path to a new path.
 * - If old doesn't exist: no-op
 * - If new doesn't exist: attempt rename; fallback to copy then remove
 * - If both exist: merge content from old → new without overwriting existing files; then remove old if empty
 */
async function migrateDirectory(
  oldPath: string,
  newPath: string
): Promise<void> {
  if (oldPath === newPath) return;
  const oldExists = await pathExists(oldPath);
  if (!oldExists) return;

  const newExists = await pathExists(newPath);
  if (!newExists) {
    try {
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
      return;
    } catch {
      // Fall back to copy when rename across devices or locked
      await copyDir(oldPath, newPath, { overwrite: false });
      await removeIfEmpty(oldPath);
      return;
    }
  }

  // Both exist: merge without overwriting
  await copyDir(oldPath, newPath, { overwrite: false });
  await removeIfEmpty(oldPath);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
}

async function copyDir(
  src: string,
  dest: string,
  opts: { overwrite: boolean }
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, opts);
    } else if (entry.isFile()) {
      const exists = await pathExists(destPath);
      if (!exists || opts.overwrite) {
        await fs.copyFile(srcPath, destPath);
      }
    }
    // symlinks and others are ignored for safety
  }
}

async function removeIfEmpty(dirPath: string): Promise<void> {
  try {
    const items = await fs.readdir(dirPath);
    if (items.length === 0) {
      await fs.rmdir(dirPath);
    }
  } catch (e) {
    // If directory doesn't exist or not empty, ignore; migration is best-effort
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
  }
}

/**
 * Append an invocation log entry to `.mcp-cache/invocations.jsonl`.
 *
 * @param {string} cacheDir - Absolute path returned by {@link ensureCacheDirectory}.
 * @param {ToolLogEntry} entry - Log payload to append as a JSON line.
 * @returns {Promise<void>} Resolves when the entry is written.
 */
export async function logInvocation(
  cacheDir: string,
  entry: ToolLogEntry
): Promise<void> {
  const target = path.join(cacheDir, "invocations.jsonl");
  const serialised = `${JSON.stringify(entry)}\n`;
  await fs.appendFile(target, serialised, "utf8");
}

/**
 * Persist a shared cache entry that can be re-used by other MCP tools.
 *
 * @template T - Payload type of the value being stored.
 * @param {string} cacheDir - Absolute path returned by {@link ensureCacheDirectory}.
 * @param {SharedCacheEntry} entry - Entry envelope to write.
 * @returns {Promise<void>} Resolves when the entry is written.
 */
export async function storeSharedCacheEntry<T>(
  cacheDir: string,
  entry: SharedCacheEntry<T>
): Promise<void> {
  const sharedDir = path.join(cacheDir, SHARED_CACHE_DIR);
  await fs.mkdir(sharedDir, { recursive: true });
  const fileName = `${sanitizeKey(entry.key)}.json`;
  const target = path.join(sharedDir, fileName);
  await fs.writeFile(target, JSON.stringify(entry, null, 2), "utf8");
}

/**
 * Retrieve a shared cache entry by key.
 *
 * @template T - Payload type previously stored with {@link storeSharedCacheEntry}.
 * @param {string} cacheDir - Absolute path returned by {@link ensureCacheDirectory}.
 * @param {string} key - Unique key identifying the entry.
 * @returns {Promise<SharedCacheEntry | undefined>} The entry if present, otherwise undefined.
 * @throws {Error} Propagates filesystem errors other than missing file.
 */
export async function readSharedCacheEntry<T = unknown>(
  cacheDir: string,
  key: string
): Promise<SharedCacheEntry<T> | undefined> {
  const sharedDir = path.join(cacheDir, SHARED_CACHE_DIR);
  const fileName = `${sanitizeKey(key)}.json`;
  const target = path.join(sharedDir, fileName);
  try {
    const raw = await fs.readFile(target, "utf8");
    return JSON.parse(raw) as SharedCacheEntry<T>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/**
 * Enumerate all cached artifacts currently stored on disk.
 *
 * @template T - Payload type associated with entries.
 * @param {string} cacheDir - Absolute path returned by {@link ensureCacheDirectory}.
 * @returns {Promise<SharedCacheEntry[]>} Parsed entries found in the shared cache folder.
 * @throws {Error} Propagates filesystem errors other than missing directory.
 */
export async function listSharedCacheEntries<T = unknown>(
  cacheDir: string
): Promise<SharedCacheEntry<T>[]> {
  const sharedDir = path.join(cacheDir, SHARED_CACHE_DIR);
  try {
    const files = await fs.readdir(sharedDir);
    const entries: SharedCacheEntry<T>[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const raw = await fs.readFile(path.join(sharedDir, file), "utf8");
      entries.push(JSON.parse(raw) as SharedCacheEntry<T>);
    }
    return entries;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Remove a shared cache entry when it is no longer relevant.
 *
 * @param {string} cacheDir - Absolute path returned by {@link ensureCacheDirectory}.
 * @param {string} key - Unique key identifying the entry.
 * @returns {Promise<void>} Resolves whether or not the file existed.
 * @throws {Error} Propagates filesystem errors other than missing file.
 */
export async function deleteSharedCacheEntry(
  cacheDir: string,
  key: string
): Promise<void> {
  const sharedDir = path.join(cacheDir, SHARED_CACHE_DIR);
  const fileName = `${sanitizeKey(key)}.json`;
  const target = path.join(sharedDir, fileName);
  try {
    await fs.unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/**
 * Normalize a cache key so it is safe for use as a file name.
 *
 * @param {string} key - Arbitrary key name to normalize.
 * @returns {string} Normalized file-name-safe key.
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^a-z0-9-_]+/gi, "_");
}
