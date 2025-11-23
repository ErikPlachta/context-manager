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
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { DatabaseAgent, DataSource } from "../src/agent/databaseAgent";
import { UserContextAgent } from "../src/agent/userContextAgent";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

describe("DatabaseAgent", () => {
  beforeAll(() => {
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.resolve(
      __dirname,
      "../src/userContext"
    );
  });

  beforeEach(() => {
    workspaceFoldersMock = undefined;
  });

  async function createAgents(): Promise<{
    manager: UserContextAgent;
    database: DatabaseAgent;
    cacheDir: string;
  }> {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "database-agent-test-")
    );
    const manager = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    // Adapt to new database agent signature: provide data sources explicitly
    const dataSources: DataSource[] = manager
      .listCategories()
      .map((summary: any) => {
        const category = manager.getCategory(summary.id);
        // Provide simple alias mapping for people skill filtering test and allow future extensions
        const fieldAliases = summary.id === "people" ? { skill: "skills" } : {};
        return {
          id: category.id,
          name: category.name,
          records: category.records,
          fieldAliases,
        } as DataSource;
      });
    const database = new DatabaseAgent(dataSources, Promise.resolve(cacheDir));
    return { manager, database, cacheDir };
  }

  it("initializes with all configured data sources", async () => {
    const { manager, database } = await createAgents();

    const categorySummaries = manager.listCategories();
    expect(categorySummaries.length).toBeGreaterThan(0);

    for (const summary of categorySummaries as any[]) {
      // Execute a no-op query per category to ensure it is wired as a data source.
      await expect(
        database.executeQuery(summary.id, {})
      ).resolves.toBeInstanceOf(Array);
    }
  });

  it("fails clearly when a required category is not wired as a data source", async () => {
    const { manager, cacheDir } = await createAgents();

    const allSummaries = manager.listCategories() as any[];
    const withoutPeople = allSummaries.filter((s) => s.id !== "people");

    const dataSourcesWithoutPeople: DataSource[] = withoutPeople.map(
      (summary) => {
        const category = manager.getCategory(summary.id);
        return {
          id: category.id,
          name: category.name,
          records: category.records,
          fieldAliases: {},
        };
      }
    );

    const database = new DatabaseAgent(
      dataSourcesWithoutPeople,
      Promise.resolve(cacheDir)
    );

    await expect(
      database.executeQuery("people", { skill: "python" })
    ).rejects.toThrow();
  });

  it("filters people by skill and application access", async () => {
    const { database } = await createAgents();
    const results = await database.executeQuery("people", {
      skill: "python",
      applicationIds: "app-aurora",
    });
    const ids = results.map((record) => record.id);
    expect(ids).toEqual(["person-001"]);
  });

  it("filters departments by related systems", async () => {
    const { database } = await createAgents();
    const results = await database.executeQuery("departments", {
      applicationIds: "app-foundry",
    });
    expect(results.map((record) => record.id)).toEqual(["dept-platform"]);
  });

  it("runs saved queries with caching", async () => {
    const { database, cacheDir } = await createAgents();
    const sharedDir = path.join(cacheDir, "shared");
    const before = await fs.readdir(sharedDir).catch(() => []);

    const results = await database.executeQuery("applications", {
      criticality: "high",
    });
    expect(results.length).toBeGreaterThan(0);

    const after = await fs.readdir(sharedDir);
    expect(after.length).toBeGreaterThan(before.length);
  });

  it("retrieves policy coverage for a department", async () => {
    const { database } = await createAgents();
    const policies = await database.executeQuery("companyPolicies", {
      ownerDepartmentId: "dept-platform",
    });
    expect(policies.map((policy) => policy.id)).toEqual([
      "policy-platform-standards",
    ]);
  });

  it("retrieves resources bound to an application", async () => {
    const { database } = await createAgents();
    const resources = await database.executeQuery("companyResources", {
      applicationIds: "app-aurora",
    });
    const ids = resources.map((resource: any) => resource.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "resource-analytics-playbook",
        "resource-data-handbook",
      ])
    );
  });

  it("refreshes cached results when record hashes change", async () => {
    const { database, manager, cacheDir } = await createAgents();
    const sharedDir = path.join(cacheDir, "shared");

    await database.executeQuery("people", { departmentId: "dept-analytics" });
    const cacheFiles = await fs.readdir(sharedDir);
    expect(cacheFiles.length).toBeGreaterThan(0);
    const cachePath = path.join(sharedDir, cacheFiles[0]);
    const initialEntry = JSON.parse(await fs.readFile(cachePath, "utf8"));
    expect(initialEntry.metadata?.recordHash).toBeDefined();

    const category = manager.getCategory("people");
    const clone = { ...category.records[0], id: "person-temp" };
    category.records.push(clone);

    // Query again to update result set containing the new record
    await database.executeQuery("people", { departmentId: "dept-analytics" });
    const updatedEntry = JSON.parse(await fs.readFile(cachePath, "utf8"));
    // A changed record set should produce a different recordHash
    expect(updatedEntry.metadata?.recordHash).not.toEqual(
      initialEntry.metadata.recordHash
    );
  });
});
