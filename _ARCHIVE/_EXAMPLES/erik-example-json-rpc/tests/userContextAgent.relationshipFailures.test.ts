import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { UserContextAgent } from "../src/agent/userContextAgent";

let workspaceFoldersMock: any[] | undefined;

jest.mock(
  "vscode",
  () => ({
    workspace: {
      get workspaceFolders() {
        return workspaceFoldersMock;
      },
    },
  }),
  { virtual: true }
);

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

function minimalCategoryConfig(id: string, name: string) {
  return {
    id,
    name,
    description: `${name} test category`,
    config: {
      orchestration: {
        summary: `${name} orchestration`,
        signals: ["signal"],
        agents: {
          relevantDataManager: {
            focus: "focus",
            signals: ["s"],
            promptStarters: ["p"],
          },
          databaseAgent: {
            focus: "focus",
            signals: ["s"],
            promptStarters: ["p"],
          },
          dataAgent: {
            focus: "focus",
            signals: ["s"],
            promptStarters: ["p"],
          },
        },
      },
    },
  };
}

describe("UserContextAgent relationship validation failures", () => {
  let dataRoot: string;

  beforeEach(async () => {
    workspaceFoldersMock = undefined;
    dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-relfail-"));
  });

  async function createManager(): Promise<UserContextAgent> {
    process.env.VSCODE_TEMPLATE_DATA_ROOT = dataRoot;
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "rdm-cache-"));
    return new UserContextAgent(undefined, Promise.resolve(cacheDir));
  }

  async function prepareCategory(dir: string, id: string, name: string) {
    const catDir = path.join(dir, id);
    // Required subdirectories
    await fs.mkdir(path.join(catDir, "schemas"), { recursive: true });
    await fs.mkdir(path.join(catDir, "types"), { recursive: true });
    await fs.mkdir(path.join(catDir, "examples"), { recursive: true });
    await fs.mkdir(path.join(catDir, "queries"), { recursive: true });
    await writeJson(
      path.join(catDir, "category.json"),
      minimalCategoryConfig(id, name)
    );
    return catDir;
  }

  it("flags missing target category in relationships", async () => {
    const alphaDir = await prepareCategory(dataRoot, "alpha", "Alpha");
    await writeJson(path.join(alphaDir, "records.json"), [
      { id: "a1", fk: "ghost" },
    ]);
    await writeJson(path.join(alphaDir, "relationships.json"), [
      {
        key: "missing",
        name: "missing",
        description: "",
        targetCategory: "nope",
        sourceField: "fk",
        targetField: "id",
        cardinality: "one",
      },
    ]);

    const manager = await createManager();
    const report = manager.getValidationReport("alpha");
    expect(report.status).toBe("fail");
    const messages = report.issues.map((i: any) => i.message || "");
    expect(messages.join("\n")).toMatch(/references missing category 'nope'/i);
  });

  it("flags unmatched target record values", async () => {
    const betaDir = await prepareCategory(dataRoot, "beta", "Beta");
    await writeJson(path.join(betaDir, "records.json"), [{ id: "b1" }]);
    await writeJson(path.join(betaDir, "relationships.json"), [
      // No outbound relationships required for beta
      {
        key: "noop",
        name: "noop",
        description: "",
        targetCategory: "beta",
        sourceField: "id",
        targetField: "id",
        cardinality: "one",
      },
    ]);

    const gammaDir = await prepareCategory(dataRoot, "gamma", "Gamma");
    await writeJson(path.join(gammaDir, "records.json"), [
      { id: "g1", fk: "b-does-not-exist" },
    ]);
    await writeJson(path.join(gammaDir, "relationships.json"), [
      {
        key: "betaLink",
        name: "betaLink",
        description: "",
        targetCategory: "beta",
        sourceField: "fk",
        targetField: "id",
        cardinality: "one",
      },
    ]);

    const manager = await createManager();
    const report = manager.getValidationReport("gamma");
    expect(report.status).toBe("fail");
    const messages = report.issues.map((i: any) => i.message || "");
    expect(messages.join("\n")).toMatch(/does not match any 'beta\.id'/i);
  });
});
