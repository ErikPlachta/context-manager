import { describe, test, expect } from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import { mapChangelog } from "../bin/../bin/repo-ops-next/changelog/map";
import {
  writeEntryDryRun,
  writeEntry,
} from "../bin/../bin/repo-ops-next/changelog/write";
import { verifyLatestEntry } from "../bin/../bin/repo-ops-next/changelog/verify";

const sampleChangelog = [
  "---",
  "title: Changelog",
  "---",
  "",
  "<!-- CHANGELOG:BEGIN:LOGS -->",
  "",
  "## Logs",
  "",
  "### [2025-11-12]",
  "",
  "#### 2025-11-12 21:30:09 feat: Test entry",
  "- Example body.",
  "",
].join("\n");

describe("repo-ops-next changelog helpers", () => {
  test("mapChangelog indexes entries", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(process.cwd(), "tests_tmp_changelog_")
    );
    const changelogPath = path.join(tmpDir, "CHANGELOG.md");
    fs.writeFileSync(changelogPath, sampleChangelog, "utf8");

    const map = await mapChangelog(changelogPath);
    expect(map.entries.length).toBe(1);
    expect(map.entries[0]?.summary).toBe("Test entry");
  });

  test("writeEntryDryRun reports target and backup intent", () => {
    const res = writeEntryDryRun({
      changelogPath: "CHANGELOG.md",
      cwd: process.cwd(),
      flags: {
        type: "docs",
        summary: "Unit test entry",
        context: "Unit test context",
        changes: "Change details",
        architecture: "Arch notes",
        filesChanged: "File list",
        testing: "Test details",
        impact: "Impact notes",
      },
    });
    expect(res.ok).toBe(true);
    expect(res.dryRun).toBe(true);
    expect(res.writtenPath).toContain("CHANGELOG.md");
    expect(res.block.includes("#### ")).toBe(true);
    expect(res.block.includes("docs: Unit test entry")).toBe(true);
    expect(res.block.includes("**Problem/Context**:")).toBe(true);
  });

  test("writeEntry respects REPO_OPS_CHANGELOG_PATH override", () => {
    const tmpDir = fs.mkdtempSync(
      path.join(process.cwd(), "tests_tmp_changelog_env_")
    );
    const synthetic = path.join(tmpDir, "CHANGELOG_SYNTHETIC.md");
    process.env.REPO_OPS_CHANGELOG_PATH = synthetic;

    const res = writeEntry({
      changelogPath: synthetic,
      cwd: tmpDir,
      flags: {
        type: "feat",
        summary: "Synthetic entry",
      },
    });
    expect(res.ok).toBe(true);
    expect(res.writtenPath).toBe(synthetic);
    const onDisk = fs.readFileSync(synthetic, "utf8");
    expect(onDisk.includes("feat: Synthetic entry")).toBe(true);

    delete process.env.REPO_OPS_CHANGELOG_PATH;
  });

  test("verifyLatestEntry appends or updates verification block", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(process.cwd(), "tests_tmp_changelog_verify_")
    );
    const changelogPath = path.join(tmpDir, "CHANGELOG.md");
    fs.writeFileSync(changelogPath, sampleChangelog, "utf8");

    const result = await verifyLatestEntry({ changelogPath });
    expect(result.updated).toBe(true);

    const updated = fs.readFileSync(changelogPath, "utf8");
    expect(updated.includes("##### Verification")).toBe(true);
  });
});
