/**
 * @packageDocumentation agentProfiles implementation for mcp module
 * @deprecated This file is deprecated. Use unifiedAgentConfig.ts instead.
 * Kept for backward compatibility during transition period.
 */

// Re-export everything from the unified configuration
export {
  type AgentIdentifier,
  type AgentProfile,
  type KnownAgentProfile,
  OrchestratorProfile,
  RelevantDataManagerAgentProfile,
  /** Alias: User Context Agent profile (renamed from Relevant Data Manager). */
  RelevantDataManagerAgentProfile as UserContextAgentProfile,
  DatabaseAgentProfile,
  DataAgentProfile,
  ClarificationAgentProfile,
} from "@mcp/config/unifiedAgentConfig";
