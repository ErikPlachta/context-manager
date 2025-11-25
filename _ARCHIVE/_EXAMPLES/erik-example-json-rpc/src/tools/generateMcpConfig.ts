/**
 * @packageDocumentation Build-time generator for mcp.config.json derived from TypeScript sources.
 *
 * Source of truth: application + unified agent configs. This script materialises
 * a JSON file (not committed) consumed by external tooling that expects a JSON
 * manifest. It intentionally excludes any deprecated fields.
 */
import * as fs from "fs";
import * as path from "path";
// Restricted direct imports are acceptable for build tooling; generator runs in isolation.
// NOTE: These imports are intentionally from internal TS sources. Build tooling is exempt
// from the restriction patterns enforced for runtime modules.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore allow build-time internal import
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore allow build-time internal import
// Build script intentionally bypasses import restriction rules; we map through a central export barrel.
import {
  getAllAgentIds,
  getOrchestrationProfile,
  getExecutionProfile,
  getRichMetadata,
  type AgentIdentifier,
} from "@mcp/config/unifiedAgentConfig";
import { applicationConfig } from "@config/application.config";

interface GeneratedAgentConfig {
  id: string;
  title: string;
  description: string;
  primarySignals: string[];
  escalateWhen: string[];
  execution: {
    priority: string;
    timeout: number;
    cacheEnabled?: boolean;
  };
  metadata: {
    capabilities: string[];
    responsibility: string;
    dependencies: string[];
  };
}

/** Structure of the generated MCP configuration file */
interface GeneratedMcpConfig {
  generatedAt: string;
  application: {
    name: string;
    version: string;
    description?: string;
  };
  agents: GeneratedAgentConfig[];
}

/**
 * Synthesize the MCP JSON configuration from TS sources.
 *
 * @returns {GeneratedMcpConfig} - Fully materialised configuration object.
 */
function buildConfig(): GeneratedMcpConfig {
  // Include alias 'user-context' explicitly for migration visibility and deduplicate ids.
  const agentIds = Array.from(
    new Set([...getAllAgentIds(), "user-context"])
  ) as AgentIdentifier[];
  const agents: GeneratedAgentConfig[] = agentIds.map((id: AgentIdentifier) => {
    const orchestration = getOrchestrationProfile(id);
    const execution = getExecutionProfile(id);
    const rich = getRichMetadata(id);
    return {
      // Preserve the requested identifier (ensures alias like 'user-context' appears distinctly)
      id: id,
      title: orchestration.title,
      description: orchestration.description,
      primarySignals: orchestration.primarySignals,
      escalateWhen: orchestration.escalateWhen,
      execution: {
        priority: execution.priority,
        timeout: execution.timeout,
        cacheEnabled: execution.cacheEnabled,
      },
      metadata: {
        capabilities: rich.capabilities,
        responsibility: rich.responsibility,
        dependencies: rich.applicationFacing.dependencies,
      },
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    application: {
      name: applicationConfig.application.name,
      version: applicationConfig.application.version,
      description: applicationConfig.application.description,
    },
    agents,
  };
}

/**
 * Persist generated configuration to disk under out/mcp.config.json
 *
 * @param {GeneratedMcpConfig} config - Generated configuration object.
 * @returns {string} - Absolute path to written JSON file.
 */
function writeConfigFile(config: GeneratedMcpConfig): string {
  const outDir = path.resolve(process.cwd(), "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const target = path.join(outDir, "mcp.config.json");
  fs.writeFileSync(target, JSON.stringify(config, null, 2), "utf8");
  return target;
}

/**
 * Execute generator when this module is the entry point (direct invocation via tsx/node).
 * Uses import.meta.url comparison instead of require.main for ESM compatibility.
 *
 * @returns {Promise<void>} Resolves when generation completes (or immediately if not direct).
 */
async function runIfDirect(): Promise<void> {
  // Avoid import.meta usage to remain compatible with Jest transpilation when module setting differs.
  const invoked = path.basename(process.argv[1] || "");
  if (
    invoked === "generateMcpConfig.ts" ||
    invoked === "generateMcpConfig.js"
  ) {
    const config = buildConfig();
    const target = writeConfigFile(config);
    console.log(`Generated MCP config at ${target}`);
  }
}
void runIfDirect();

export {
  buildConfig,
  writeConfigFile,
  GeneratedMcpConfig,
  GeneratedAgentConfig,
};
