import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("@extension/mcpCache", () => ({
  readSharedCacheEntry: jest.fn(),
  storeSharedCacheEntry: jest.fn(),
  deleteSharedCacheEntry: jest.fn(),
}));

import { DatabaseAgent, DataSource } from "../src/agent/databaseAgent";
const mcpCacheMock = jest.requireMock("@extension/mcpCache") as {
  readSharedCacheEntry: jest.Mock;
  storeSharedCacheEntry: jest.Mock;
  deleteSharedCacheEntry: jest.Mock;
};

const mockedRead = mcpCacheMock.readSharedCacheEntry as jest.Mock;
const mockedStore = mcpCacheMock.storeSharedCacheEntry as jest.Mock;

describe("DatabaseAgent cache error branches", () => {
  async function createAgent(): Promise<{
    agent: DatabaseAgent;
    cacheDir: string;
  }> {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "db-cache-errs-"));
    const dataSource: DataSource = {
      id: "employees",
      name: "Employees",
      records: [
        { id: "1", dept: "eng" },
        { id: "2", dept: "ops" },
      ],
    };
    const agent = new DatabaseAgent([dataSource], Promise.resolve(cacheDir));
    return { agent, cacheDir };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null on cache read error and proceeds", async () => {
    const { agent } = await createAgent();
    mockedRead.mockRejectedValueOnce(new Error("fs read error"));
    const results = await agent.executeQuery("employees", { dept: "eng" });
    expect(results.map((r) => r.id)).toEqual(["1"]);
  });

  it("swallows cache write errors and does not throw", async () => {
    const { agent } = await createAgent();
    mockedRead.mockResolvedValueOnce(undefined);
    mockedStore.mockRejectedValueOnce(new Error("disk full"));
    const results = await agent.executeQuery("employees", { dept: "ops" });
    expect(results.map((r) => r.id)).toEqual(["2"]);
  });

  it("respects useCache=false and avoids creating shared cache files", async () => {
    const { agent, cacheDir } = await createAgent();
    await agent.executeQuery("employees", { dept: "eng" }, { useCache: false });
    const sharedDir = path.join(cacheDir, "shared");
    const files = await fs.readdir(sharedDir).catch(() => []);
    expect(files.length).toBe(0);
  });
});
