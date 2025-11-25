/**
 * @packageDocumentation
 * Session commands for repo-ops-next.
 *
 * Initial focus is `session lint`, which validates the structure and
 * required markers of `CONTEXT-SESSION.md` without mutating it.
 */

import { readFileSafe, writeWithBackup, normalizeTextLines } from "../fs";
import { CONTEXT_SESSION_MARKERS } from "../markers";

export interface SessionLintIssue {
  message: string;
}

export interface SessionLintResult {
  ok: boolean;
  issues: SessionLintIssue[];
}

const CONTEXT_SESSION_FILE = "CONTEXT-SESSION.md";

/**
 * Lint the `CONTEXT-SESSION.md` file for required markers and basic structure.
 */
export function lintSession(cwd: string = process.cwd()): SessionLintResult {
  const issues: SessionLintIssue[] = [];

  const readResult = readFileSafe(cwd, CONTEXT_SESSION_FILE);
  if (!readResult.ok || !readResult.content) {
    issues.push({
      message: `${CONTEXT_SESSION_FILE} is missing or unreadable.`,
    });
    return { ok: false, issues };
  }

  if (!readResult.content.includes("- [CHANGELOG.md](CHANGELOG.md)")) {
    issues.push({
      message: "Missing link to CHANGELOG.md in Related section.",
    });
  }
  if (!readResult.content.includes("- [TODO.md](TODO.md)")) {
    issues.push({ message: "Missing link to TODO.md in Related section." });
  }

  for (const marker of CONTEXT_SESSION_MARKERS) {
    if (!readResult.content.includes(marker.value)) {
      issues.push({ message: `Missing required marker: ${marker.value}` });
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Print a human-friendly lint report to stdout.
 */
export function printSessionLint(result: SessionLintResult): void {
  // eslint-disable-next-line no-console
  console.log("Session lint results:");

  if (result.ok) {
    // eslint-disable-next-line no-console
    console.log("- CONTEXT-SESSION.md: OK");
    return;
  }

  for (const issue of result.issues) {
    // eslint-disable-next-line no-console
    console.log(`- ${issue.message}`);
  }
}

/**
 * Rotate the session context by updating the Focus Summary heading block to
 * reflect the current P1 from TODO.md. This is intentionally conservative and
 * does not duplicate tasks or logs.
 */
export function rotateSession(cwd: string = process.cwd()): SessionLintResult {
  const contextRead = readFileSafe(cwd, CONTEXT_SESSION_FILE);
  if (!contextRead.ok || !contextRead.content) {
    return {
      ok: false,
      issues: [
        { message: `${CONTEXT_SESSION_FILE} is missing or unreadable.` },
      ],
    };
  }

  const todoRead = readFileSafe(cwd, "TODO.md");
  if (!todoRead.ok || !todoRead.content) {
    return {
      ok: false,
      issues: [{ message: "TODO.md is missing or unreadable." }],
    };
  }

  const todoText = normalizeTextLines(todoRead.content);
  const p1Line = todoText
    .split("\n")
    .find((line) => line.trim().startsWith("- [ ] P1:"));

  const focusSummaryMarker = CONTEXT_SESSION_MARKERS.find(
    (m) => m.id === "currentFocusSummary"
  );
  if (!focusSummaryMarker) {
    return {
      ok: false,
      issues: [
        { message: "Missing current focus summary marker configuration." },
      ],
    };
  }

  const lines = normalizeTextLines(contextRead.content).split("\n");
  const markerIndex = lines.findIndex((line) =>
    line.includes(focusSummaryMarker.value)
  );
  if (markerIndex === -1) {
    return {
      ok: false,
      issues: [{ message: `Missing marker: ${focusSummaryMarker.value}` }],
    };
  }

  const headerIndex = lines.findIndex(
    (line) => line.trim() === "## Current Focus Summary"
  );
  if (headerIndex === -1) {
    return {
      ok: false,
      issues: [{ message: "Missing Current Focus Summary heading." }],
    };
  }

  const summaryStart = headerIndex + 1;
  let summaryEnd = summaryStart;
  while (summaryEnd < lines.length && lines[summaryEnd].startsWith("- ")) {
    summaryEnd += 1;
  }

  const summaryLines: string[] = [];
  summaryLines.push("- Focus: repo-ops CLI rebuild (next-gen repo-ops-next).");
  if (p1Line) {
    const cleaned = p1Line.replace(/^- \[ \] P1:\s*/u, "");
    summaryLines.push(`- Current P1 from TODO.md: ${cleaned}`);
  }

  const updated = [
    ...lines.slice(0, summaryStart),
    ...summaryLines,
    ...lines.slice(summaryEnd),
  ].join("\n");

  const writeResult = writeWithBackup({
    cwd,
    relativePath: CONTEXT_SESSION_FILE,
    content: updated,
    backupsDir: ".repo-ops-backups",
  });

  if (!writeResult.ok) {
    return {
      ok: false,
      issues: [
        { message: writeResult.error ?? "Failed to write CONTEXT-SESSION.md" },
      ],
    };
  }

  return { ok: true, issues: [] };
}
