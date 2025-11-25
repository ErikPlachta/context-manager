/**
 * @packageDocumentation
 * Write operations for CHANGELOG entries in the next-gen repo-ops CLI.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { writeWithBackup } from "../fs";
import type { WriteWithBackupResult } from "../fs";

export interface WriteEntryFlags {
  type: string;
  summary: string;
  context?: string;
  changes?: string;
  architecture?: string;
  filesChanged?: string;
  testing?: string;
  impact?: string;
}

export interface WriteEntryArgs {
  changelogPath: string;
  cwd?: string;
  flags: WriteEntryFlags;
}

export interface WriteEntryResult extends WriteWithBackupResult {
  dryRun: boolean;
  block: string;
}

function formatEntryBlock(flags: WriteEntryFlags): string {
  const ts = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(ts)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const timestamp = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  const type = flags.type || "chore";

  const lines: string[] = [];
  lines.push(`#### ${timestamp} ${type}: ${flags.summary}`);
  lines.push("");

  const sections: Array<[string, string | undefined]> = [
    ["Problem/Context", flags.context],
    ["Changes Made", flags.changes],
    ["Architecture Notes", flags.architecture],
    ["Files Changed", flags.filesChanged],
    ["Testing", flags.testing],
    ["Impact", flags.impact],
  ];

  for (const [label, value] of sections) {
    if (!value) continue;
    lines.push(`**${label}**:`);
    lines.push(value);
    lines.push("");
  }

  return lines.join("\n");
}

export function writeEntryDryRun(args: WriteEntryArgs): WriteEntryResult {
  const { changelogPath, cwd = process.cwd(), flags } = args;
  const fullPath = path.isAbsolute(changelogPath)
    ? changelogPath
    : path.join(cwd, changelogPath);

  let exists = false;
  try {
    exists = fs.existsSync(fullPath);
  } catch {
    exists = false;
  }

  const block = formatEntryBlock(flags);

  return {
    ok: true,
    writtenPath: fullPath,
    backupPath: exists ? "<would-create-backup>" : undefined,
    dryRun: true,
    block,
  };
}

export function writeEntry(args: WriteEntryArgs): WriteEntryResult {
  const { changelogPath, cwd = process.cwd(), flags } = args;
  const relativePath = path.isAbsolute(changelogPath)
    ? path.relative(cwd, changelogPath)
    : changelogPath;
  const block = formatEntryBlock(flags);
  const res = writeWithBackup({
    cwd,
    relativePath,
    content: block,
    backupsDir: ".repo-ops-backups/changelog-backup",
  });
  return { ...res, dryRun: false, block };
}
