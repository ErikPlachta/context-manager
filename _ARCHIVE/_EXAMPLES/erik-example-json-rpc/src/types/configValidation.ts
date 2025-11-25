/**
 * @packageDocumentation Configuration Validation Type Declarations
 *
 * Runtime validation logic lives in `src/shared/validation/configValidation.ts`.
 * This module exports only type shapes for agents, tools, and tests (types-only purity).
 */

/** Detailed validation error information (runtime logic lives in shared module). */
export interface ValidationError {
  level: "error" | "warning";
  category: "schema" | "type" | "business_rule" | "compatibility";
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

/** Validation warning (non-blocking issue). */
export interface ValidationWarning extends Omit<ValidationError, "level"> {
  level: "warning";
}

/** Validation result with detailed error and warning information. */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Previous runtime exports (validateAgentConfig, validateCompatibility, generateValidationReport)
// were migrated to shared validation. Import from `@shared/validation/configValidation` for logic.
