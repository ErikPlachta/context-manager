import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";

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

function baseConfig(id: string) {
  return {
    id,
    name: id,
    description: `${id} category`,
    config: {
      purpose: "test",
      primaryKeys: ["id"],
      updateCadence: "manual",
      access: "all",
      requirements: {
        requiredRecordFields: ["id"],
        requiredRelationshipFields: ["missingField"],
      },
      orchestration: {
        summary: "orchestration",
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

describe("UserContextAgent relationship coverage assertion", () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-relcov-"));
    process.env.VSCODE_TEMPLATE_DATA_ROOT = root;
    const catDir = path.join(root, "alpha");
    await fs.mkdir(path.join(catDir, "schemas"), { recursive: true });
    await fs.mkdir(path.join(catDir, "types"), { recursive: true });
    await fs.mkdir(path.join(catDir, "examples"), { recursive: true });
    await fs.mkdir(path.join(catDir, "queries"), { recursive: true });
    // records
    await writeJson(path.join(catDir, "records.json"), [{ id: "a1" }]);
    // relationships.json missing required source field 'missingField'
    await writeJson(path.join(catDir, "relationships.json"), [
      {
        key: "rel",
        name: "rel",
        description: "",
        targetCategory: "alpha",
        sourceField: "differentField",
        targetField: "id",
        cardinality: "one",
      },
    ]);
    // category.json declares requiredRelationshipFields: ['missingField']
    await writeJson(path.join(catDir, "category.json"), baseConfig("alpha"));
  });

  it("throws when relationship coverage is incomplete", async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-cache-2-"));
    await expect(
      (async () => new UserContextAgent(undefined, Promise.resolve(cacheDir)))()
    ).rejects.toThrow(/Relationship coverage for field 'missingField'/i);
  });
});
