/**
 * @packageDocumentation Enhanced agent configuration service for loading and managing agent definitions.
 */

import { loadApplicationConfig } from "@shared/configurationLoader";
import type {
  AgentDefinition,
  ApplicationConfig,
} from "@internal-types/applicationConfig";
import type { AgentIdentifier } from "@mcp/config/agentProfiles";

/**
 * Service for managing agent configurations and metadata.
 */
export class AgentConfigurationService {
  private config: ApplicationConfig | null = null;
  private static instance: AgentConfigurationService | null = null;

  /**
   * Private constructor for singleton pattern.
   * Instances should be retrieved via getInstance().
   */
  private constructor() {}

  /**
   * Gets the singleton instance of the agent configuration service.
   *
   * @returns {AgentConfigurationService} Active singleton service instance.
   */
  public static getInstance(): AgentConfigurationService {
    if (!this.instance) {
      this.instance = new AgentConfigurationService();
    }
    return this.instance;
  }

  /**
   * Loads the application configuration if not already loaded.
   *
   * @returns {Promise<ApplicationConfig>} Resolved application configuration object.
   */
  private async ensureConfigLoaded(): Promise<ApplicationConfig> {
    if (!this.config) {
      this.config = await loadApplicationConfig();
    }
    return this.config;
  }

  /**
   * Gets the agent definition for the specified agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the agent definition to load.
   * @returns {Promise<AgentDefinition>} Resolved agent definition including metadata.
   * @throws {Error} Throws if the agent identifier is unknown or definition missing.
   */
  public async getAgentDefinition(
    agentId: AgentIdentifier
  ): Promise<AgentDefinition> {
    const config = await this.ensureConfigLoaded();

    // Map agent identifiers to config keys
    let definition: AgentDefinition;

    switch (agentId) {
      case "orchestrator":
        definition = config.agents.definitions.orchestrator;
        break;
      case "relevant-data-manager":
      case "user-context":
        // During migration user-context maps to the existing relevantDataManager definition
        definition = config.agents.definitions.relevantDataManager;
        break;
      case "database-agent":
        definition = config.agents.definitions.databaseAgent;
        break;
      case "data-agent":
        definition = config.agents.definitions.dataAgent;
        break;
      case "clarification-agent":
        definition = config.agents.definitions.clarificationAgent;
        break;
      default:
        throw new Error(`Unknown agent identifier: ${agentId}`);
    }

    if (!definition) {
      throw new Error(`Agent definition not found for: ${agentId}`);
    }

    return definition;
  }

  /**
   * Gets all agent definitions keyed by agent identifier, including migration aliases.
   *
   * @returns {Promise<Record<string, AgentDefinition>>} Map of agent identifiers to definitions.
   */
  public async getAllAgentDefinitions(): Promise<
    Record<string, AgentDefinition>
  > {
    const config = await this.ensureConfigLoaded();

    return {
      orchestrator: config.agents.definitions.orchestrator,
      "relevant-data-manager": config.agents.definitions.relevantDataManager,
      "user-context": config.agents.definitions.relevantDataManager,
      "database-agent": config.agents.definitions.databaseAgent,
      "data-agent": config.agents.definitions.dataAgent,
      "clarification-agent": config.agents.definitions.clarificationAgent,
    };
  }

  /**
   * Gets user-facing information for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<unknown | null>} User-facing info or null if absent.
   */
  public async getUserFacingInfo(
    agentId: AgentIdentifier
  ): Promise<AgentDefinition["userFacing"] | null> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.userFacing || null;
  }

  /**
   * Gets application-facing information for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<unknown | null>} Application-facing info or null.
   */
  public async getApplicationFacingInfo(
    agentId: AgentIdentifier
  ): Promise<AgentDefinition["applicationFacing"] | null> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.applicationFacing || null;
  }

  /**
   * Gets the display name for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<string>} Human-friendly display name.
   */
  public async getAgentDisplayName(agentId: AgentIdentifier): Promise<string> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.displayName;
  }

  /**
   * Gets the capabilities for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<string[]>} Array of capability identifiers.
   */
  public async getAgentCapabilities(
    agentId: AgentIdentifier
  ): Promise<string[]> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.capabilities;
  }

  /**
   * Checks if an agent has a specific capability.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @param {string} capability - Capability identifier to check.
   * @returns {Promise<boolean>} True if capability is present; otherwise false.
   */
  public async hasCapability(
    agentId: AgentIdentifier,
    capability: string
  ): Promise<boolean> {
    const capabilities = await this.getAgentCapabilities(agentId);
    return capabilities.includes(capability);
  }

  /**
   * Gets agents that have a specific capability.
   *
   * @param {string} capability - Capability identifier to match.
   * @returns {Promise<AgentIdentifier[]>} Array of agent identifiers supporting the capability.
   */
  public async getAgentsWithCapability(
    capability: string
  ): Promise<AgentIdentifier[]> {
    const allDefinitions = await this.getAllAgentDefinitions();
    const agents: AgentIdentifier[] = [];

    for (const [agentId, definition] of Object.entries(allDefinitions) as Array<
      [AgentIdentifier, AgentDefinition]
    >) {
      if (definition.capabilities.includes(capability)) {
        agents.push(agentId);
      }
    }

    return agents;
  }

  /**
   * Gets friendly description for user interfaces.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<string>} Friendly description string.
   */
  public async getFriendlyDescription(
    agentId: AgentIdentifier
  ): Promise<string> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.userFacing?.friendlyDescription || definition.description;
  }

  /**
   * Gets example queries for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<string[]>} Example user queries or empty array.
   */
  public async getExampleQueries(agentId: AgentIdentifier): Promise<string[]> {
    const definition = await this.getAgentDefinition(agentId);
    return definition.userFacing?.exampleQueries || [];
  }

  /**
   * Gets monitoring configuration for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<unknown | null>} Monitoring config or null.
   */
  public async getMonitoringConfig(
    agentId: AgentIdentifier
  ): Promise<
    NonNullable<AgentDefinition["applicationFacing"]>["monitoring"] | null
  > {
    const appFacing = await this.getApplicationFacingInfo(agentId);
    return appFacing?.monitoring || null;
  }

  /**
   * Gets performance characteristics for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<unknown | null>} Performance config or null.
   */
  public async getPerformanceConfig(
    agentId: AgentIdentifier
  ): Promise<
    NonNullable<AgentDefinition["applicationFacing"]>["performance"] | null
  > {
    const appFacing = await this.getApplicationFacingInfo(agentId);
    return appFacing?.performance || null;
  }

  /**
   * Gets error handling configuration for an agent.
   *
   * @param {AgentIdentifier} agentId - Identifier for the target agent.
   * @returns {Promise<unknown | null>} Error handling config or null.
   */
  public async getErrorHandlingConfig(
    agentId: AgentIdentifier
  ): Promise<
    NonNullable<AgentDefinition["applicationFacing"]>["errorHandling"] | null
  > {
    const appFacing = await this.getApplicationFacingInfo(agentId);
    return appFacing?.errorHandling || null;
  }

  /**
   * Reloads the configuration from disk.
   * Clears cached configuration and re-loads from disk.
   *
   * @returns {Promise<void>} Resolves once configuration is reloaded.
   */
  public async reloadConfiguration(): Promise<void> {
    this.config = null;
    await this.ensureConfigLoaded();
  }
}

/**
 * Gets the global agent configuration service instance.
 *
 * @returns {AgentConfigurationService} Singleton instance for configuration lookups.
 */
export function getAgentConfigurationService(): AgentConfigurationService {
  return AgentConfigurationService.getInstance();
}
