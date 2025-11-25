import { main } from "../bin/repo-ops-next/index";

describe("repo-ops-next end-to-end flow", () => {
  it("runs todo add, session rotate, and changelog write without error", async () => {
    await main([
      "todo",
      "add",
      "--section",
      "Next",
      "--priority",
      "P2",
      "--title",
      "E2E flow task",
    ]);

    await main(["session", "rotate"]);

    await main([
      "changelog",
      "write",
      "--type",
      "test",
      "--summary",
      "Repo-ops-next E2E flow verification",
      "--context",
      "End-to-end CLI flow covering TODO, session, and changelog.",
      "--changes",
      "- Added an end-to-end Jest test exercising repo-ops-next CLI across TODO, CONTEXT-SESSION, and CHANGELOG.",
      "--architecture",
      "- Uses shared flag parsing and file helpers for all commands.",
      "--testing",
      "Build: N/A; Tests: PASS (this Jest suite); Docs: N/A; Health: N/A; Lint: N/A",
      "--impact",
      "- Provides a golden-path regression test for the new CLI.",
    ]);
  });
});
