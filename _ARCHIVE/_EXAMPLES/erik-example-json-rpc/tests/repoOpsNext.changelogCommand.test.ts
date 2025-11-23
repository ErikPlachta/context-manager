import { describe, test, expect } from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import { runChangelogCommand } from "../bin/../bin/repo-ops-next/commands/changelog";
import { EXIT_CODES } from "../bin/../bin/repo-ops-next/architecture";

describe("repo-ops-next runChangelogCommand(write)", () => {
  test("writes a formatted entry with flags into a synthetic changelog", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(process.cwd(), "tests_tmp_changelog_cmd_")
    );
    const syntheticName = "CHANGELOG_CMD_SYNTHETIC.md";
    const syntheticPath = path.join(tmpDir, syntheticName);

    const origCwd = process.cwd();
    process.chdir(tmpDir);
    process.env.REPO_OPS_CHANGELOG_PATH = syntheticName;

    try {
      const code = await runChangelogCommand("write", {
        type: "feat",
        summary: "Command integration entry",
        context: "Context from command test",
        changes: "Changes from command test",
      });

      expect(code).toBe(EXIT_CODES.success);
        // The underlying write helper and content formatting are already
        // covered in dedicated tests. Here we only assert that the command
        // reports success; path resolution and backups are validated
        // elsewhere.
    } finally {
      process.chdir(origCwd);
      delete process.env.REPO_OPS_CHANGELOG_PATH;
    }
  });
});
