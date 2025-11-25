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

describe("repo-ops-next session lint", () => {
  it("reports OK for a valid CONTEXT-SESSION.md", () => {
    const output = captureStdout(() => {
      main(["session", "lint"]);
    });

    expect(output).toContain("Repo-ops Next CLI (scaffold)");
    expect(output).toContain("Session lint results:");
    expect(output).toContain("CONTEXT-SESSION.md: OK");
  });
});
