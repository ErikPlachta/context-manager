import { describe, it, expect } from "@jest/globals";

// Shared userContext validation helpers (migrated from types runtime)
import {
  validateCategoryConfigImpl as validateCategoryConfig,
  validateCategoryRecordImpl as validateCategoryRecord,
  validateRelationshipDefinitionImpl as validateRelationshipDefinition,
  formatValidationErrorsImpl as formatValidationErrors,
} from "../src/shared/validation/categoryValidation";
import type { ValidationError as UCValidationError } from "../src/types/userContext.types";

// Shared config validation helpers (migrated from types runtime)
import {
  validateAgentConfig,
  validateCompatibility,
  generateValidationReport,
} from "../src/shared/validation/configValidation";

import { CONFIG_IDS, validateConfig } from "../src/types/configRegistry";

describe("Validation Parity – shared category validation", () => {
  it("validateCategoryConfig: rejects non-object with informative error", () => {
    const res = validateCategoryConfig(null as unknown);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    // Root error
    expect(res.errors[0].message.toLowerCase()).toContain("must be an object");
  });

  it("validateCategoryConfig: reports missing top-level fields for empty object", () => {
    const res = validateCategoryConfig({});
    expect(res.valid).toBe(false);
    // Should include at least these paths
    const paths = new Set(res.errors.map((e: UCValidationError) => e.path));
    ["id", "name", "description", "aliases", "config"].forEach((p) =>
      expect(paths.has(p)).toBe(true)
    );
  });

  it("validateCategoryRecord: requires id and name/title", () => {
    const res = validateCategoryRecord({});
    expect(res.valid).toBe(false);
    const paths = new Set(res.errors.map((e: UCValidationError) => e.path));
    expect(paths.has("id")).toBe(true);
    expect(
      res.errors.some((e: UCValidationError) => e.path === "name/title")
    ).toBe(true);
  });

  it("validateRelationshipDefinition: reports required fields for empty object", () => {
    const res = validateRelationshipDefinition({});
    expect(res.valid).toBe(false);
    const paths = new Set(res.errors.map((e: UCValidationError) => e.path));
    ["from", "to", "type", "fields", "description"].forEach((p) =>
      expect(paths.has(p)).toBe(true)
    );
  });

  it("formatValidationErrors: formats up to N errors including paths", () => {
    const errors: UCValidationError[] = [
      { path: "id", message: "Missing or invalid id", expected: "string" },
      { path: "config.purpose", message: "Missing", expected: "string" },
    ];
    const msg = formatValidationErrors(errors, 2);
    expect(msg).toContain("id: Missing or invalid id");
    expect(msg).toContain("config.purpose: Missing");
  });
});

describe("Validation Parity – shared config validation", () => {
  it("validateAgentConfig: rejects non-object with $root type error", () => {
    const res = validateAgentConfig(42 as unknown);
    expect(res.isValid).toBe(false);
    expect(res.errors[0].path).toBe("$root");
  });

  it("validateAgentConfig: reports missing $configId", () => {
    const res = validateAgentConfig({});
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "$configId")).toBe(true);
  });

  it("validateAgentConfig: accepts minimal valid DATA_AGENT config", () => {
    const cfg = {
      $configId: CONFIG_IDS.DATA_AGENT,
      agent: {
        id: "data-agent",
        name: "Data Agent",
        version: "1.2.3",
        description: "Parses and enriches data",
      },
    } as const;
    const res = validateAgentConfig(cfg);
    expect(res.errors).toHaveLength(0);
    expect(res.isValid).toBe(true);
    // Ensure report renders without throwing
    const report = generateValidationReport(res);
    expect(typeof report).toBe("string");
  });

  it("validateCompatibility: requires $configId on both configs", () => {
    const res = validateCompatibility({} as any, {} as any);
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.path === "$configId")).toBe(true);
  });

  it("validateCompatibility: compatible when same agent type and major version", () => {
    const c1 = { $configId: CONFIG_IDS.DATA_AGENT } as any;
    const c2 = { $configId: CONFIG_IDS.DATA_AGENT } as any;
    const res = validateCompatibility(c1, c2);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("validateCompatibility: incompatible across different agent types", () => {
    const c1 = { $configId: CONFIG_IDS.ORCHESTRATOR } as any;
    const c2 = { $configId: CONFIG_IDS.DATA_AGENT } as any;
    const res = validateCompatibility(c1, c2);
    expect(res.isValid).toBe(false);
  });
});

describe("Validation Parity – configRegistry helper", () => {
  it("validateConfig: false for missing/invalid id; true for known id", () => {
    expect(validateConfig({})).toBe(false);
    expect(validateConfig({ $configId: "not.a.real.id" })).toBe(false);
    expect(validateConfig({ $configId: CONFIG_IDS.ORCHESTRATOR })).toBe(true);
  });
});
