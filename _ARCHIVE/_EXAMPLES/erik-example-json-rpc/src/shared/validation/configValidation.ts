/**
 * Shared configuration validation implementations.
 *
 * Runtime validation implementations extracted (duplicated for Phase 3) from `src/types/configValidation.ts`.
 * These functions will become the single source of truth once agents migrate to shared modules
 * and the types directory is restored to types-only exports.
 *
 * @packageDocumentation
 * @remarks Phase 3 (partial): Logic is intentionally copied without modification to preserve behavior
 * locked by parity tests. No consumers import this file yet; later phases will switch imports
 * and remove the duplicated runtime code from `src/types/configValidation.ts`.
 */

import { AgentConfigDefinition } from "@internal-types/agentConfig";
import { ConfigUtils } from "@internal-types/configRegistry";

/**
 * Validation result produced by configuration validators.
 *
 * @remarks
 * Exported for consumers that need to act on structured validation feedback
 * (tooling, CI health checks, UX reporting). When Phase 5+ migration is
 * complete this will be the single source type (types/ duplicate removed).
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Structured validation error entry.
 *
 * @remarks
 * Errors are blocking; warnings are non-blocking (see {@link ValidationWarning}).
 */
export interface ValidationError {
  level: "error" | "warning";
  category: "schema" | "type" | "business_rule" | "compatibility";
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

/**
 * Non-blocking validation warning (advisory issue that does not fail validation).
 */
export interface ValidationWarning extends Omit<ValidationError, "level"> {
  level: "warning";
}

/**
 * Validates an unknown agent configuration object against registry metadata and business rules.
 *
 * @param config - Unknown configuration candidate object to validate.
 * @returns {@link ValidationResult} listing blocking errors and non-blocking warnings.
 * @remarks Behavior duplicated from `src/types/configValidation.ts` (Phase 3).
 * @example
 * ```ts
 * const candidate = { $configId: 'agent.orchestrator.v1.0.0', agent: { id: 'orch', name: 'Orchestrator', version: '1.0.0', description: 'Routes intents' } };
 * const result = validateAgentConfig(candidate);
 * if (!result.isValid) {
 *   console.error(generateValidationReport(result));
 * }
 * ```
 */
export function validateAgentConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof config !== "object" || config === null) {
    errors.push({
      level: "error",
      category: "type",
      path: "$root",
      message: "Configuration must be an object",
      expected: "object",
      actual: typeof config,
    });
    return { isValid: false, errors, warnings };
  }

  const configObj = config as Record<string, unknown>;

  if (!configObj.$configId) {
    errors.push({
      level: "error",
      category: "schema",
      path: "$configId",
      message: "Missing required $configId field",
      expected: "string (configuration ID from registry)",
    });
  } else if (typeof configObj.$configId !== "string") {
    errors.push({
      level: "error",
      category: "type",
      path: "$configId",
      message: "$configId must be a string",
      expected: "string",
      actual: typeof configObj.$configId,
    });
  } else if (!ConfigUtils.isValidConfigId(configObj.$configId)) {
    errors.push({
      level: "error",
      category: "schema",
      path: "$configId",
      message: "Invalid configuration ID not found in registry",
      actual: configObj.$configId,
      expected: "Valid configuration ID from registry",
    });
  }

  if (!configObj.agent) {
    errors.push({
      level: "error",
      category: "schema",
      path: "agent",
      message: "Missing required agent field",
    });
  } else {
    validateAgentField(configObj.agent, errors, warnings);
  }

  if (
    configObj.$configId &&
    ConfigUtils.isValidConfigId(configObj.$configId as string)
  ) {
    const metadata = ConfigUtils.getMetadata(configObj.$configId as string);
    if (metadata) {
      validateConfigurationSections(
        configObj,
        metadata.agentType,
        errors,
        warnings
      );
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Internal helper validating the `agent` sub-object.
 *
 * @param agent - Raw agent value from config.
 * @param errors - Collector for blocking validation errors.
 * @param warnings - Collector for non-blocking warnings.
 * @internal
 */
function validateAgentField(
  agent: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (typeof agent !== "object" || agent === null) {
    errors.push({
      level: "error",
      category: "type",
      path: "agent",
      message: "Agent field must be an object",
      expected: "object",
      actual: typeof agent,
    });
    return;
  }
  const agentObj = agent as Record<string, unknown>;
  const requiredFields = ["id", "name", "version", "description"];
  for (const field of requiredFields) {
    if (!agentObj[field]) {
      errors.push({
        level: "error",
        category: "schema",
        path: `agent.${field}`,
        message: `Missing required field: ${field}`,
      });
    } else if (typeof agentObj[field] !== "string") {
      errors.push({
        level: "error",
        category: "type",
        path: `agent.${field}`,
        message: `Field ${field} must be a string`,
        expected: "string",
        actual: typeof agentObj[field],
      });
    }
  }
  if (agentObj.version && typeof agentObj.version === "string") {
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(agentObj.version as string)) {
      warnings.push({
        level: "warning",
        category: "business_rule",
        path: "agent.version",
        message: "Version should follow semantic versioning (x.y.z)",
        actual: agentObj.version,
        expected: "x.y.z format",
      });
    }
  }
}

/**
 * Internal dispatcher for agentType‑specific section validation.
 *
 * @param config - Full configuration object.
 * @param agentType - Resolved agent type from registry metadata.
 * @param errors - Collector for blocking errors.
 * @param warnings - Collector for non-blocking warnings.
 * @internal
 */
function validateConfigurationSections(
  config: Record<string, unknown>,
  agentType: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  switch (agentType) {
    case "orchestrator":
      validateOrchestratorConfig(config, errors, warnings);
      break;
    case "database-agent":
      validateDatabaseAgentConfig(config, errors, warnings);
      break;
    case "data-agent":
      validateDataAgentConfig(config, errors, warnings);
      break;
    case "clarification-agent":
      validateClarificationAgentConfig(config, errors, warnings);
      break;
    case "relevant-data-manager":
      validateRelevantDataManagerConfig(config, errors, warnings);
      break;
    case "user-context":
      validateRelevantDataManagerConfig(config, errors, warnings);
      break;
    default:
      warnings.push({
        level: "warning",
        category: "schema",
        path: "$configId",
        message: `Unknown agent type: ${agentType}. Skipping specialized validation.`,
      });
  }
}

/**
 * Validates orchestrator‑specific configuration subsections.
 *
 * @param config - Full configuration object.
 * @param errors - Collector for blocking errors.
 * @param _warnings - Ignored warnings collector (reserved for future rules).
 * @internal
 */
function validateOrchestratorConfig(
  config: Record<string, unknown>,
  errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  const orchestration = config.orchestration as
    | Record<string, unknown>
    | undefined;
  if (!orchestration) {
    errors.push({
      level: "error",
      category: "schema",
      path: "orchestration",
      message:
        "Orchestrator configuration missing required orchestration section",
    });
    return;
  }
  if (!orchestration.intents) {
    errors.push({
      level: "error",
      category: "schema",
      path: "orchestration.intents",
      message: "Orchestrator configuration missing required intents section",
    });
  } else if (
    typeof orchestration.intents !== "object" ||
    orchestration.intents === null
  ) {
    errors.push({
      level: "error",
      category: "type",
      path: "orchestration.intents",
      message: "Intents section must be an object",
    });
  }
  if (
    orchestration.textProcessing &&
    typeof orchestration.textProcessing === "object"
  ) {
    const textProcessing = orchestration.textProcessing as Record<
      string,
      unknown
    >;
    if (textProcessing.stopWords && !Array.isArray(textProcessing.stopWords)) {
      errors.push({
        level: "error",
        category: "type",
        path: "textProcessing.stopWords",
        message: "stopWords must be an array of strings",
      });
    }
    if (textProcessing.scoring && typeof textProcessing.scoring === "object") {
      const scoring = textProcessing.scoring as Record<string, unknown>;
      if (scoring.weights && typeof scoring.weights === "object") {
        const weights = scoring.weights as Record<string, unknown>;
        const weightFields = [
          "exactMatch",
          "partialMatch",
          "wordOrder",
          "frequency",
        ];
        for (const field of weightFields) {
          if (
            weights[field] !== undefined &&
            typeof weights[field] !== "number"
          ) {
            errors.push({
              level: "error",
              category: "type",
              path: `textProcessing.scoring.weights.${field}`,
              message: `Weight ${field} must be a number`,
            });
          }
        }
      }
    }
  }
}

/**
 * Placeholder for future database agent specialized validation.
 *
 * @param _config - Configuration object (unused placeholder).
 * @param _errors - Error collector (unused placeholder).
 * @param _warnings - Warning collector (unused placeholder).
 * @internal
 */
function validateDatabaseAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for future data agent specialized validation.
 *
 * @param _config - Configuration object (unused placeholder).
 * @param _errors - Error collector (unused placeholder).
 * @param _warnings - Warning collector (unused placeholder).
 * @internal
 */
function validateDataAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for future clarification agent specialized validation.
 *
 * @param _config - Configuration object (unused placeholder).
 * @param _errors - Error collector (unused placeholder).
 * @param _warnings - Warning collector (unused placeholder).
 * @internal
 */
function validateClarificationAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for future relevant‑data‑manager (user-context alias) specialized validation.
 *
 * @param _config - Configuration object (unused placeholder).
 * @param _errors - Error collector (unused placeholder).
 * @param _warnings - Warning collector (unused placeholder).
 * @internal
 */
function validateRelevantDataManagerConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Checks compatibility between two configuration definitions (same agent type & major version).
 *
 * @param config1 - Baseline configuration.
 * @param config2 - Candidate configuration being compared.
 * @returns {@link ValidationResult} describing compatibility outcome (errors only if incompatible).
 * @remarks Behavior duplicated for parity; future phases will remove the types version.
 * @example
 * ```ts
 * const a = { $configId: 'agent.orchestrator.v1.0.0' } as AgentConfigDefinition;
 * const b = { $configId: 'agent.orchestrator.v1.1.0' } as AgentConfigDefinition;
 * const compat = validateCompatibility(a, b);
 * console.log(compat.isValid);
 * ```
 */
export function validateCompatibility(
  config1: AgentConfigDefinition,
  config2: AgentConfigDefinition
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  if (!config1.$configId || !config2.$configId) {
    errors.push({
      level: "error",
      category: "compatibility",
      path: "$configId",
      message: "Cannot check compatibility without configuration IDs",
    });
    return { isValid: false, errors, warnings };
  }
  if (!ConfigUtils.areCompatible(config1.$configId, config2.$configId)) {
    errors.push({
      level: "error",
      category: "compatibility",
      path: "$configId",
      message: "Configuration versions are not compatible",
      actual: `${config1.$configId} vs ${config2.$configId}`,
    });
  }
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Generates a human-readable multi-line report summarizing validation outcome.
 *
 * @param result - Validation outcome produced by a validator.
 * @returns Multi‑line string (errors listed first, then warnings).
 */
export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(
    result.isValid
      ? "✅ Configuration validation passed"
      : "❌ Configuration validation failed"
  );
  if (result.errors.length > 0) {
    lines.push("\nErrors:");
    result.errors.forEach((error, index) => {
      lines.push(
        `  ${index + 1}. [${error.category.toUpperCase()}] ${error.path}: ${
          error.message
        }`
      );
      if (error.expected !== undefined)
        lines.push(`     Expected: ${JSON.stringify(error.expected)}`);
      if (error.actual !== undefined)
        lines.push(`     Actual: ${JSON.stringify(error.actual)}`);
    });
  }
  if (result.warnings.length > 0) {
    lines.push("\nWarnings:");
    result.warnings.forEach((warning, index) => {
      lines.push(
        `  ${index + 1}. [${warning.category.toUpperCase()}] ${warning.path}: ${
          warning.message
        }`
      );
    });
  }
  return lines.join("\n");
}
