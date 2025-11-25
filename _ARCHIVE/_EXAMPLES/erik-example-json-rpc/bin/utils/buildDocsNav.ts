/**
 * @packageDocumentation Build a simple docs index and copy CHANGELOG into the docs site.
 */

import path from "node:path";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";

async function run(): Promise<void> {
  const root = process.cwd();
  const docsDir = path.resolve(root, "docs");
  await mkdir(docsDir, { recursive: true });

  // Compose a minimal index with major sections
  const index = `# Documentation Index\n\n- [Overview](README.md)\n- [Build Pipeline](build-pipeline.md)\n- [Orchestration](orchestration.md)\n- [Repository Health Agent](agent/repository-health-agent.md)\n- [Modules](modules.md)\n- [Types](types/index.md)\n`;
  await writeFile(path.join(docsDir, "index.md"), index, "utf8");

  // Copy changelog for easy browsing in docs site
  const changelogSrc = path.join(root, "CHANGELOG.md");
  const changelogDst = path.join(docsDir, "changelog.md");
  try {
    await copyFile(changelogSrc, changelogDst);
  } catch (err) {
    console.warn(
      "[docs:nav] Skipped copying CHANGELOG.md:",
      (err as Error).message
    );
  }
}

void run().catch((err) => {
  console.error("[docs:nav] Failed to build docs navigation:", err);
  process.exitCode = 1;
});
