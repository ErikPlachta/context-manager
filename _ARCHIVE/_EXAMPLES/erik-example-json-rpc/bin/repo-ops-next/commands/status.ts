/**
 * @packageDocumentation
 * Status command for repo-ops-next.
 *
 * Provides a lightweight health summary for core governance files.
 */

import { readFileSafe } from "../fs";

export interface StatusFileCheck {
  file: string;
  exists: boolean;
}

export interface StatusResult {
  ok: boolean;
  files: StatusFileCheck[];
}

/** Files we consider critical for governance. */
const GOVERNANCE_FILES = ["TODO.md", "CONTEXT-SESSION.md", "CHANGELOG.md"];

/**
 * Check whether core governance files exist and are readable.
 */
export function getStatus(cwd: string = process.cwd()): StatusResult {
  const files: StatusFileCheck[] = GOVERNANCE_FILES.map((file) => {
    const result = readFileSafe(cwd, file);
    return { file, exists: result.ok };
  });

  const ok = files.every((f) => f.exists);
  return { ok, files };
}

/**
 * Render a simple, human-readable status report to stdout.
 */
export function printStatus(result: StatusResult): void {
  // eslint-disable-next-line no-console
  console.log("Governance files status:");
  for (const entry of result.files) {
    // eslint-disable-next-line no-console
    console.log(`- ${entry.file}: ${entry.exists ? "OK" : "MISSING"}`);
  }

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.log("One or more governance files are missing.");
  }
}
