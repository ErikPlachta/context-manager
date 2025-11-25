import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";
import { listSharedCacheEntries } from "../src/extension/mcpCache";

// Validates that when the dataset changes (fingerprint differs), the consolidated
// index is written again to the shared cache (file count increases or overwrites).

jest.mock(
  "vscode",
  () => ({
    workspace: {
      get workspaceFolders() {
        return undefined;
      },
    },
  }),
  { virtual: true }
);

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

function categoryConfig(id: string) {
  return {
    id,
    name: id,
    description: `${id} category`,
    config: {
      purpose: "p",
      primaryKeys: ["id"],
      updateCadence: "manual",
      access: "all",
      requirements: { requiredRecordFields: ["id"] },
      orchestration: {
        summary: "summary",
        signals: ["s"],
        agents: {
          relevantDataManager: {
            focus: "f",
            signals: ["s"],
            promptStarters: ["p"],
          },
          databaseAgent: { focus: "f", signals: ["s"], promptStarters: ["p"] },
          dataAgent: { focus: "f", signals: ["s"], promptStarters: ["p"] },
        },
      },
    },
  };
}

describe("UserContextAgent consolidated index cache divergence", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-cat-div-"));
    process.env.VSCODE_TEMPLATE_DATA_ROOT = root;
    const categoryDir = path.join(root, "alpha");
    await fs.mkdir(path.join(categoryDir, "schemas"), { recursive: true });
    await fs.mkdir(path.join(categoryDir, "types"), { recursive: true });
    await fs.mkdir(path.join(categoryDir, "examples"), { recursive: true });
    await fs.mkdir(path.join(categoryDir, "queries"), { recursive: true });
    await writeJson(path.join(categoryDir, "records.json"), [{ id: "a1" }]);
    await writeJson(path.join(categoryDir, "relationships.json"), [
      {
        key: "self",
        name: "self",
        description: "",
        targetCategory: "alpha",
        sourceField: "id",
        targetField: "id",
        cardinality: "one",
      },
    ]);
    await writeJson(
      path.join(categoryDir, "category.json"),
      categoryConfig("alpha")
    );
  });

  it("writes a new catalogue when fingerprint changes", async () => {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-cat-cache-div-")
    );

    // First instantiation persists initial catalogue
    const agent1 = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    await new Promise((r) => setTimeout(r, 60));
    const sharedDir = path.join(cacheDir, "shared");
    const beforeFiles = await fs.readdir(sharedDir).catch(() => []);
    expect(beforeFiles.length).toBeGreaterThan(0);
    const fp1 = agent1.getDatasetFingerprint();

    // Modify dataset: add a new record so fingerprint changes
    const categoryDir = path.join(root, "alpha");
    await writeJson(path.join(categoryDir, "records.json"), [
      { id: "a1" },
      { id: "a2" },
    ]);

    // Second instantiation should detect changed fingerprint and persist again
    const agent2 = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    await new Promise((r) => setTimeout(r, 80));
    const afterFiles = await fs.readdir(sharedDir).catch(() => []);

    // Either a new cache file is created or existing entry is overwritten with same filename but updated timestamp.
    // We assert that at minimum the file count is >= previous count, and fingerprints differ.
    expect(afterFiles.length).toBeGreaterThanOrEqual(beforeFiles.length);
    const fp2 = agent2.getDatasetFingerprint();
    expect(fp2).not.toEqual(fp1);

    // Additionally, confirm the cache entry metadata fingerprint matches the latest agent fingerprint
    const entries = await listSharedCacheEntries(cacheDir);
    const catalogue = entries.find((e) => Array.isArray((e as any).value));
    expect(
      catalogue?.metadata && (catalogue.metadata as any).fingerprint
    ).toEqual(fp2);
  });
});
