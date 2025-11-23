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

/**
 * @file Comprehensive tests for TypeScript type guard validation functions
 * Tests validation logic for CategoryConfig, CategoryRecord, and RelationshipDefinition
 */

import {
  type ValidationError,
  type ValidationResult,
  type CategoryConfig,
  type CategoryRecord,
  type RelationshipDefinition,
} from "@internal-types/userContext.types";
import {
  validateCategoryConfigImpl as validateCategoryConfig,
  validateCategoryRecordImpl as validateCategoryRecord,
  validateRelationshipDefinitionImpl as validateRelationshipDefinition,
  formatValidationErrorsImpl as formatValidationErrors,
} from "../src/shared/validation/categoryValidation";

describe("Type Guard Validation Functions", () => {
  describe("validateCategoryConfig", () => {
    const validConfig: CategoryConfig = {
      id: "test-category",
      name: "Test Category",
      description: "A test category",
      aliases: ["test"],
      config: {
        purpose: "Testing purposes",
        primaryKeys: ["id"],
        updateCadence: "daily",
        access: "public",
        orchestration: {
          summary: "Test summary",
          signals: ["keyword1"],
          agents: {
            agent1: {
              focus: "Test focus",
              signals: ["signal1"],
              promptStarters: ["prompt1"],
            },
          },
        },
      },
    };

    it("should validate a complete valid CategoryConfig", () => {
      const result = validateCategoryConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null or undefined", () => {
      const resultNull = validateCategoryConfig(null);
      expect(resultNull.valid).toBe(false);
      expect(resultNull.errors[0].path).toBe("");
      expect(resultNull.errors[0].message).toContain("object");

      const resultUndefined = validateCategoryConfig(undefined);
      expect(resultUndefined.valid).toBe(false);
      expect(resultUndefined.errors[0].path).toBe("");
    });

    it("should reject non-object types", () => {
      const result = validateCategoryConfig("not an object");
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe("");
      expect(result.errors[0].message).toContain("object");
      expect(result.errors[0].actual).toBe("string");
    });

    it("should reject missing required id field", () => {
      const invalid = { ...validConfig };
      delete (invalid as Partial<CategoryConfig>).id;
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "id")).toBe(true);
    });

    it("should reject missing required name field", () => {
      const invalid = { ...validConfig };
      delete (invalid as Partial<CategoryConfig>).name;
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "name")).toBe(true);
    });

    it("should reject missing required description field", () => {
      const invalid = { ...validConfig };
      delete (invalid as Partial<CategoryConfig>).description;
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "description")).toBe(true);
    });

    it("should reject missing required aliases field", () => {
      const invalid = { ...validConfig };
      delete (invalid as Partial<CategoryConfig>).aliases;
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "aliases")).toBe(true);
    });

    it("should reject aliases that is not an array", () => {
      const invalid = { ...validConfig, aliases: "not-an-array" };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "aliases")).toBe(true);
    });

    it("should reject missing config object", () => {
      const invalid = { ...validConfig };
      delete (invalid as Partial<CategoryConfig>).config;
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config")).toBe(true);
    });

    it("should reject config object missing purpose", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          purpose: undefined as unknown as string,
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config.purpose")).toBe(true);
    });

    it("should reject config object missing primaryKeys", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          primaryKeys: undefined as unknown as string[],
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config.primaryKeys")).toBe(
        true
      );
    });

    it("should reject config object missing updateCadence", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          updateCadence: undefined as unknown as string,
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config.updateCadence")).toBe(
        true
      );
    });

    it("should reject config object missing access", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          access: undefined as unknown as string,
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config.access")).toBe(true);
    });

    it("should reject config object missing orchestration", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          orchestration:
            undefined as unknown as CategoryConfig["config"]["orchestration"],
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "config.orchestration")).toBe(
        true
      );
    });

    it("should reject orchestration missing summary", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          orchestration: {
            ...validConfig.config.orchestration,
            summary: undefined as unknown as string,
          },
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === "config.orchestration.summary")
      ).toBe(true);
    });

    it("should reject orchestration missing signals", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          orchestration: {
            ...validConfig.config.orchestration,
            signals: undefined as unknown as string[],
          },
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === "config.orchestration.signals")
      ).toBe(true);
    });

    it("should reject orchestration missing agents", () => {
      const invalid = {
        ...validConfig,
        config: {
          ...validConfig.config,
          orchestration: {
            ...validConfig.config.orchestration,
            agents: undefined as unknown as string[],
          },
        },
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.path === "config.orchestration.agents")
      ).toBe(true);
    });

    it("should accumulate multiple validation errors", () => {
      const invalid = {
        name: "Only Name",
        // Missing: id, description, aliases, config
      };
      const result = validateCategoryConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe("validateCategoryRecord", () => {
    it("should validate a record with id and name", () => {
      const record: CategoryRecord = { id: "rec-1", name: "Test Record" };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate a record with id and title", () => {
      const record: CategoryRecord = { id: "rec-1", title: "Test Title" };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate a record with id, name, and title", () => {
      const record: CategoryRecord = {
        id: "rec-1",
        name: "Name",
        title: "Title",
      };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate a record with additional fields", () => {
      const record = {
        id: "rec-1",
        name: "Test",
        customField: "value",
        nested: { data: 123 },
      };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null or undefined", () => {
      const resultNull = validateCategoryRecord(null);
      expect(resultNull.valid).toBe(false);
      expect(resultNull.errors[0].path).toBe("");

      const resultUndefined = validateCategoryRecord(undefined);
      expect(resultUndefined.valid).toBe(false);
      expect(resultUndefined.errors[0].path).toBe("");
    });

    it("should reject non-object types", () => {
      const result = validateCategoryRecord("not-an-object");
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe("");
      expect(result.errors[0].actual).toBe("string");
    });

    it("should reject record missing id field", () => {
      const record = { name: "No ID" };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "id")).toBe(true);
    });

    it("should reject record with non-string id", () => {
      const record = { id: 123, name: "Test" };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "id")).toBe(true);
    });

    it("should reject record missing both name and title", () => {
      const record = { id: "rec-1" };
      const result = validateCategoryRecord(record);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "name/title")).toBe(true);
    });
  });

  describe("validateRelationshipDefinition", () => {
    const validRelationship: RelationshipDefinition = {
      from: "category-a",
      to: "category-b",
      type: "belongs-to",
      description: "Test relationship",
      fields: {
        source: "foreign_key",
        target: "id",
      },
    };

    it("should validate a complete valid RelationshipDefinition", () => {
      const result = validateRelationshipDefinition(validRelationship);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate with optional required field", () => {
      const withRequired: RelationshipDefinition = {
        ...validRelationship,
        required: true,
      };
      const result = validateRelationshipDefinition(withRequired);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null or undefined", () => {
      const resultNull = validateRelationshipDefinition(null);
      expect(resultNull.valid).toBe(false);
      expect(resultNull.errors[0].path).toBe("");

      const resultUndefined = validateRelationshipDefinition(undefined);
      expect(resultUndefined.valid).toBe(false);
      expect(resultUndefined.errors[0].path).toBe("");
    });

    it("should reject non-object types", () => {
      const result = validateRelationshipDefinition(42);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe("");
      expect(result.errors[0].actual).toBe("number");
    });

    it("should reject missing from field", () => {
      const invalid = { ...validRelationship };
      delete (invalid as Partial<RelationshipDefinition>).from;
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "from")).toBe(true);
    });

    it("should reject missing to field", () => {
      const invalid = { ...validRelationship };
      delete (invalid as Partial<RelationshipDefinition>).to;
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "to")).toBe(true);
    });

    it("should reject missing type field", () => {
      const invalid = { ...validRelationship };
      delete (invalid as Partial<RelationshipDefinition>).type;
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "type")).toBe(true);
    });

    it("should reject missing description field", () => {
      const invalid = { ...validRelationship };
      delete (invalid as Partial<RelationshipDefinition>).description;
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "description")).toBe(true);
    });

    it("should reject missing fields object", () => {
      const invalid = { ...validRelationship };
      delete (invalid as Partial<RelationshipDefinition>).fields;
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "fields")).toBe(true);
    });

    it("should reject fields missing source", () => {
      const invalid = {
        ...validRelationship,
        fields: { target: "id" },
      };
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "fields.source")).toBe(true);
    });

    it("should reject fields missing target", () => {
      const invalid = {
        ...validRelationship,
        fields: { source: "fk" },
      };
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path === "fields.target")).toBe(true);
    });

    it("should accumulate multiple validation errors", () => {
      const invalid = {
        from: "category-a",
        // Missing: to, type, description, fields
      };
      const result = validateRelationshipDefinition(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("formatValidationErrors", () => {
    it("should format single error", () => {
      const errors: ValidationError[] = [
        {
          path: "field",
          message: "Field is required",
          expected: "string",
          actual: "undefined",
        },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain("field");
      expect(formatted).toContain("Field is required");
    });

    it("should format multiple errors with default limit of 3", () => {
      const errors: ValidationError[] = [
        {
          path: "field1",
          message: "Error 1",
          expected: "string",
          actual: "number",
        },
        {
          path: "field2",
          message: "Error 2",
          expected: "string",
          actual: "number",
        },
        {
          path: "field3",
          message: "Error 3",
          expected: "string",
          actual: "number",
        },
        {
          path: "field4",
          message: "Error 4",
          expected: "string",
          actual: "number",
        },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain("field1");
      expect(formatted).toContain("field2");
      expect(formatted).toContain("field3");
      expect(formatted).not.toContain("field4"); // Only first 3 shown
    });

    it("should respect custom maxErrors parameter", () => {
      const errors: ValidationError[] = [
        {
          path: "field1",
          message: "Error 1",
          expected: "string",
          actual: "number",
        },
        {
          path: "field2",
          message: "Error 2",
          expected: "string",
          actual: "number",
        },
        {
          path: "field3",
          message: "Error 3",
          expected: "string",
          actual: "number",
        },
      ];
      const formatted = formatValidationErrors(errors, 1);
      expect(formatted).toContain("field1");
      expect(formatted).not.toContain("field2");
      expect(formatted).not.toContain("field3"); // Only first 1 shown
    });

    it("should handle empty errors array", () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe("");
    });

    it("should format errors with path-based structure", () => {
      const errors: ValidationError[] = [
        {
          path: "config.orchestration.summary",
          message: "Missing or invalid summary field",
          expected: "non-empty string",
          actual: "undefined",
        },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain("config.orchestration.summary");
      expect(formatted).toContain("Missing or invalid summary field");
    });

    it("should format error messages clearly", () => {
      const errors: ValidationError[] = [
        {
          path: "id",
          message: "Must be string",
          expected: "string",
          actual: "number",
        },
      ];
      const formatted = formatValidationErrors(errors);
      // Format is: "path: message"
      expect(formatted).toBe("id: Must be string");
    });
  });

  describe("ValidationResult type structure", () => {
    it("should have correct structure for valid result", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
      };
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it("should have correct structure for invalid result", () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            path: "test",
            message: "Test error",
            expected: "string",
            actual: "number",
          },
        ],
      };
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty("path");
      expect(result.errors[0]).toHaveProperty("message");
      expect(result.errors[0]).toHaveProperty("expected");
      expect(result.errors[0]).toHaveProperty("actual");
    });
  });
});
