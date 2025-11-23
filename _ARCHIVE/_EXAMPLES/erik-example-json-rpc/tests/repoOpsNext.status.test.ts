import { main } from "../bin/repo-ops-next/index";

function captureStdout(fn: () => void): string {
  const originalLog = console.log;
  const originalError = console.error;
  let output = "";
  // eslint-disable-next-line no-console
  console.log = (...args: unknown[]) => {
    output += `${args.join(" ")}\n`;
  };
  // Keep errors untouched to avoid hiding failures.
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

describe("repo-ops-next status command", () => {
  it("reports governance files status from repo root", () => {
    const output = captureStdout(() => {
      main(["status"]);
    });

    expect(output).toContain("Repo-ops Next CLI (scaffold)");
    expect(output).toContain("Governance files status:");
    expect(output).toContain("TODO.md");
    expect(output).toContain("CONTEXT-SESSION.md");
    expect(output).toContain("CHANGELOG.md");
  });
});
