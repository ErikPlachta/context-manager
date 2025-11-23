import { readFileSafe } from "../bin/repo-ops-next/fs";

describe("repo-ops-next fs helpers", () => {
  it("returns ok=true and content for an existing file", () => {
    const result = readFileSafe(process.cwd(), "TODO.md");

    expect(result.ok).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("returns ok=false and error for a missing file", () => {
    const result = readFileSafe(process.cwd(), "__nonexistent_file__.md");

    expect(result.ok).toBe(false);
    expect(result.content).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});
