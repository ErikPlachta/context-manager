/**
 * @packageDocumentation Centralized exports and architecture overview.
 *
 * Architecture Summary
 * - Orchestrator-centric: The Orchestrator is the only coordinator of agent interactions.
 * - Agent isolation: Agents never import or call other agents; they return typed data only.
 * - CommunicationAgent: Handles all user-facing formatting (markdown/plaintext/html) from typed responses.
 * - Data-driven design: Business values and routing derive from configuration or loaded data, not hardcoded.
 *
 * Data Flow
 * User → Orchestrator → Agent (typed data) → Orchestrator → CommunicationAgent (format) → User
 *
 * Responsibilities
 * - Agents: Single responsibility, typed inputs/outputs, configuration-driven behavior.
 * - Orchestrator: Classifies, plans and executes workflows, calls agents, aggregates typed results.
 * - CommunicationAgent: Formats success/error/progress/validation into user-facing messages.
 *
 * Notes
 * - Tests should validate typed data at agent and orchestrator boundaries; formatting is verified via CommunicationAgent.
 * - Public APIs include complete JSDoc with specific `@param` and `@returns` types.
 */

// Clean interface definitions for orchestrator coordination (moved to types)
export * from "@internal-types/interfaces";

// Core agent implementations - each properly isolated
export { ClarificationAgent } from "@agent/clarificationAgent";
export { DataAgent } from "@agent/dataAgent";
export { DatabaseAgent } from "@agent/databaseAgent";
export { Orchestrator } from "@agent/orchestrator";
// Deprecated legacy agent removed; use UserContextAgent instead
export { UserContextAgent } from "@agent/userContextAgent";

// Health and maintenance agents
export { RepositoryHealthAgent } from "@tools/repositoryHealth";

// Re-export agent profiles for convenience
export {
  OrchestratorProfile,
  ClarificationAgentProfile,
  DataAgentProfile,
  DatabaseAgentProfile,
  UserContextAgentProfile,
  type AgentIdentifier,
  type AgentProfile,
  type KnownAgentProfile,
} from "@mcp/config/agentProfiles";

// Agent configuration service
export {
  AgentConfigurationService,
  getAgentConfigurationService,
} from "@shared/agentConfigurationService";
