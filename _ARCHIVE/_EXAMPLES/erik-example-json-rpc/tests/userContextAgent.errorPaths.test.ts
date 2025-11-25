import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";

describe("RelevantDataManagerAgent error paths", () => {
  it("throws when data directory is empty", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-empty-"));
    process.env.VSCODE_TEMPLATE_DATA_ROOT = root;
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-empty-cache-")
    );
    expect(() => new UserContextAgent(undefined, Promise.resolve(cacheDir))).toThrow(
      /No category folders were found/
    );
  });

  it("throws when category.json is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-missing-cat-"));
    process.env.VSCODE_TEMPLATE_DATA_ROOT = root;
    const categoryDir = path.join(root, "alpha");
    await fs.mkdir(categoryDir, { recursive: true });
    // No category.json written; ensure directory exists but is missing configuration
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-missing-cat-cache-")
    );
    expect(() => new UserContextAgent(undefined, Promise.resolve(cacheDir))).toThrow(
      /No valid categories could be loaded.*Missing required file 'category\.json'/
    );
  });
});
