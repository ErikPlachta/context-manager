import { describe, it, expect, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { RepositoryHealthAgent } from "../src/tools/repositoryHealth";
import { loadApplicationConfig } from "../src/shared/configurationLoader";

// Preserve original working directory so other test suites are not affected by chdir operations here.
const ORIGINAL_CWD = process.cwd();

// Helper to create a minimal out/mcp.config.json so health agent loads TS config successfully.
async function ensureGeneratedConfig(tempDir: string) {
  const outDir = path.join(tempDir, "out");
  await fs.mkdir(outDir, { recursive: true });
  // Use application.config.ts via loader, then serialize to mimic generator output.
  const app = await loadApplicationConfig();
  await fs.writeFile(
    path.join(outDir, "mcp.config.json"),
    JSON.stringify(app, null, 2),
    "utf8"
  );
}

describe("RepositoryHealthAgent legacy JSON detection", () => {
  // Ensure we always restore the original CWD after each test to prevent cross-suite side effects.
  afterEach(() => {
    try {
      process.chdir(ORIGINAL_CWD);
    } catch {
      // swallow — restoring CWD should not fail the test suite
    }
  });
  it("passes when only out/mcp.config.json exists", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "health-no-legacy-")
    );
    process.chdir(tempDir);
    await ensureGeneratedConfig(tempDir);
    const agent = await RepositoryHealthAgent.createFromDisk(
      "out/mcp.config.json"
    );
    const report = await agent.runAllChecks();
    const legacyCheck = report.checks.find(
      (c) => c.name === "Legacy JSON config presence"
    );
    expect(legacyCheck).toBeDefined();
    expect(legacyCheck!.passed).toBe(true);
  });

  it("fails when a legacy src/mcp.config.json is reintroduced", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "health-legacy-"));
    process.chdir(tempDir);
    await ensureGeneratedConfig(tempDir);
    const srcDir = path.join(tempDir, "src");
    await fs.mkdir(srcDir, { recursive: true });
    // Introduce a stray legacy JSON file
    await fs.writeFile(
      path.join(srcDir, "mcp.config.json"),
      JSON.stringify({ stray: true }),
      "utf8"
    );
    const agent = await RepositoryHealthAgent.createFromDisk(
      "out/mcp.config.json"
    );
    const report = await agent.runAllChecks();
    const legacyCheck = report.checks.find(
      (c) => c.name === "Legacy JSON config presence"
    );
    expect(legacyCheck).toBeDefined();
    expect(legacyCheck!.passed).toBe(false);
    expect(
      legacyCheck!.messages.some((m) => m.includes("src/mcp.config.json"))
    ).toBe(true);
  });
});
