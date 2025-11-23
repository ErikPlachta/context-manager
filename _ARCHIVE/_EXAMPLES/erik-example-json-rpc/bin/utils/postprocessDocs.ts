/**
 * @packageDocumentation Normalize generated markdown files.
 *
 * Ensures all files end with a trailing newline and use LF (\n) line endings.
 * This should be run after `typedoc` completes.
 */

import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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

  // Collect generated pages for buildPipeline/orchestration/repositoryHealthAgent
  // and copy directly into structured IA without creating root duplicates.
  const generatedBase = path.join(docsDir, "docs");
  const structuredPromotions: Array<{ src: string; dest: string }> =
    getStructuredPromotions(generatedBase, docsDir);
  for (const { src, dest } of structuredPromotions) {
    try {
      const content = await readFile(src, "utf8");
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf8");
      await ensureTrailingNewlineAndLF(dest);
      console.log(
        `[docs:fix] Structured ${path.relative(
          docsDir,
          src
        )} -> ${path.relative(docsDir, dest)}`
      );
    } catch (err) {
      console.warn(
        `[docs:fix] Skipped structured promotion for ${src}: ${String(
          (err as Error).message
        )}`
      );
    }
  }

  // Remove nested TypeDoc tree after promotion to avoid duplication (outlier)
  try {
    const nested = path.join(docsDir, "docs");
    await fg(["**/*"], { cwd: nested });
    // If it exists and we got here, we can safely remove it
    const { rm } = await import("node:fs/promises");
    await rm(nested, { recursive: true, force: true });
    console.log(`[docs:fix] Removed nested docs subtree: ${nested}`);
  } catch (e) {
    // Best-effort cleanup; ignore if not present
  }

  // Diátaxis layout: copy curated pages into guides/, concepts/, reference/
  const guidesDir = path.join(docsDir, "guides");
  const conceptsDir = path.join(docsDir, "concepts");
  const referenceDir = path.join(docsDir, "reference");
  await mkdir(guidesDir, { recursive: true });
  await mkdir(conceptsDir, { recursive: true });
  await mkdir(path.join(referenceDir, "tools"), { recursive: true });

  // Move modules.md into reference/api.md (no root duplicate)
  try {
    const modulesSrc = path.join(docsDir, "modules.md");
    const modulesDst = path.join(referenceDir, "api.md");
    const content = await readFile(modulesSrc, "utf8");
    await writeFile(modulesDst, content, "utf8");
    await ensureTrailingNewlineAndLF(modulesDst);
    const { rm } = await import("node:fs/promises");
    await rm(modulesSrc, { force: true });
    console.log(`[docs:fix] Moved modules.md -> reference/api.md`);
  } catch (err) {
    // Skip if not present
  }

  // Remove obsolete root duplicates if any still exist
  const rootDuplicates = [
    path.join(docsDir, "build-pipeline.md"),
    path.join(docsDir, "orchestration.md"),
    path.join(docsDir, "agent"),
    path.join(docsDir, "repository-health-agent.md"),
  ];
  const { rm } = await import("node:fs/promises");
  for (const dup of rootDuplicates) {
    try {
      await rm(dup, { recursive: true, force: true });
      console.log(`[docs:fix] Removed root duplicate/outlier: ${dup}`);
    } catch {
      /* ignore */
    }
  }
}

// Execute only when invoked directly via Node, not on import (e.g., in tests)
import { fileURLToPath } from "node:url";
if (typeof process !== "undefined" && Array.isArray(process.argv)) {
  const thisFile = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  if (thisFile === invoked) {
    void run().catch((err: unknown) => {
      console.error("[docs:fix] Failed while normalizing markdown files.", err);
      process.exitCode = 1;
    });
  }
}

/**
 * Return the list of structured promotions (source generated pages to final destinations).
 * Exported for unit tests to guard against regressions in TypeDoc pathing.
 */
export function getStructuredPromotions(
  generatedBase: string,
  docsDir: string
): Array<{ src: string; dest: string }> {
  return [
    {
      src: path.join(generatedBase, "buildPipeline", "README.md"),
      dest: path.join(docsDir, "guides", "build-pipeline.md"),
    },
    {
      src: path.join(generatedBase, "repositoryHealthAgent", "README.md"),
      dest: path.join(
        docsDir,
        "reference",
        "tools",
        "repository-health-agent.md"
      ),
    },
    {
      src: path.join(generatedBase, "orchestration", "README.md"),
      dest: path.join(docsDir, "concepts", "orchestration.md"),
    },
    {
      src: path.join(generatedBase, "mcp", "jsonRpc", "README.md"),
      dest: path.join(docsDir, "mcp", "json-rpc.md"),
    },
  ];
}
