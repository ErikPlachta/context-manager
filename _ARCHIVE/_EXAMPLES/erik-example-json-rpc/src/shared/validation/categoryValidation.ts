/**
 * @packageDocumentation Category & Relationship validation runtime utilities.
 *
 * Extracted from `src/types/userContext.types.ts` (Phase 3 of Validation Runtime Extraction).
 * These functions provide runtime validation logic and will be the single
 * implementation source going forward. The `src/types/**` file now delegates
 * to these helpers to maintain types-only constraints.
 */

import type {
  ValidationResult,
  ValidationError,
} from "../../types/userContext.types";

/** Validate a CategoryConfig-like object. */
export function validateCategoryConfigImpl(obj: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!obj || typeof obj !== "object") {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: "Value must be an object",
          expected: "object",
          actual: typeof obj as any,
        },
      ],
    };
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.id !== "string") {
    errors.push({
      path: "id",
      message: "Missing or invalid id field",
      expected: "string",
      actual: typeof record.id,
    });
  }
  if (typeof record.name !== "string") {
    errors.push({
      path: "name",
      message: "Missing or invalid name field",
      expected: "string",
      actual: typeof record.name,
    });
  }
  if (typeof record.description !== "string") {
    errors.push({
      path: "description",
      message: "Missing or invalid description field",
      expected: "string",
      actual: typeof record.description,
    });
  }
  if (!Array.isArray(record.aliases)) {
    errors.push({
      path: "aliases",
      message: "Missing or invalid aliases field",
      expected: "string[]",
      actual: typeof record.aliases,
    });
  } else if (!record.aliases.every((a) => typeof a === "string")) {
    errors.push({
      path: "aliases",
      message: "All aliases must be strings",
      expected: "string[]",
      actual: "mixed types",
    });
  }
  if (!record.config || typeof record.config !== "object") {
    errors.push({
      path: "config",
      message: "Missing or invalid config field",
      expected: "object",
      actual: typeof record.config,
    });
    return { valid: false, errors };
  }
  const config = record.config as Record<string, unknown>;
  if (typeof config.purpose !== "string") {
    errors.push({
      path: "config.purpose",
      message: "Missing or invalid purpose field",
      expected: "string",
      actual: typeof config.purpose,
    });
  }
  if (!Array.isArray(config.primaryKeys)) {
    errors.push({
      path: "config.primaryKeys",
      message: "Missing or invalid primaryKeys field",
      expected: "string[]",
      actual: typeof config.primaryKeys,
    });
  } else if (!config.primaryKeys.every((k) => typeof k === "string")) {
    errors.push({
      path: "config.primaryKeys",
      message: "All primaryKeys must be strings",
      expected: "string[]",
      actual: "mixed types",
    });
  }
  if (typeof config.updateCadence !== "string") {
    errors.push({
      path: "config.updateCadence",
      message: "Missing or invalid updateCadence field",
      expected: "string",
      actual: typeof config.updateCadence,
    });
  }
  if (typeof config.access !== "string") {
    errors.push({
      path: "config.access",
      message: "Missing or invalid access field",
      expected: "string",
      actual: typeof config.access,
    });
  }
  if (!config.orchestration || typeof config.orchestration !== "object") {
    errors.push({
      path: "config.orchestration",
      message: "Missing or invalid orchestration field",
      expected: "object",
      actual: typeof config.orchestration,
    });
  } else {
    const orch = config.orchestration as Record<string, unknown>;
    if (typeof orch.summary !== "string") {
      errors.push({
        path: "config.orchestration.summary",
        message: "Missing or invalid summary field",
        expected: "string",
        actual: typeof orch.summary,
      });
    }
    if (!Array.isArray(orch.signals)) {
      errors.push({
        path: "config.orchestration.signals",
        message: "Missing or invalid signals field",
        expected: "string[]",
        actual: typeof orch.signals,
      });
    } else if (!orch.signals.every((s) => typeof s === "string")) {
      errors.push({
        path: "config.orchestration.signals",
        message: "All signals must be strings",
        expected: "string[]",
        actual: "mixed types",
      });
    }
    if (!orch.agents || typeof orch.agents !== "object") {
      errors.push({
        path: "config.orchestration.agents",
        message: "Missing or invalid agents field",
        expected: "object",
        actual: typeof orch.agents,
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a CategoryRecord-like object. */
export function validateCategoryRecordImpl(obj: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!obj || typeof obj !== "object") {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: "Value must be an object",
          expected: "object",
          actual: typeof obj as any,
        },
      ],
    };
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.id !== "string") {
    errors.push({
      path: "id",
      message: "Missing or invalid id field",
      expected: "string",
      actual: typeof record.id,
    });
  }
  const hasName = typeof (record as any).name === "string";
  const hasTitle = typeof (record as any).title === "string";
  if (!hasName && !hasTitle) {
    errors.push({
      path: "name/title",
      message: "Record must have either 'name' or 'title' field",
      expected: "string (name or title)",
      actual: `name: ${typeof (record as any).name}, title: ${typeof (
        record as any
      ).title}`,
    });
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a RelationshipDefinition-like object. */
export function validateRelationshipDefinitionImpl(
  obj: unknown
): ValidationResult {
  const errors: ValidationError[] = [];
  if (!obj || typeof obj !== "object") {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: "Value must be an object",
          expected: "object",
          actual: typeof obj as any,
        },
      ],
    };
  }
  const record = obj as Record<string, unknown>;
  if (typeof (record as any).from !== "string") {
    errors.push({
      path: "from",
      message: "Missing or invalid from field",
      expected: "string",
      actual: typeof (record as any).from,
    });
  }
  if (typeof (record as any).to !== "string") {
    errors.push({
      path: "to",
      message: "Missing or invalid to field",
      expected: "string",
      actual: typeof (record as any).to,
    });
  }
  if (typeof (record as any).type !== "string") {
    errors.push({
      path: "type",
      message: "Missing or invalid type field",
      expected: "string",
      actual: typeof (record as any).type,
    });
  }
  if (!record.fields || typeof record.fields !== "object") {
    errors.push({
      path: "fields",
      message: "Missing or invalid fields object",
      expected: "object",
      actual: typeof record.fields,
    });
  } else {
    const fields = record.fields as Record<string, unknown>;
    if (typeof fields.source !== "string") {
      errors.push({
        path: "fields.source",
        message: "Missing or invalid source field",
        expected: "string",
        actual: typeof fields.source,
      });
    }
    if (typeof fields.target !== "string") {
      errors.push({
        path: "fields.target",
        message: "Missing or invalid target field",
        expected: "string",
        actual: typeof fields.target,
      });
    }
  }
  if (typeof (record as any).description !== "string") {
    errors.push({
      path: "description",
      message: "Missing or invalid description field",
      expected: "string",
      actual: typeof (record as any).description,
    });
  }
  if (
    (record as any).required !== undefined &&
    typeof (record as any).required !== "boolean"
  ) {
    errors.push({
      path: "required",
      message: "Invalid required field (must be boolean if present)",
      expected: "boolean",
      actual: typeof (record as any).required,
    });
  }
  return { valid: errors.length === 0, errors };
}

/** Format validation errors (same semantics as original). */
export function formatValidationErrorsImpl(
  errors: ValidationError[],
  maxErrors: number = 3
): string {
  if (errors.length === 0) return "";
  return errors
    .slice(0, maxErrors)
    .map((error) =>
      error.path ? `${error.path}: ${error.message}` : error.message
    )
    .join("; ");
}
