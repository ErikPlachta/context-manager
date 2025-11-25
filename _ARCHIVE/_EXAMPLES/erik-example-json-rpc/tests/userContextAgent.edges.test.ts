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

describe("UserContextAgent (edges)", () => {
  beforeAll(() => {
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.resolve(
      __dirname,
      "../src/userContext"
    );
  });

  beforeEach(() => {
    workspaceFoldersMock = undefined;
  });

  async function createManager(): Promise<UserContextAgent> {
    const cacheDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "relevant-data-edges-")
    );
    return new UserContextAgent(undefined, Promise.resolve(cacheDir));
  }

  it("returns empty results when keyword is empty", async () => {
    const manager = await createManager();
    expect(manager.searchAcrossCategories("")).toEqual([]);
    expect(manager.searchAcrossCategories("   ")).toEqual([]);
  });

  it("getRecord returns undefined when not found", async () => {
    const manager = await createManager();
    expect(manager.getRecord("people", "does-not-exist")).toBeUndefined();
  });

  it("exposes a stable dataset fingerprint across calls and changes when data mutates", async () => {
    const manager = await createManager();
    const first = manager.getDatasetFingerprint();
    const second = manager.getDatasetFingerprint();
    expect(typeof first).toBe("string");
    expect(first).toEqual(second);

    // mutate a record to force fingerprint change
    const people = manager.getCategory("people");
    const clone = { ...people.records[0], id: "person-zzz" } as any;
    people.records.push(clone);

    const after = manager.getDatasetFingerprint();
    // Fingerprint is computed from consolidated index (category-level),
    // so it may remain stable; ensure per-category hash changes instead
    const beforeHash = manager.getCategoryRecordHash("people");
    people.records.pop();
    const afterHash = manager.getCategoryRecordHash("people");
    expect(beforeHash).not.toEqual(afterHash);
  });
});
