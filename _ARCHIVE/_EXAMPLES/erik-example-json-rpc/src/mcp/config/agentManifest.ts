/**
 * @packageDocumentation agentManifest implementation for mcp module
 */

import {
  AgentIdentifier,
  OrchestratorProfile,
  ClarificationAgentProfile,
  DataAgentProfile,
  DatabaseAgentProfile,
  RelevantDataManagerAgentProfile,
} from "@mcp/config/agentProfiles";

/**
 * Description of an agent's shared responsibilities and boundaries.
 *
 */
export interface AgentCapabilityMetadata {
  /** Stable identifier that matches orchestrator routing names. */
  id: AgentIdentifier;
  /** Human readable agent name. */
  title: string;
  /** Summary of what the agent is responsible for. */
  description: string;
  /** Signals that strongly suggest this agent should be invoked. */
  primarySignals: string[];
  /** Situations where the agent must escalate to another party. */
  escalateWhen: string[];
  /** Downstream agents or services that this agent commonly depends on. */
  dependsOn?: AgentIdentifier[];
}

/**
 * Manifest describing the capabilities of every agent.
 */
export const agentManifest: Record<string, AgentCapabilityMetadata> = {
  orchestrator: {
    ...OrchestratorProfile,
    dependsOn: [ClarificationAgentProfile.id],
  },
  "relevant-data-manager": {
    ...RelevantDataManagerAgentProfile,
    dependsOn: [ClarificationAgentProfile.id],
  },
  // Alias for migration: user-context maps to the same profile as relevant-data-manager
  "user-context": {
    ...RelevantDataManagerAgentProfile,
    dependsOn: [ClarificationAgentProfile.id],
  },
  "database-agent": {
    ...DatabaseAgentProfile,
    dependsOn: [RelevantDataManagerAgentProfile.id],
  },
  "data-agent": {
    ...DataAgentProfile,
    dependsOn: [RelevantDataManagerAgentProfile.id, DatabaseAgentProfile.id],
  },
  "clarification-agent": {
    ...ClarificationAgentProfile,
    dependsOn: [RelevantDataManagerAgentProfile.id],
  },
};

/**
 * Retrieve manifest metadata for a given agent identifier.
 *
 * @param {AgentIdentifier} agentId - agentId parameter.
 * @returns {AgentCapabilityMetadata} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
export function getAgentMetadata(
  agentId: AgentIdentifier
): AgentCapabilityMetadata {
  const metadata = agentManifest[agentId];
  if (!metadata) {
    throw new Error(`Unknown agent: ${agentId as string}`);
  }
  return metadata;
}

/**
 * Return all agent capability entries.
 *
 * @returns {AgentCapabilityMetadata[]} - TODO: describe return value.
 */
export function listAgentCapabilities(): AgentCapabilityMetadata[] {
  return Object.values(agentManifest);
}
