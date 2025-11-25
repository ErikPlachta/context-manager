import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest,
} from "@jest/globals";
import fs from "fs";
import path from "path";
import { buildConfig, writeConfigFile } from "../src/tools/generateMcpConfig";

describe("generateMcpConfig", () => {
  it("builds a config with expected agents and application fields", () => {
    const cfg = buildConfig();
    expect(cfg.application.name).toBeTruthy();
    expect(cfg.application.version).toMatch(/\d+\.\d+\.\d+/);
    expect(Array.isArray(cfg.agents)).toBe(true);
    expect(cfg.agents.length).toBeGreaterThan(0);
    const ids = cfg.agents.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "orchestrator",
        "relevant-data-manager",
        "user-context",
        "database-agent",
        "data-agent",
        "clarification-agent",
      ])
    );
  });

  it("writes the config to out/mcp.config.json", () => {
    const cfg = buildConfig();
    const target = writeConfigFile(cfg);
    expect(fs.existsSync(target)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    expect(parsed.generatedAt).toBeDefined();
    expect(parsed.application?.name).toBeDefined();
  });
});
