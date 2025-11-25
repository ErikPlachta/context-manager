/**
 * @packageDocumentation Remove the generated docs directory before TypeDoc runs.
 */

import path from "node:path";
import { rm, mkdir, writeFile } from "node:fs/promises";

async function run(): Promise<void> {
  const root = process.cwd();
  const docsDir = path.resolve(root, "docs");
  await rm(docsDir, { recursive: true, force: true });
  console.log(`[docs:clean] Removed ${docsDir}`);

  // Pre-create structured IA folders with placeholder files to satisfy README links during TypeDoc.
  const guidesDir = path.join(docsDir, "guides");
  const conceptsDir = path.join(docsDir, "concepts");
  const referenceToolsDir = path.join(docsDir, "reference", "tools");
  await mkdir(guidesDir, { recursive: true });
  await mkdir(conceptsDir, { recursive: true });
  await mkdir(referenceToolsDir, { recursive: true });
  // Placeholders (overwritten by postprocess later)
  await writeFile(
    path.join(guidesDir, "build-pipeline.md"),
    "# Build Pipeline\n\n(Placeholder – replaced after generation)\n",
    "utf8"
  );
  await writeFile(
    path.join(conceptsDir, "orchestration.md"),
    "# Orchestration\n\n(Placeholder – replaced after generation)\n",
    "utf8"
  );
  await writeFile(
    path.join(referenceToolsDir, "repository-health-agent.md"),
    "# Repository Health Agent\n\n(Placeholder – replaced after generation)\n",
    "utf8"
  );
  await writeFile(
    path.join(docsDir, "reference", "api.md"),
    "# API Reference\n\n(Placeholder – replaced after generation)\n",
    "utf8"
  );
}

void run().catch((err) => {
  console.error("[docs:clean] Failed to remove docs directory:", err);
  process.exitCode = 1;
});
