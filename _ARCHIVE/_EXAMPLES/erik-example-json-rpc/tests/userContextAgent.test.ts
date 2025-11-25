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
import * as fsSync from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  createUserContextAgent,
  UserContextAgent,
  UnknownCategoryError,
} from "../src/agent/userContextAgent";

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

describe("UserContextAgent", () => {
  beforeAll(() => {
    // Ensure the agent reads datasets from the new userContext directory
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.resolve(
      __dirname,
      "../src/userContext"
    );
  });

  beforeEach(() => {
    workspaceFoldersMock = undefined;
  });

  async function createManager(): Promise<{
    manager: UserContextAgent;
    cacheDir: string;
  }> {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "relevant-data-manager-test-")
    );
    const manager = new UserContextAgent(undefined, Promise.resolve(cacheDir));
    return { manager, cacheDir };
  }

  it("lists categories and resolves aliases", async () => {
    const { manager } = await createManager();
    const categories = manager.listCategories();
    const catalogue = manager.getDatasetCatalog();
    expect(categories).toHaveLength(catalogue.length);
    const departments = manager.getCategory("dept");
    expect(departments.name).toBe("Departments");
  });

  it("produces cached snapshots", async () => {
    const { manager, cacheDir } = await createManager();
    const snapshot = await manager.getOrCreateSnapshot("departments");
    expect(snapshot.recordCount).toBeGreaterThan(0);

    const cachedSnapshot = await manager.getOrCreateSnapshot("departments");
    expect(cachedSnapshot.recordCount).toEqual(snapshot.recordCount);

    const expectedCacheFile = path.join(
      cacheDir,
      "shared",
      "relevant-data_departments_snapshot.json"
    );
    const cacheExists = await fs
      .stat(expectedCacheFile)
      .then(() => true)
      .catch(() => false);
    expect(cacheExists).toBe(true);
  });

  it("refreshes snapshots when record hashes change", async () => {
    const { manager, cacheDir } = await createManager();
    const snapshot = await manager.getOrCreateSnapshot("people");
    const cachePath = path.join(
      cacheDir,
      "shared",
      "relevant-data_people_snapshot.json"
    );
    const initialEntry = JSON.parse(await fs.readFile(cachePath, "utf8"));

    const category = manager.getCategory("people");
    const clone = { ...category.records[0], id: "person-temp" };
    category.records.push(clone);

    const refreshed = await manager.getOrCreateSnapshot("people");
    expect(refreshed.recordCount).toBe(snapshot.recordCount + 1);
    const updatedEntry = JSON.parse(await fs.readFile(cachePath, "utf8"));
    expect(updatedEntry.metadata?.recordHash).not.toEqual(
      initialEntry.metadata.recordHash
    );
  });

  it("persists a consolidated catalog cache (new key with legacy fallback)", async () => {
    const { manager, cacheDir } = await createManager();
    const catalogPathNew = path.join(
      cacheDir,
      "shared",
      "relevant-data_catalog.json"
    );
    const catalogPathLegacy = path.join(
      cacheDir,
      "shared",
      "relevant-data_catalogue.json"
    );
    // Poll for the appearance of either new or legacy catalog cache file.
    let existingPath: string | undefined;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidates = [catalogPathNew, catalogPathLegacy];
      existingPath = candidates.find((p) => fsSync.existsSync(p));
      if (existingPath) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!existingPath) {
      const sharedDir = path.join(cacheDir, "shared");
      if (fsSync.existsSync(sharedDir)) {
        const files = fsSync.readdirSync(sharedDir);
        throw new Error(
          `Catalog cache file not created. Shared dir contents: ${files.join(
            ", "
          )}`
        );
      }
      throw new Error("Catalog cache file not created (shared dir missing)");
    }
    const raw = await fs.readFile(existingPath, "utf8");
    const entry = JSON.parse(raw);
    expect(entry.value).toBeInstanceOf(Array);
    expect(entry.value[0]).toHaveProperty("id");
    expect(entry.metadata?.fingerprint).toBeDefined();
    const datasetIds = manager.getDatasetCatalog().map((item) => item.id);
    expect(entry.value.map((item: { id: string }) => item.id)).toEqual(
      datasetIds
    );
  });

  it("resolves entity connections", async () => {
    const { manager } = await createManager();
    const connections = manager.getEntityConnections("people", "person-001");
    const relationshipNames = connections.connections.map(
      (entry) => entry.relationship
    );
    expect(relationshipNames).toEqual(
      expect.arrayContaining(["department", "applications", "policies"])
    );

    const departmentConnection = connections.connections.find(
      (entry) => entry.relationship === "department"
    );
    expect(departmentConnection?.records[0].id).toBe("dept-analytics");
  });

  it("searches across categories", async () => {
    const { manager } = await createManager();
    const matches = manager.searchAcrossCategories("analytics");
    expect(matches.length).toBeGreaterThan(0);
    const categories = matches.map((match) => match.categoryId);
    expect(categories).toEqual(
      expect.arrayContaining(["departments", "people", "companyResources"])
    );
  });

  it("provides type definitions and validation reports", async () => {
    const { manager } = await createManager();
    const types = manager.getTypeDefinitions("applications");
    expect(types.length).toBeGreaterThan(0);
    const report = manager.getValidationReport("applications");
    expect(report.status).toBe("pass");
    expect(Array.isArray(report.issues)).toBe(true);
  });

  it("surfaces orchestration guidance for each category", async () => {
    const { manager } = await createManager();
    const config = manager.getCategoryConfig("applications");
    // Ensure non-empty summary and presence of orchestration metadata
    expect(typeof config.orchestration.summary).toBe("string");
    expect(config.orchestration.summary.length).toBeGreaterThan(10);
    expect(config.orchestration.signals.length).toBeGreaterThan(0);
    expect(
      config.orchestration.agents.databaseAgent.promptStarters.length
    ).toBeGreaterThan(0);
  });

  it("throws when an unknown topic is requested", async () => {
    const { manager } = await createManager();
    expect(() => manager.getCategory("unknown")).toThrow(UnknownCategoryError);
  });

  it("creates default manager via factory", () => {
    const manager = createUserContextAgent();
    expect(manager.listCategories().length).toBeGreaterThan(0);
  });
});
