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

describe("UserContextAgent getEntityConnections error path", () => {
  let root: string;
  let agent: UserContextAgent;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-entity-"));
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
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rdm-entity-cache-")
    );
    agent = new UserContextAgent(undefined, Promise.resolve(cacheDir));
  });

  it("throws for missing record when resolving connections", () => {
    expect(() => agent.getEntityConnections("alpha", "missing")).toThrow(
      /Record missing not found/
    );
  });
});
