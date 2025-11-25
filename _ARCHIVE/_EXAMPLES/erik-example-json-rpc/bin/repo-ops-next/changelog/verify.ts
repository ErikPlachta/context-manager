/**
 * @packageDocumentation
 * Verification block operations for the latest changelog entry (next-gen).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { mapChangelog } from "./map";

export interface VerifyLatestArgs {
  changelogPath: string;
  force?: boolean;
}

export interface VerifyLatestResult {
  updated: boolean;
  notes?: string[];
}

export async function verifyLatestEntry(
  args: VerifyLatestArgs
): Promise<VerifyLatestResult> {
  const changelogPath = args.changelogPath;
  const map = await mapChangelog(changelogPath);
  const entry = map.entries[0];
  if (!entry) return { updated: false, notes: ["No entries found"] };

  const headingLine = entry.rawHeading.trim();
  const tz = "America/New_York";
  const stampDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  const verification = [
    `##### Verification – ${stampDay.year}-${stampDay.month}-${stampDay.day} (Verify Only$${
      args.force ? ", Force" : ""
    })`,
    "",
    "- Build: UNKNOWN",
    "- Tests: UNKNOWN",
    "- Docs: UNKNOWN",
    "- Health: UNKNOWN",
    "- Lint: N/A",
    "",
  ].join("\n");

  const current = await fs.promises.readFile(changelogPath, "utf8");
  const lines = current.replace(/\r\n?/gu, "\n").split("\n");
  const startIdx = lines.findIndex((ln) => ln.trim() === headingLine);
  if (startIdx === -1) {
    return { updated: false, notes: ["Entry heading not found"] };
  }

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (
      /^####\s/u.test(lines[i]!) ||
      /^### \[\d{4}-\d{2}-\d{2}\]/u.test(lines[i]!)
    ) {
      endIdx = i;
      break;
    }
  }

  for (let i = startIdx + 1; i < endIdx; i += 1) {
    if (/^##### Verification/u.test(lines[i]!)) {
      let j = i + 1;
      for (; j < endIdx; j += 1) {
        if (
          /^#####\s/u.test(lines[j]!) ||
          /^####\s/u.test(lines[j]!) ||
          /^### \[\d{4}-\d{2}-\d{2}\]/u.test(lines[j]!)
        ) {
          break;
        }
      }
      const updated = [...lines.slice(0, i), verification, ...lines.slice(j)].join(
        "\n"
      );
      await fs.promises.writeFile(changelogPath, updated, "utf8");
      return { updated: true };
    }
  }

  const updated = [
    ...lines.slice(0, endIdx),
    "",
    verification,
    ...lines.slice(endIdx),
  ].join("\n");
  await fs.promises.writeFile(changelogPath, updated, "utf8");
  return { updated: true };
}
