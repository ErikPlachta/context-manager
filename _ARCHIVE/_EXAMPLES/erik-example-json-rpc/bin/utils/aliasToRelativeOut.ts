/**
 * @packageDocumentation Rewrite alias imports (e.g. @server/embedded) in compiled JS under `out/` to relative paths.
 *
 * This is required because VS Code extension runtime does not honor tsconfig path aliases.
 * Running this after `tsc` ensures the VSIX contains runnable JS with resolvable import specifiers.
 */

import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import fg from "fast-glob";

interface AliasRoot {
  alias: string; // e.g. '@server'
  outRoot: string; // absolute path to compiled folder under out, e.g. /repo/out/server
}

const PROJECT_ROOT = process.cwd();
const OUT_DIR = path.resolve(PROJECT_ROOT, "out");

const ALIASES: AliasRoot[] = [
  { alias: "@agent", outRoot: path.join(OUT_DIR, "src", "agent") },
  { alias: "@extension", outRoot: path.join(OUT_DIR, "src", "extension") },
  { alias: "@mcp", outRoot: path.join(OUT_DIR, "src", "mcp") },
  { alias: "@server", outRoot: path.join(OUT_DIR, "src", "server") },
  { alias: "@shared", outRoot: path.join(OUT_DIR, "src", "shared") },
  { alias: "@config", outRoot: path.join(OUT_DIR, "src", "config") },
  { alias: "@tools", outRoot: path.join(OUT_DIR, "src", "tools") },
  { alias: "@internal-types", outRoot: path.join(OUT_DIR, "src", "types") },
  { alias: "@bin", outRoot: path.join(OUT_DIR, "bin") },
];

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

function computeRelative(fromFile: string, targetAbs: string): string {
  let rel = path.relative(path.dirname(fromFile), targetAbs);
  rel = rel.replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel; // ensure relative prefix
  return rel;
}

function rewriteSpec(filePath: string, spec: string): string | null {
  for (const { alias, outRoot } of ALIASES) {
    if (spec === alias || spec.startsWith(alias + "/")) {
      const subPath = spec.slice(alias.length + 1); // may be '' if root import
      const baseTarget = subPath ? path.join(outRoot, subPath) : outRoot;

      // Node ESM requires explicit file extensions; prefer exact .js, else index.js
      let resolvedTarget = baseTarget;
      const fileCandidate = baseTarget + ".js";
      const indexCandidate = path.join(baseTarget, "index.js");
      if (existsSync(fileCandidate)) {
        resolvedTarget = fileCandidate;
      } else if (existsSync(indexCandidate)) {
        resolvedTarget = indexCandidate;
      }

      const rel = computeRelative(filePath, resolvedTarget);
      return rel;
    }
  }
  return null;
}

function rewriteFileContent(filePath: string, content: string): string {
  const importExportRegex =
    /(^\s*(?:import|export)\s[^'"`]*?from\s*['"])([^'"`]+)(['"];?)/gm;
  const bareImportRegex = /(^\s*import\s*['"])([^'"`]+)(['"];?)/gm;
  // dynamic import("spec")
  const dynamicImportRegex = /(import\s*\(\s*['"])([^'"`]+)(['"]\s*\))/gm;

  const handler = (
    full: string,
    p1: string,
    spec: string,
    p3: string
  ): string => {
    const next = rewriteSpec(filePath, spec);
    if (next) return `${p1}${next}${p3}`;
    return full;
  };

  let updated = content.replace(importExportRegex, handler);
  updated = updated.replace(bareImportRegex, handler);
  updated = updated.replace(dynamicImportRegex, handler);
  return updated;
}

async function processFile(file: string): Promise<boolean> {
  const original = await readFile(file, "utf8");
  const updated = rewriteFileContent(file, original);
  if (updated !== original) {
    await writeFile(file, updated, "utf8");
    return true;
  }
  return false;
}

async function run(): Promise<void> {
  const files = await fg(["out/**/*.js"], {
    cwd: PROJECT_ROOT,
    absolute: true,
    ignore: ["**/*.map"],
  });
  let changed = 0;
  for (const file of files) {
    const did = await processFile(file);
    if (did) changed += 1;
  }
  console.log(
    `[aliasToRelativeOut] Processed ${files.length} files; changed ${changed}.`
  );
}

void run().catch((err: unknown) => {
  console.error("[aliasToRelativeOut] Failed while rewriting imports.", err);
  process.exitCode = 1;
});
