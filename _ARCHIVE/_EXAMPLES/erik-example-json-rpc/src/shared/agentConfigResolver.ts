/**
 * @packageDocumentation Agent configuration resolver that merges unified agent config with MCP runtime overrides.
 */

import { ConfigurationLoader } from "@shared/configurationLoader";
import {
  type AgentIdentifier,
  getExecutionProfile,
} from "@mcp/config/unifiedAgentConfig";

/**
 * Priority levels controlling execution ordering & resource consideration.
 */
export type Priority = "high" | "medium" | "low";

/**
 * OverrideExecution interface.
 *
 */
interface OverrideExecution {
  priority?: Priority;
  timeout?: number;
  cacheEnabled?: boolean;
}

/**
 * RuntimeOverrides interface.
 *
 */
interface RuntimeOverridesEntry {
  execution?: OverrideExecution;
}

type RuntimeOverrides = Record<string, RuntimeOverridesEntry>;

/**
 * normalizeAgentId function.
 *
 * @param {string} input - input parameter.
 * @returns {AgentIdentifier} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
function normalizeAgentId(input: string): AgentIdentifier {
  // Already canonical
  if (
    input === "orchestrator" ||
    input === "relevant-data-manager" ||
    input === "user-context" ||
    input === "database-agent" ||
    input === "data-agent" ||
    input === "clarification-agent"
  ) {
    return input as AgentIdentifier;
  }
  // Common legacy/camel variants
  const map: Record<string, AgentIdentifier> = {
    relevantDataManager: "relevant-data-manager",
    userContext: "user-context",
    databaseAgent: "database-agent",
    dataAgent: "data-agent",
    clarificationAgent: "clarification-agent",
  };
  const mapped = map[input];
  if (mapped) return mapped;
  // Fallback: try to be safe – throw to surface misconfiguration
  throw new Error(`Unknown agent identifier '${input}'. Use canonical ids.`);
}

/**
 * isValidPriority function.
 *
 * @param {string} p - p parameter.
 * @returns {p is Priority} - TODO: describe return value.
 */
function isValidPriority(p?: string): p is Priority {
  return p === "high" || p === "medium" || p === "low";
}

/**
 * EffectiveExecutionProfile interface.
 *
 */
export interface EffectiveExecutionProfile {
  priority: Priority;
  timeout: number;
  cacheEnabled?: boolean;
}

/**
 *
 */
export class AgentConfigResolver {
  /**
   * constructor function.
   *
   * @param {string} configPath - configPath parameter.
   * @returns {unknown} - TODO: describe return value.
   */
  constructor(private readonly configPath: string = "out/mcp.config.json") {}

  /**
   * Returns the effective execution profile for an agent after applying runtime overrides.
   *
   * @param {AgentIdentifier} agentId - agentId parameter.
   * @returns {Promise<EffectiveExecutionProfile>} - TODO: describe return value.
   */
  async getEffectiveExecutionProfile(
    agentId: AgentIdentifier
  ): Promise<EffectiveExecutionProfile> {
    const loader = new ConfigurationLoader(this.configPath);
    const appConfig = await loader.loadConfig();

    // Get unified base profile
    const base = getExecutionProfile(agentId);

    // Read overrides (if any)
    const overrides: RuntimeOverrides =
      (
        appConfig as unknown as {
          agents?: { runtimeOverrides?: RuntimeOverrides };
        }
      ).agents?.runtimeOverrides || {};

    // Attempt direct key first; then try normalized variants, always yield execution object
    const rawOverride =
      overrides[agentId] ??
      Object.entries(overrides).reduce<
        { execution?: OverrideExecution } | undefined
      >((acc, [key, val]) => {
        try {
          const normalized = normalizeAgentId(key);
          return normalized === agentId
            ? (val as { execution?: OverrideExecution })
            : acc;
        } catch {
          return acc;
        }
      }, undefined);
    const overrideEntry: OverrideExecution | undefined = rawOverride?.execution;

    const merged: EffectiveExecutionProfile = {
      priority: base.priority as Priority,
      timeout: base.timeout,
      cacheEnabled: base.cacheEnabled,
    };

    if (overrideEntry) {
      if (isValidPriority(overrideEntry.priority)) {
        merged.priority = overrideEntry.priority;
      } else if (overrideEntry.priority !== undefined) {
        console.warn(
          `Ignoring invalid priority '${overrideEntry.priority}' for ${agentId}`
        );
      }
      if (typeof overrideEntry.timeout === "number") {
        merged.timeout = overrideEntry.timeout;
      }
      if (typeof overrideEntry.cacheEnabled === "boolean") {
        merged.cacheEnabled = overrideEntry.cacheEnabled;
      }
    }

    // Enforce global maxExecutionTime if present
    const max = appConfig.agents.global.maxExecutionTime;
    if (typeof max === "number" && merged.timeout > max) {
      console.warn(
        `Agent ${agentId} timeout ${merged.timeout} exceeds maxExecutionTime ${max}; capping to ${max}.`
      );
      merged.timeout = max;
    }

    return merged;
  }
}

export default AgentConfigResolver;
