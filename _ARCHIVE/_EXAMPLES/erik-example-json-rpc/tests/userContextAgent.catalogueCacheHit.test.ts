import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";

// This test ensures that the consolidated index (catalogue) is only written once per fingerprint.
// A second agent instantiation with identical dataset and cache dir should not increase file count.

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

describe("UserContextAgent consolidated index cache hit", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-cat-cache-"));
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

  it("skips writing catalogue when fingerprint matches", async () => {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-cat-cache-hit-")
    );
    const agent1 = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    // Allow async dataset load & initial persist
    await new Promise((r) => setTimeout(r, 60));
    const sharedDir = path.join(cacheDir, "shared");
    const beforeFiles = await fs.readdir(sharedDir).catch(() => []);
    expect(beforeFiles.length).toBeGreaterThan(0);

    const agent2 = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    await new Promise((r) => setTimeout(r, 60));
    const afterFiles = await fs.readdir(sharedDir).catch(() => []);

    // No additional file should be written for identical fingerprint
    expect(afterFiles.length).toEqual(beforeFiles.length);
    expect(agent1.getDatasetCatalogue().length).toEqual(
      agent2.getDatasetCatalogue().length
    );
  });
});
