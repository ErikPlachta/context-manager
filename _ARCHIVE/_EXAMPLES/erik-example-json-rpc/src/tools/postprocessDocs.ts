/**
 * @packageDocumentation Normalize generated markdown files.
 *
 * Ensures all files end with a trailing newline and use LF (\n) line endings.
 * This should be run after `typedoc` completes.
 */

import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import fg from "fast-glob";

/**
 * Ensure a markdown file uses LF line endings and has a trailing newline.
 *
 * @param {string} file - Absolute path to markdown file.
 * @returns {Promise<boolean>} True when file content was modified.
 */
async function ensureTrailingNewlineAndLF(file: string): Promise<boolean> {
  const original: string = await readFile(file, "utf8");
  // Normalize CRLF -> LF
  let content: string = original.replace(/\r\n/g, "\n");
  // Ensure single trailing newline
  if (!content.endsWith("\n")) {
    content += "\n";
  }
  if (content !== original) {
    await writeFile(file, content, "utf8");
    return true;
  }
  return false;
}

/**
 * Scan generated docs directory and normalize all markdown artifacts.
 *
 * @returns {Promise<void>} Resolves on completion; sets process exit code on failure.
 */
async function run(): Promise<void> {
  const root: string = process.cwd();
  const docsDir: string = path.resolve(root, "docs");
  const files: string[] = await fg(["**/*.md"], {
    cwd: docsDir,
    absolute: true,
  });
  let changed = 0;
  for (const file of files) {
    const didChange: boolean = await ensureTrailingNewlineAndLF(file);
    if (didChange) changed += 1;
  }
  console.log(
    `[docs:fix] Processed ${files.length} files; changed ${changed}.`
  );
}

void run().catch((err: unknown) => {
  console.error("[docs:fix] Failed while normalizing markdown files.", err);
  process.exitCode = 1;
});
