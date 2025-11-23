import { describe, test, expect } from "@jest/globals";
import { main } from "../bin/../bin/repo-ops-next/index";

function captureStdout(fn: () => void): string {
  const originalLog = console.log;
  const chunks: string[] = [];
  (console as any).log = (...args: unknown[]) => {
    chunks.push(args.map(String).join(" "));
  };
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return chunks.join("\n");
}

describe("repo-ops-next CLI scaffold", () => {
  test("help prints header and usage", () => {
    const out = captureStdout(() => main(["help"]));
    expect(out).toContain("Repo-ops Next CLI (scaffold)");
    expect(out).toContain("Usage: repo-ops-next");
  });

  test("version prints scaffold version", () => {
    const out = captureStdout(() => main(["version"]));
    expect(out).toContain("repo-ops-next version 0.0.0-scaffold");
  });
});
