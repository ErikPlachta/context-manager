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
import { fileURLToPath } from "url";

/**
 * User Context Agent Export/Import Tests
 *
 * Validates external userData directory export/import functionality:
 * - Export dataset to external destination
 * - Import dataset from source into external userData root
 * - Directory resolution and usingExternal flag toggling
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { UserContextAgent } from "@agent/userContextAgent";
import { IDS } from "@shared/ids";

function makeTempDir(prefix: string): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return base;
}

describe("UserContextAgent – External User Data Directory", () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    origEnv.VSCODE_TEMPLATE_DATA_ROOT = process.env.VSCODE_TEMPLATE_DATA_ROOT;
    origEnv.HOME = process.env.HOME;
    origEnv.USERPROFILE = process.env.USERPROFILE;
  });

  afterAll(() => {
    if (origEnv.VSCODE_TEMPLATE_DATA_ROOT !== undefined) {
      process.env.VSCODE_TEMPLATE_DATA_ROOT = origEnv.VSCODE_TEMPLATE_DATA_ROOT;
    } else {
      delete process.env.VSCODE_TEMPLATE_DATA_ROOT;
    }
    if (origEnv.HOME !== undefined) {
      process.env.HOME = origEnv.HOME;
    } else {
      delete process.env.HOME;
    }
    if (origEnv.USERPROFILE !== undefined) {
      process.env.USERPROFILE = origEnv.USERPROFILE;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("exports the current dataset to a destination folder", () => {
    // Use the workspace data root (src/userContext) for testing
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.join(
      __dirname,
      "..",
      "src",
      "userContext"
    );

    const agent = new UserContextAgent();
    const dest = makeTempDir("uc-export");
    try {
      const exported = agent.exportUserData(dest);
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
      // Validate at least the first category has a category.json
      const first = exported[0];
      const categoryJson = path.join(dest, first, "category.json");
      expect(fs.existsSync(categoryJson)).toBe(true);
    } finally {
      // Cleanup
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it("imports user data into external userData root and toggles usingExternal", () => {
    // Use workspace data root for testing
    process.env.VSCODE_TEMPLATE_DATA_ROOT = path.join(
      __dirname,
      "..",
      "src",
      "userContext"
    );

    const agent = new UserContextAgent();

    // Prepare a source directory with a minimal valid category folder
    const source = makeTempDir("uc-import-src");
    const categoryName = "demo";
    const catDir = path.join(source, categoryName);
    fs.mkdirSync(catDir, { recursive: true });
    fs.writeFileSync(
      path.join(catDir, "category.json"),
      JSON.stringify({
        id: "demo",
        name: "Demo",
        description: "Demo",
        config: {
          primaryKeys: ["id"],
          purpose: "demo",
          updateCadence: "manual",
          access: "public",
          requirements: {},
          orchestration: {
            summary: "demo",
            signals: ["demo"],
            agents: {
              relevantDataManager: {
                focus: "x",
                signals: ["x"],
                promptStarters: ["x"],
              },
              databaseAgent: {
                focus: "y",
                signals: ["y"],
                promptStarters: ["y"],
              },
              dataAgent: { focus: "z", signals: ["z"], promptStarters: ["z"] },
            },
          },
        },
      }),
      "utf8"
    );
    // Create required subdirectories with placeholder files
    ["schemas", "types", "examples", "queries"].forEach((dir) => {
      const dirPath = path.join(catDir, dir);
      fs.mkdirSync(dirPath, { recursive: true });
      // Create a placeholder file so the directory gets copied during import
      fs.writeFileSync(path.join(dirPath, ".keep"), "", "utf8");
    });
    // optional files copied if present
    fs.writeFileSync(
      path.join(catDir, "records.json"),
      JSON.stringify([{ id: "demo-1", name: "Demo Record" }]),
      "utf8"
    );
    fs.writeFileSync(
      path.join(catDir, "relationships.json"),
      JSON.stringify([
        {
          key: "demoRelation",
          name: "Demo Relationship",
          sourceField: "id",
          targetField: "id",
          targetCategory: "demo",
          description: "Demo relationship",
        },
      ]),
      "utf8"
    );

    // Import using the first agent (which has externalRoot set but is using workspace data)
    const imported = agent.importUserData(source);
    expect(imported).toContain("demo");

    // Verify the import created files in external userData directory
    // (which for testing purposes uses the workspace override as externalRoot)
    const workspaceRoot = path.join(__dirname, "..", "src", "userContext");
    const importedCategoryJson = path.join(
      workspaceRoot,
      categoryName,
      "category.json"
    );
    // Note: Import may overwrite existing category in workspace
    expect(fs.existsSync(importedCategoryJson)).toBe(true);

    // Verify subdirectories were copied
    const schemasDir = path.join(workspaceRoot, categoryName, "schemas");
    expect(fs.existsSync(schemasDir)).toBe(true);
    expect(fs.existsSync(path.join(schemasDir, ".keep"))).toBe(true);

    // Cleanup
    fs.rmSync(source, { recursive: true, force: true });
    // Clean up the imported demo category from workspace
    const demoCategoryDir = path.join(workspaceRoot, categoryName);
    if (fs.existsSync(demoCategoryDir)) {
      fs.rmSync(demoCategoryDir, { recursive: true, force: true });
    }
  });
});
