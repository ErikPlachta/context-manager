import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";
import { readSharedCacheEntry } from "../src/extension/mcpCache";

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

describe("UserContextAgent snapshot cache invalidation", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-snap-"));
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

  it("rewrites snapshot after record change", async () => {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-snap-cache-")
    );
    const agent = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    const snap1 = await agent.getOrCreateSnapshot("alpha");
    expect(snap1.recordCount).toBe(1);

    const key = `relevant-data:alpha:snapshot`;
    const entry1 = await readSharedCacheEntry(cacheDir, key);
    const hash1 = (entry1?.metadata as any)?.recordHash;
    expect(hash1).toBeTruthy();

    // Modify records
    const categoryDir = path.join(root, "alpha");
    await writeJson(path.join(categoryDir, "records.json"), [
      { id: "a1" },
      { id: "a2" },
    ]);

    // Re-instantiate agent to force re-scan of mutated dataset
    const refreshedAgent = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    const snap2 = await refreshedAgent.getOrCreateSnapshot("alpha");
    expect(snap2.recordCount).toBe(2);
    const entry2 = await readSharedCacheEntry(cacheDir, key);
    const hash2 = (entry2?.metadata as any)?.recordHash;
    expect(hash2).toBeTruthy();
    expect(hash2).not.toEqual(hash1);
  });
});
