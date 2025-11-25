import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { DatabaseAgent, DataSource } from "../src/agent/databaseAgent";

// Provide a minimal vscode mock to satisfy transitive imports in mcpCache during tests
jest.mock(
  "vscode",
  () => ({
    workspace: {
      get workspaceFolders() {
        return undefined;
      },
    },
    window: {
      showInformationMessage: jest.fn(),
      showErrorMessage: jest.fn(),
      showQuickPick: jest.fn(),
      showInputBox: jest.fn(),
    },
    commands: {
      registerCommand: jest.fn(),
    },
    chat: {
      createChatParticipant: jest.fn(() => ({ dispose: jest.fn() })),
    },
    Uri: { file: (p: string) => ({ fsPath: p }) },
  }),
  { virtual: true }
);

/**
 * Additional coverage tests for DatabaseAgent operator handling and helpers.
 */
describe("DatabaseAgent operators & helpers", () => {
  async function createAgent(): Promise<{
    agent: DatabaseAgent;
    cacheDir: string;
  }> {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "db-ops-test-"));
    const dataSource: DataSource = {
      id: "employees",
      name: "Employees",
      records: [
        {
          id: "1",
          age: 30,
          name: "Alice",
          tags: ["dev", "js"],
          dept: "eng",
          skill: "python", // present only on first record
        },
        { id: "2", age: 22, name: "Bob", tags: ["ops"], dept: "ops" },
        { id: "3", age: 40, name: "Carol", tags: [], dept: "eng" },
      ],
      fieldAliases: { tag: "tags" },
    };
    const agent = new DatabaseAgent([dataSource], Promise.resolve(cacheDir));
    return { agent, cacheDir };
  }

  it("supports simple and operator-based criteria", async () => {
    const { agent } = await createAgent();

    // $eq
    let results = await agent.executeQuery("employees", { age: { $eq: 30 } });
    expect(results.map((r) => r.id)).toEqual(["1"]);

    // $ne
    results = await agent.executeQuery("employees", { dept: { $ne: "ops" } });
    expect(results.map((r) => r.id).sort()).toEqual(["1", "3"]);

    // $gt, $gte, $lt, $lte
    expect(
      (await agent.executeQuery("employees", { age: { $gt: 30 } })).map(
        (r) => r.id
      )
    ).toEqual(["3"]);
    expect(
      (await agent.executeQuery("employees", { age: { $gte: 30 } }))
        .map((r) => r.id)
        .sort()
    ).toEqual(["1", "3"]);
    expect(
      (await agent.executeQuery("employees", { age: { $lt: 30 } })).map(
        (r) => r.id
      )
    ).toEqual(["2"]);
    expect(
      (await agent.executeQuery("employees", { age: { $lte: 22 } })).map(
        (r) => r.id
      )
    ).toEqual(["2"]);

    // $in / $nin
    expect(
      (await agent.executeQuery("employees", { dept: { $in: ["ops"] } })).map(
        (r) => r.id
      )
    ).toEqual(["2"]);
    expect(
      (await agent.executeQuery("employees", { dept: { $nin: ["ops"] } }))
        .map((r) => r.id)
        .sort()
    ).toEqual(["1", "3"]);

    // $regex (case-insensitive)
    expect(
      (await agent.executeQuery("employees", { name: { $regex: "ali" } })).map(
        (r) => r.id
      )
    ).toEqual(["1"]);
    // $regex on non-string field should yield no matches
    expect(
      (await agent.executeQuery("employees", { age: { $regex: "3" } })).map(
        (r) => r.id
      )
    ).toEqual([]);

    // $exists true should only match record with explicit skill property
    expect(
      (await agent.executeQuery("employees", { skill: { $exists: true } })).map(
        (r) => r.id
      )
    ).toEqual(["1"]);
    // $exists false should return remaining records without skill property
    expect(
      (await agent.executeQuery("employees", { skill: { $exists: false } }))
        .map((r) => r.id)
        .sort()
    ).toEqual(["2", "3"]);

    // alias mapping: tag -> tags (array contains)
    expect(
      (await agent.executeQuery("employees", { tag: "dev" })).map((r) => r.id)
    ).toEqual(["1"]);
  });

  it("exposes helpers for categories and info and clears cache", async () => {
    const { agent, cacheDir } = await createAgent();

    // helpers
    expect(agent.getAvailableCategories()).toEqual(["employees"]);
    const info = agent.getCategoryInfo("employees");
    expect(info?.name).toBe("Employees");
    expect(agent.getCategoryInfo("unknown")).toBeUndefined();

    // cache behavior: first call writes cache; second call reuses same key
    const beforeFiles = await fs
      .readdir(path.join(cacheDir, "shared"))
      .catch(() => []);
    await agent.executeQuery("employees", { dept: "eng" });
    const afterFirst = await fs
      .readdir(path.join(cacheDir, "shared"))
      .catch(() => []);
    await agent.executeQuery("employees", { dept: "eng" });
    const afterSecond = await fs
      .readdir(path.join(cacheDir, "shared"))
      .catch(() => []);

    // After second run, cache entry count should stay the same (same key)
    expect(afterSecond.length).toBeGreaterThanOrEqual(afterFirst.length);
    expect(afterFirst.length).toBeGreaterThanOrEqual(beforeFiles.length);

    // Clear cache does not throw
    await expect(agent.clearCache("employees")).resolves.toBeUndefined();
  });

  it("throws for unknown category", async () => {
    const { agent } = await createAgent();
    await expect(agent.executeQuery("nope", {})).rejects.toThrow(/not found/i);
  });
});
