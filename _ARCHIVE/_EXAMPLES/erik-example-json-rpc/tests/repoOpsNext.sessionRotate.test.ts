import * as fs from "node:fs";
import * as path from "node:path";
import os from "node:os";
import { main } from "../bin/repo-ops-next/index";

function captureStdout(fn: () => void): string {
  const originalLog = console.log;
  const originalError = console.error;
  let output = "";

  // eslint-disable-next-line no-console
  console.log = (...args: unknown[]) => {
    output += `${args.join(" ")}\n`;
  };
  // eslint-disable-next-line no-console
  console.error = (...args: unknown[]) => {
    output += `${args.join(" ")}\n`;
  };

  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  return output;
}

const SAMPLE_CONTEXT = `# Session Context

Started: 2025-11-12T17:30:00Z

## Related

- [CHANGELOG.md](CHANGELOG.md)
- [TODO.md](TODO.md)

<!-- BEGIN:COPILOT_INSTRUCTIONS -->
Instructions
<!-- END:COPILOT_INSTRUCTIONS -->
<!-- BEGIN:CURRENT-FOCUS-SUMMARY -->

## Current Focus Summary

- Old focus line

<!-- END:CURRENT-FOCUS-SUMMARY -->
<!-- BEGIN:CURRENT-FOCUS-DETAIL -->

## Current Focus Detail

Details

<!-- END:CURRENT-FOCUS-DETAIL -->
<!-- BEGIN:CONTEXT-SESSION-LLM-THINKING-NOTES-AREA -->

## Notes

- Note

<!-- END:CONTEXT-SESSION-LLM-THINKING-NOTES-AREA -->
`;

const SAMPLE_TODO = `## Generated Action Items

### Current Action Items

- [ ] P1: Sample P1 task from TODO
`;

describe("repo-ops-next session rotate", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("updates Focus Summary based on TODO.md P1", () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "repo-ops-next-session-")
    );
    fs.writeFileSync(
      path.join(tmpDir, "CONTEXT-SESSION.md"),
      SAMPLE_CONTEXT,
      "utf8"
    );
    fs.writeFileSync(path.join(tmpDir, "TODO.md"), SAMPLE_TODO, "utf8");

    process.chdir(tmpDir);

    const output = captureStdout(() => {
      main(["session", "rotate"]);
    });

    expect(output).toContain("Repo-ops Next CLI (scaffold)");
    expect(output).toContain("Session lint results:");
    expect(output).toContain("CONTEXT-SESSION.md: OK");

    const updated = fs.readFileSync(
      path.join(tmpDir, "CONTEXT-SESSION.md"),
      "utf8"
    );
    expect(updated).toContain(
      "- Focus: repo-ops CLI rebuild (next-gen repo-ops-next)."
    );
    expect(updated).toContain(
      "- Current P1 from TODO.md: Sample P1 task from TODO"
    );
  });
});
