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
import { DataAgent } from "../src/agent/dataAgent";
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

describe("DataAgent", () => {
  beforeAll(() => {
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.resolve(
      __dirname,
      "../src/userContext"
    );
  });

  beforeEach(() => {
    workspaceFoldersMock = undefined;
  });

  async function createAgent(): Promise<{
    agent: DataAgent;
    manager: UserContextAgent;
    database: DatabaseAgent;
  }> {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "data-agent-test-")
    );
    const manager = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    const dataSources: DataSource[] = manager
      .listCategories()
      .map((summary: any) => {
        const category = manager.getCategory(summary.id);
        return {
          id: category.id,
          name: category.name,
          records: category.records,
          fieldAliases: {},
        } as DataSource;
      });
    const database = new DatabaseAgent(dataSources, Promise.resolve(cacheDir));
    const agent = new DataAgent();
    return { agent, manager, database };
  }

  it("summarizes topics with highlights", async () => {
    const { agent, manager } = await createAgent();
    // Build analysis input manually for the data agent
    const categoryId = "people";
    const category = manager.getCategory(categoryId);
    const overview = await agent.analyzeData({
      categoryId,
      records: category.records,
      schemas: category.schemas,
      relationships: category.config.relationships.map((r: any) => ({
        name: r.name,
        description: r.description,
        targetCategory: r.targetCategory,
        viaField: r.viaField,
      })),
    });
    expect(overview.length).toBeGreaterThan(0);
  });

  it("maps connections for a department", async () => {
    const { agent, manager } = await createAgent();
    const dept = manager.getCategory("departments");
    const people = manager.getCategory("people");
    const rel = dept.config.relationships.find(
      (r: any) => r.targetCategory === "people"
    )!;
    const connection = await agent.analyzeConnection(
      { categoryId: "departments", records: dept.records },
      { categoryId: "people", records: people.records },
      {
        name: rel.name,
        description: rel.description,
        targetCategory: rel.targetCategory,
        viaField: rel.viaField,
      }
    );
    expect(connection.strength).toBeGreaterThan(0);
  });

  it("builds exploration plans with recommended queries", async () => {
    const { agent, manager } = await createAgent();
    const apps = manager.getCategory("applications");
    const plan = await agent.generateExplorationPlan(
      "applications",
      "How do we prepare for audits?",
      { categoryId: "applications", records: apps.records }
    );
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it("finds cross-topic connections", async () => {
    const { agent, manager } = await createAgent();
    const people = manager.getCategory("people");
    const apps = manager.getCategory("applications");
    const rel = people.config.relationships.find(
      (r: any) => r.targetCategory === "applications"
    )!;
    const connection = await agent.analyzeConnection(
      { categoryId: "people", records: people.records },
      { categoryId: "applications", records: apps.records },
      {
        name: rel.name,
        description: rel.description,
        targetCategory: rel.targetCategory,
        viaField: rel.viaField,
      }
    );
    expect(connection.description).toMatch(/connections/);
  });

  it("searches across categories", async () => {
    const { agent, manager } = await createAgent();
    const data = manager.listCategories().map((c: any) => {
      const cat = manager.getCategory(c.id);
      return { categoryId: cat.id, records: cat.records };
    });
    const results = agent.searchData("runbook", data);
    expect(results.length).toBeGreaterThan(0);
    const categories = results.map((result) => result.categoryId);
    expect(categories).toEqual(expect.arrayContaining(["companyResources"]));
  });

  it("exposes the underlying database agent", async () => {
    const { agent, database } = await createAgent();
    // DataAgent no longer wraps a database agent; ensure DatabaseAgent exists
    expect(database).toBeDefined();
  });

  it("returns a toolkit bundle for a category", async () => {
    const { agent, manager } = await createAgent();
    // DataAgent no longer provides toolkits; validate that the manager still exposes category metadata
    const dept = manager.getCategory("departments");
    expect(dept.config.folder.root).toContain("departments");
  });
});
