/**
 * @packageDocumentation Replace relative imports with path aliases.
 *
 * Walks TypeScript files and rewrites import/export specifiers that begin with
 * './' or '../' to the appropriate tsconfig path alias (e.g., `@agent/*`).
 */

import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import fg from "fast-glob";

interface AliasMapEntry {
  alias: string; // e.g. "@agent"
  absRoot: string; // absolute path to mapped folder, e.g. /repo/src/agent
}

const ALIASES: AliasMapEntry[] = [
  { alias: "@agent", absRoot: path.resolve(process.cwd(), "src/agent") },
  {
    alias: "@extension",
    absRoot: path.resolve(process.cwd(), "src/extension"),
  },
  { alias: "@mcp", absRoot: path.resolve(process.cwd(), "src/mcp") },
  { alias: "@server", absRoot: path.resolve(process.cwd(), "src/server") },
  { alias: "@shared", absRoot: path.resolve(process.cwd(), "src/shared") },
  { alias: "@tools", absRoot: path.resolve(process.cwd(), "src/tools") },
  {
    alias: "@internal-types",
    absRoot: path.resolve(process.cwd(), "src/types"),
  },
  { alias: "@bin", absRoot: path.resolve(process.cwd(), "bin") },
];

/**
 * Normalize a path string to POSIX separators for consistent matching.
 *
 * @param {string} p - Original path value (may contain Windows separators).
 * @returns {string} Path using forward slashes.
 */
function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Resolve a relative module specifier to an alias-based import path.
 *
 * @param {string} srcFile - Absolute path to the source file containing the import.
 * @param {string} spec - Original import specifier (must start with './' or '../').
 * @returns {string | null} Alias path (e.g., `@shared/foo`) or null if no alias root matches.
 */
function resolveToAlias(srcFile: string, spec: string): string | null {
  if (!spec.startsWith("./") && !spec.startsWith("../")) return null;
  const srcDir = path.dirname(srcFile);
  const targetAbs = path.resolve(srcDir, spec);
  const targetPosix = toPosix(targetAbs);

  for (const entry of ALIASES) {
    const rootPosix = toPosix(entry.absRoot) + "/";
    if (targetPosix.startsWith(rootPosix)) {
      let rel = targetPosix.slice(rootPosix.length);
      rel = rel.replace(/\.(ts|js)$/, ""); // strip extension
      rel = rel.replace(/\/index$/, ""); // collapse index
      return `${entry.alias}/${rel}`;
    }
  }
  return null;
}

/**
 * Rewrite import/export and require specifiers inside a file's content.
 *
 * @param {string} filePath - Absolute path of the file being processed.
 * @param {string} content - Original file text.
 * @returns {string} Updated file text with alias-based specifiers.
 */
function rewriteImports(filePath: string, content: string): string {
  const importExportRegex =
    /(^\s*(?:import|export)\s[^'"`]*?from\s*['"])([^'"`]+)(['"];?)/gm;
  const requireRegex =
    /(^\s*const\s+\w+\s*=\s*require\(\s*['"])([^'"`]+)(['"]\s*\)\s*;?)/gm;

  /**
   * Regex replacement handler to map a module specifier to an alias.
   *
   * @param {string} full - Full matched string (unused).
   * @param {string} p1 - Prefix including leading tokens and opening quote.
   * @param {string} spec - The module specifier.
   * @param {string} p3 - Suffix including closing quote and optional semicolon.
   * @returns {string} Updated import/export string with alias path when applicable.
   */
  const replacer = (
    full: string,
    p1: string,
    spec: string,
    p3: string
  ): string => {
    const next = resolveToAlias(filePath, spec);
    if (next) return `${p1}${next}${p3}`;
    return full;
  };

  let updated = content.replace(importExportRegex, replacer);
  updated = updated.replace(requireRegex, replacer);
  return updated;
}

/**
 * Process a single file, rewriting import specifiers as needed.
 *
 * @param {string} file - Absolute path to TypeScript file.
 * @returns {Promise<boolean>} True if file contents changed.
 */
async function processFile(file: string): Promise<boolean> {
  const original = await readFile(file, "utf8");
  const updated = rewriteImports(file, original);
  if (updated !== original) {
    await writeFile(file, updated, "utf8");
    return true;
  }
  return false;
}

/**
 * Locate all candidate TypeScript files and rewrite their relative imports.
 *
 * @returns {Promise<void>} Resolves when processing completes; sets exit code on failure.
 */
async function run(): Promise<void> {
  const files = await fg(["src/**/*.ts", "bin/**/*.ts"], {
    cwd: process.cwd(),
    absolute: true,
    ignore: ["**/out/**", "**/*.old.ts"],
  });
  let changed = 0;
  for (const file of files) {
    const did = await processFile(file);
    if (did) changed += 1;
  }
  console.log(
    `[fix:imports] Processed ${files.length} files; changed ${changed}.`
  );
}

void run().catch((err: unknown) => {
  console.error("[fix:imports] Failed while converting imports.", err);
  process.exitCode = 1;
});
