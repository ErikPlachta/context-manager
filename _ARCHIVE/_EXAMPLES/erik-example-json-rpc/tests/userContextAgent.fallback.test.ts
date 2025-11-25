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
 * User Context Agent Phase 3.2 - Fallback Chain Resolution Tests
 *
 * Validates fallback resolution behavior during category loading:
 * - external userData → workspace → error
 * - Graceful degradation when user customizations are incomplete or corrupted
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { UserContextAgent } from "@agent/userContextAgent";
import {
  createValidCategoryJson,
  createValidRecordsJson,
  createValidRelationshipsJson,
} from "./helpers/categoryFixtures";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

describe("UserContextAgent Fallback Resolution", () => {
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

  describe("Corrupted category handling", () => {
    it("should skip corrupted category with warning and load valid ones", () => {
      const tempRoot = makeTempDir("uc-corrupted");
      process.env.VSCODE_TEMPLATE_DATA_ROOT = tempRoot;

      try {
        // Create one valid category
        const validDir = path.join(tempRoot, "valid");
        fs.mkdirSync(validDir, { recursive: true });
        fs.writeFileSync(
          path.join(validDir, "category.json"),
          JSON.stringify(
            createValidCategoryJson({
              id: "valid",
              name: "Valid Category",
              description: "Valid category for testing",
            }),
            null,
            2
          )
        );
        fs.writeFileSync(
          path.join(validDir, "records.json"),
          JSON.stringify(createValidRecordsJson("valid"), null, 2)
        );
        fs.writeFileSync(
          path.join(validDir, "relationships.json"),
          JSON.stringify(createValidRelationshipsJson(), null, 2)
        );

        ["schemas", "types", "examples", "queries"].forEach((dir) => {
          fs.mkdirSync(path.join(validDir, dir), { recursive: true });
        });

        // Create corrupted category with invalid JSON
        const corruptedDir = path.join(tempRoot, "corrupted");
        fs.mkdirSync(corruptedDir, { recursive: true });
        fs.writeFileSync(
          path.join(corruptedDir, "category.json"),
          "{ invalid json }"
        );

        const warnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const agent = new UserContextAgent();
        const categories = agent.listCategories();

        // Should load valid category
        expect(categories).toHaveLength(1);
        expect(categories[0].name).toBe("Valid Category");

        // Should warn about corrupted category
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Skipping category 'corrupted'")
        );

        warnSpy.mockRestore();
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });

    it("should throw error when all categories are invalid", () => {
      const tempRoot = makeTempDir("uc-all-invalid");
      process.env.VSCODE_TEMPLATE_DATA_ROOT = tempRoot;

      try {
        // Create only corrupted categories
        const corruptedDir = path.join(tempRoot, "corrupted");
        fs.mkdirSync(corruptedDir, { recursive: true });
        fs.writeFileSync(
          path.join(corruptedDir, "category.json"),
          "{ invalid }"
        );

        const warnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        expect(() => {
          new UserContextAgent();
        }).toThrow(/No valid categories could be loaded/);

        warnSpy.mockRestore();
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });
  });

  describe("Missing required files", () => {
    it("should throw error when category.json is missing required fields", () => {
      const tempRoot = makeTempDir("uc-missing-fields");
      process.env.VSCODE_TEMPLATE_DATA_ROOT = tempRoot;

      try {
        const incompleteDir = path.join(tempRoot, "incomplete");
        fs.mkdirSync(incompleteDir, { recursive: true });
        fs.writeFileSync(
          path.join(incompleteDir, "category.json"),
          JSON.stringify({
            id: "incomplete",
            // Missing required 'name' field
            description: "Incomplete category",
          })
        );

        const warnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        expect(() => {
          new UserContextAgent();
        }).toThrow(/No valid categories could be loaded/);

        warnSpy.mockRestore();
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });

    it("should skip category when records.json is missing", () => {
      const tempRoot = makeTempDir("uc-no-records");
      process.env.VSCODE_TEMPLATE_DATA_ROOT = tempRoot;

      try {
        // Create valid category
        const validDir = path.join(tempRoot, "valid");
        fs.mkdirSync(validDir, { recursive: true });
        fs.writeFileSync(
          path.join(validDir, "category.json"),
          JSON.stringify(
            createValidCategoryJson({ id: "valid", name: "Valid" }),
            null,
            2
          )
        );
        fs.writeFileSync(
          path.join(validDir, "records.json"),
          JSON.stringify(createValidRecordsJson("valid"), null, 2)
        );
        fs.writeFileSync(
          path.join(validDir, "relationships.json"),
          JSON.stringify(createValidRelationshipsJson(), null, 2)
        );
        ["schemas", "types", "examples", "queries"].forEach((dir) => {
          fs.mkdirSync(path.join(validDir, dir), { recursive: true });
        });

        // Create incomplete category (missing records.json)
        const noRecordsDir = path.join(tempRoot, "noRecords");
        fs.mkdirSync(noRecordsDir, { recursive: true });
        fs.writeFileSync(
          path.join(noRecordsDir, "category.json"),
          JSON.stringify(
            createValidCategoryJson({
              id: "noRecords",
              name: "No Records",
              description: "Missing records.json",
            }),
            null,
            2
          )
        );
        // Note: no records.json or relationships.json created

        const warnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const agent = new UserContextAgent();
        const categories = agent.listCategories();

        // Should load only valid category
        expect(categories).toHaveLength(1);
        expect(categories[0].name).toBe("Valid");

        // Should warn about missing files
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Skipping category 'noRecords'")
        );

        warnSpy.mockRestore();
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });
  });

  describe("Error reporting", () => {
    it("should log summary of load errors when some categories fail", () => {
      const tempRoot = makeTempDir("uc-load-errors");
      process.env.VSCODE_TEMPLATE_DATA_ROOT = tempRoot;

      try {
        // Valid category
        const validDir = path.join(tempRoot, "valid");
        fs.mkdirSync(validDir, { recursive: true });
        fs.writeFileSync(
          path.join(validDir, "category.json"),
          JSON.stringify(
            createValidCategoryJson({ id: "valid", name: "Valid" }),
            null,
            2
          )
        );
        fs.writeFileSync(
          path.join(validDir, "records.json"),
          JSON.stringify(createValidRecordsJson("valid"), null, 2)
        );
        fs.writeFileSync(
          path.join(validDir, "relationships.json"),
          JSON.stringify(createValidRelationshipsJson(), null, 2)
        );
        ["schemas", "types", "examples", "queries"].forEach((dir) => {
          fs.mkdirSync(path.join(validDir, dir), { recursive: true });
        });

        // Two corrupted categories
        ["broken1", "broken2"].forEach((name) => {
          const brokenDir = path.join(tempRoot, name);
          fs.mkdirSync(brokenDir, { recursive: true });
          fs.writeFileSync(
            path.join(brokenDir, "category.json"),
            "{ invalid }"
          );
        });

        const warnSpy = jest
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const agent = new UserContextAgent();
        const categories = agent.listCategories();

        expect(categories).toHaveLength(1);

        // Should log summary of errors
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Loaded 1 categories with 2 failures")
        );

        warnSpy.mockRestore();
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    });
  });

  describe("getActiveDataRoot diagnostic", () => {
    it("should report active data root paths", () => {
      // Use the workspace data root for testing
      process.env.VSCODE_TEMPLATE_DATA_ROOT = path.join(
        __dirname,
        "..",
        "src",
        "userContext"
      );

      const agent = new UserContextAgent();
      const roots = agent.getActiveDataRoot();

      expect(roots).toHaveProperty("active");
      expect(roots).toHaveProperty("external");
      expect(roots).toHaveProperty("usingExternal");
      expect(typeof roots.active).toBe("string");
      expect(typeof roots.external).toBe("string");
      expect(typeof roots.usingExternal).toBe("boolean");
    });
  });
});
