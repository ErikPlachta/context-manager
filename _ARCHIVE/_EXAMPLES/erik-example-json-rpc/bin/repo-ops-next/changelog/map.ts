/**
 * @packageDocumentation
 * Next-gen changelog map utilities for indexing days and entries.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface ChangelogEntryMeta {
  day: string;
  timestamp: string;
  type: string;
  summary: string;
  line: number;
  rawHeading: string;
}

export interface ChangelogMap {
  generatedAt: string;
  file: string;
  days: Array<{
    day: string;
    line: number;
    entries: ChangelogEntryMeta[];
  }>;
  entries: ChangelogEntryMeta[];
  totalLines: number;
}

const DAY_HEADER_RE = /^### \[(\d{4}-\d{2}-\d{2})\]/u;
const ENTRY_HEADER_RE =
  /^#### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+([a-zA-Z]+):\s+(.*)$/u;

export async function mapChangelog(filePath: string): Promise<ChangelogMap> {
  const buf = await fs.promises.readFile(filePath, "utf8");
  const lines = buf.replace(/\r\n?/gu, "\n").split("\n");
  const days: ChangelogMap["days"] = [];
  const flat: ChangelogEntryMeta[] = [];
  let currentDay:
    | { day: string; line: number; entries: ChangelogEntryMeta[] }
    | undefined;

  lines.forEach((line, idx) => {
    const dayMatch = DAY_HEADER_RE.exec(line);
    if (dayMatch) {
      currentDay = { day: dayMatch[1], line: idx, entries: [] };
      days.push(currentDay);
      return;
    }

    const entryMatch = ENTRY_HEADER_RE.exec(line);
    if (entryMatch && currentDay) {
      const [, ts, typeRaw, summary] = entryMatch;
      const type = typeRaw.toLowerCase();
      const meta: ChangelogEntryMeta = {
        day: currentDay.day,
        timestamp: ts,
        type,
        summary: summary.trim(),
        line: idx,
        rawHeading: line,
      };
      currentDay.entries.push(meta);
      flat.push(meta);
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    file: path.resolve(filePath),
    days,
    entries: flat,
    totalLines: lines.length,
  };
}
