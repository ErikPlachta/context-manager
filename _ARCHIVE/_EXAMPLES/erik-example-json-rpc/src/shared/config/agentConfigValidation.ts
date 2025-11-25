/**
 * @packageDocumentation Agent configuration validation runtime utilities.
 *
 * Implements runtime validation logic previously housed under `src/types`.
 * Enforces governance rule that `src/types/**` contains declarations only.
 */
// Import retained for future specialized validation expansion (currently unused)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AgentConfigDefinition } from "@internal-types/agentConfig";
import { ConfigUtils } from "@internal-types/configRegistry";

/**
 * Structured outcome produced by configuration validation routines.
 *
 * Represents overall validity plus collections of blocking errors and
 * non‑blocking warnings.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Blocking or advisory issue detected during validation.
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
 * Non-blocking validation warning (subset of ValidationError fields).
 */
export interface ValidationWarning extends Omit<ValidationError, "level"> {
  level: "warning";
}

/**
 * Primary entry point for validating agent configuration objects.
 *
 * @param config - Unknown configuration candidate to inspect.
 * @returns ValidationResult summarizing errors and warnings.
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
 * Validate core agent metadata sub-object.
 *
 * @param agentField - The untyped agent field.
 * @param errors - Collector for blocking errors.
 * @param warnings - Collector for advisory warnings.
 */
function validateAgentField(
  agentField: unknown,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (typeof agentField !== "object" || agentField === null) {
    errors.push({
      level: "error",
      category: "type",
      path: "agent",
      message: "Agent field must be an object",
      expected: "object",
      actual: typeof agentField,
    });
    return;
  }
  const agentObj = agentField as Record<string, unknown>;
  const requiredFields: Array<{ key: string; type: string }> = [
    { key: "name", type: "string" },
    { key: "id", type: "string" },
  ];
  for (const field of requiredFields) {
    if (!(field.key in agentObj)) {
      errors.push({
        level: "error",
        category: "schema",
        path: `agent.${field.key}`,
        message: `Missing required agent.${field.key} field`,
      });
    } else if (typeof agentObj[field.key] !== field.type) {
      errors.push({
        level: "error",
        category: "type",
        path: `agent.${field.key}`,
        message: `agent.${field.key} must be a ${field.type}`,
        expected: field.type,
        actual: typeof agentObj[field.key],
      });
    }
  }
  if (agentObj.description && typeof agentObj.description !== "string") {
    warnings.push({
      level: "warning",
      category: "type",
      path: "agent.description",
      message: "agent.description should be a string",
      expected: "string",
      actual: typeof agentObj.description,
    });
  }
}

/**
 * Dispatch specialized validation based on agent type.
 *
 * @param configObj - Full configuration object.
 * @param agentType - Agent type identifier from metadata.
 * @param errors - Collector for blocking errors.
 * @param warnings - Collector for advisory warnings.
 */
function validateConfigurationSections(
  configObj: Record<string, unknown>,
  agentType: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  switch (agentType) {
    case "orchestrator":
      validateOrchestratorConfig(configObj, errors, warnings);
      break;
    case "database-agent":
      validateDatabaseAgentConfig(configObj, errors, warnings);
      break;
    case "data-agent":
      validateDataAgentConfig(configObj, errors, warnings);
      break;
    case "clarification-agent":
      validateClarificationAgentConfig(configObj, errors, warnings);
      break;
    case "relevant-data-manager":
    case "user-context":
      validateRelevantDataManagerConfig(configObj, errors, warnings);
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
 * Validate orchestrator-specific configuration sections.
 *
 * Focuses on presence and basic structure of required subsections.
 *
 * @param config - Full configuration object.
 * @param errors - Collector for validation errors.
 * @param _warnings - Collector for warnings (unused currently).
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
  }
}

/**
 * Placeholder for database-agent specialized validation.
 *
 * @param _config - Configuration object.
 * @param _errors - Errors collector.
 * @param _warnings - Warnings collector.
 */
function validateDatabaseAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for data-agent specialized validation.
 *
 * @param _config - Configuration object.
 * @param _errors - Errors collector.
 * @param _warnings - Warnings collector.
 */
function validateDataAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for clarification-agent specialized validation.
 *
 * @param _config - Configuration object.
 * @param _errors - Errors collector.
 * @param _warnings - Warnings collector.
 */
function validateClarificationAgentConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Placeholder for relevant-data-manager / user-context specialized validation.
 *
 * @param _config - Configuration object.
 * @param _errors - Errors collector.
 * @param _warnings - Warnings collector.
 */
function validateRelevantDataManagerConfig(
  _config: Record<string, unknown>,
  _errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  /* no-op */
}

/**
 * Basic compatibility validation placeholder (extend with real rules as needed).
 *
 * @param config - Configuration object to assess.
 * @returns ValidationResult with pass/fail status.
 */
export function validateCompatibility(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  if (typeof config !== "object" || config === null) {
    errors.push({
      level: "error",
      category: "type",
      path: "$root",
      message: "Configuration must be an object for compatibility check",
    });
    return { isValid: false, errors, warnings };
  }
  // Placeholder compatibility logic (extend with real rules as needed)
  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Produce a concise text report summarizing validation outcome.
 *
 * @param result - Validation result structure.
 * @returns Multi-line string summarizing findings.
 */
export function generateValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(result.isValid ? "Validation: PASS" : "Validation: FAIL");
  if (result.errors.length) {
    lines.push("Errors:");
    for (const e of result.errors) {
      lines.push(`- [${e.category}] ${e.path}: ${e.message}`);
    }
  }
  if (result.warnings.length) {
    lines.push("Warnings:");
    for (const w of result.warnings) {
      lines.push(`- [${w.category}] ${w.path}: ${w.message}`);
    }
  }
  return lines.join("\n");
}
