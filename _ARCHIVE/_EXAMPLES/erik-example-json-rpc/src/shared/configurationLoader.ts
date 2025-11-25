/**
 * @packageDocumentation Configuration loader and validator for application settings.
 */
import path from "path";
import applicationConfig from "@config/application.config";
import {
  type ApplicationConfig,
  type EnvironmentConfig,
} from "@internal-types/applicationConfig";

/**
 * Default configuration values used as a base when merging a loaded config.
 */
const DEFAULT_CONFIG: Partial<ApplicationConfig> = {
  application: {
    name: "VSCode MCP Extension",
    version: "1.0.0",
    description: "MCP-enabled VS Code extension",
    environments: {
      development: {
        debug: true,
        logLevel: "verbose",
        hotReload: true,
        mockData: true,
      },
      staging: {
        debug: false,
        logLevel: "info",
        hotReload: false,
        mockData: false,
      },
      production: {
        debug: false,
        logLevel: "warn",
        hotReload: false,
        mockData: false,
      },
    },
  },
  mcp: {
    server: {
      protocol: "http",
      defaultPort: 39200,
      timeout: 30000,
      retries: 3,
      embedded: {
        enabled: true,
        autoStart: true,
      },
    },
    client: {
      maxConcurrentRequests: 10,
      requestTimeout: 15000,
      retryDelay: 1000,
    },
  },
};

/**
 * Configuration loader class for managing application settings.
 */
export class ConfigurationLoader {
  private config: ApplicationConfig | null = null;
  private readonly configPath: string;

  /**
   * Creates a new configuration loader instance.
   *
   * @param {string} configPath - Deprecated JSON config path for legacy fallback (kept for API compatibility).
   */
  constructor(configPath: string = "out/mcp.config.json") {
    this.configPath = path.resolve(configPath);
  }

  /**
   * Load and return the merged application configuration (TS source of truth).
   *
   * @returns {Promise<ApplicationConfig>} Merged configuration object.
   */
  async loadConfig(): Promise<ApplicationConfig> {
    if (this.config) {
      return this.config;
    }
    // Use the TypeScript config as the single source of truth
    const tsConfig = applicationConfig as ApplicationConfig;
    this.config = this.mergeWithDefaults(tsConfig);
    return this.config;
  }

  /**
   * Gets configuration for the requested environment.
   *
   * @param {string} environment - Environment name (development|staging|production).
   * @returns {Promise<EnvironmentConfig>} Environment-specific configuration slice.
   */
  async getEnvironmentConfig(
    environment: string = "development"
  ): Promise<EnvironmentConfig> {
    const config = await this.loadConfig();
    const envConfig =
      config.application.environments[
        environment as keyof typeof config.application.environments
      ];
    if (!envConfig) {
      throw new Error(
        `Environment '${environment}' not found in configuration`
      );
    }
    return envConfig;
  }

  /**
   * Gets agent-specific configuration merged with global defaults.
   *
   * @param {string} agentName - Registered agent profile id.
   * @returns {Promise<Record<string, unknown>>} Concrete settings for the agent.
   */
  async getAgentConfig(agentName: string): Promise<Record<string, unknown>> {
    const config = await this.loadConfig();
    const agentConfig =
      config.agents.profiles[agentName as keyof typeof config.agents.profiles];
    if (!agentConfig) {
      throw new Error(`Agent '${agentName}' configuration not found`);
    }
    return {
      ...config.agents.global,
      ...agentConfig,
    };
  }

  /**
   * Reload configuration (clears cache and re-reads TS config).
   *
   * @returns {Promise<ApplicationConfig>} Freshly loaded configuration.
   */
  async reloadConfig(): Promise<ApplicationConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Merge loaded configuration with defaults (shallow where safe, deep for top-level groups).
   *
   * @param {ApplicationConfig} loadedConfig - Config loaded from TS source.
   * @returns {ApplicationConfig} Merged configuration respecting defaults.
   */
  private mergeWithDefaults(
    loadedConfig: ApplicationConfig
  ): ApplicationConfig {
    return {
      ...DEFAULT_CONFIG,
      ...loadedConfig,
      application: {
        ...DEFAULT_CONFIG.application,
        ...loadedConfig.application,
      },
      mcp: {
        ...DEFAULT_CONFIG.mcp,
        ...loadedConfig.mcp,
      },
    } as ApplicationConfig;
  }

  /**
   * Basic structure validation for critical fields.
   *
   * @param {ApplicationConfig} config - Candidate configuration object.
   * @returns {boolean} True when config passes minimal checks.
   * @throws {Error} When required application name or default port is missing.
   */
  private validateConfig(config: ApplicationConfig): boolean {
    if (!config.application?.name) {
      throw new Error("Application name is required in configuration");
    }
    if (!config.mcp?.server?.defaultPort) {
      throw new Error("MCP server default port is required in configuration");
    }
    return true;
  }
}

/** Global configuration instance (singleton). */
let globalConfig: ConfigurationLoader | null = null;

/**
 * Get the global configuration loader (singleton).
 *
 * @param {string} configPath - Legacy JSON path (ignored in TS-first mode; kept for API compatibility).
 * @returns {ConfigurationLoader} Shared configuration loader instance.
 */
export function getConfigurationLoader(
  configPath?: string
): ConfigurationLoader {
  if (!globalConfig) {
    globalConfig = new ConfigurationLoader(configPath);
  }
  return globalConfig;
}

/**
 * Convenience helper to load the application config via the global loader.
 *
 * @param {string} configPath - Optional legacy path (not used when TS config is present).
 * @returns {Promise<ApplicationConfig>} Loaded application configuration.
 */
export async function loadApplicationConfig(
  configPath?: string
): Promise<ApplicationConfig> {
  const loader = getConfigurationLoader(configPath);
  return loader.loadConfig();
}
