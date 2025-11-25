/**
 * @packageDocumentation applicationConfig definitions for types module.
 * Strongly typed configuration primitives for environment, MCP server/client,
 * agent metadata, performance characteristics, and validation scaffolding.
 *
 * @remarks
 * These types are the source of truth for application-level configuration.
 * Prefer documenting semantics here (types-as-docs) and keep runtime config
 * files minimal to avoid duplication and drift.
 */
/**
 * Environment configuration controlling debug behavior and defaults.
 *
 * @remarks
 * Use different instances for `development`, `staging`, and `production` in
 * the `ApplicationConfig.application.environments` block.
 *
 * @example
 * ```ts
 * const devEnv: EnvironmentConfig = {
 *   debug: true,
 *   logLevel: "verbose",
 *   hotReload: true,
 *   mockData: true,
 * };
 * ```
 */
export interface EnvironmentConfig {
  /** Enable debug mode for detailed logging and error reporting. */
  debug: boolean;
  /** Logging level for the environment. */
  logLevel: "verbose" | "info" | "warn" | "error";
  /** Enable hot reload for development. */
  hotReload: boolean;
  /** Use mock data instead of real data sources. */
  mockData: boolean;
}

/**
 * MCP server configuration settings.
 *
 * @remarks
 * When `embedded.enabled=true`, the extension may launch the stdio server
 * internally. For HTTP, set `defaultPort` and ensure firewall rules allow it.
 *
 * @example
 * ```ts
 * const server: McpServerConfig = {
 *   protocol: "stdio",
 *   defaultPort: 3000,
 *   timeout: 10000,
 *   retries: 2,
 *   embedded: { enabled: true, autoStart: true },
 * };
 * ```
 */
export interface McpServerConfig {
  /** Protocol for MCP communication. */
  protocol: "http" | "stdio" | "websocket";
  /** Default port for HTTP server. */
  defaultPort: number;
  /** Request timeout in milliseconds. */
  timeout: number;
  /** Number of retry attempts for failed requests. */
  retries: number;
  /** Embedded server settings. */
  embedded: {
    /** Enable embedded server mode. */
    enabled: boolean;
    /** Automatically start embedded server. */
    autoStart: boolean;
  };
}

/**
 * MCP client configuration settings.
 *
 * @example
 * ```ts
 * const client: McpClientConfig = {
 *   maxConcurrentRequests: 8,
 *   requestTimeout: 8000,
 *   retryDelay: 250,
 * };
 * ```
 */
export interface McpClientConfig {
  /** Maximum number of concurrent requests. */
  maxConcurrentRequests: number;
  /** Request timeout in milliseconds. */
  requestTimeout: number;
  /** Delay between retry attempts in milliseconds. */
  retryDelay: number;
}

/**
 * Agent execution priority levels.
 */
export type AgentPriority = "high" | "medium" | "low";

/**
 * Agent definition with comprehensive metadata.
 *
 * @remarks
 * `capabilities` describe high-level functions; detailed behavior is driven by
 * the agent's typed configuration (see `ApplicationConfig.agents`).
 *
 * @example
 * ```ts
 * const commAgent: AgentDefinition = {
 *   name: "communicationAgent",
 *   description: "Formats responses for end users",
 *   label: "Communication",
 *   displayName: "Communication Agent",
 *   className: "CommunicationAgent",
 *   capabilities: ["formatting", "templating"],
 *   responsibility: "Owns all user-facing formatting",
 *   userFacing: { friendlyDescription: "Converts data into readable messages" },
 * };
 * ```
 *
 */
export interface AgentDefinition {
  /** Technical name used in code/imports. */
  name: string;
  /** Human-readable description of agent purpose. */
  description: string;
  /** Short label for UI display and templates. */
  label: string;
  /** Formal display name for user interfaces. */
  displayName: string;
  /** Class name used for instantiation. */
  className: string;
  /** List of capabilities this agent provides. */
  capabilities: string[];
  /** Primary responsibility summary. */
  responsibility: string;
  /** User-facing metadata for enhanced UX. */
  userFacing?: {
    /** Friendly description for end users. */
    friendlyDescription?: string;
    /** When users should use this agent. */
    useWhen?: string[];
    /** Example user queries. */
    exampleQueries?: string[];
    /** Help text for users. */
    helpText?: string;
  };
  /** Application-facing metadata for improved logging/logic. */
  applicationFacing?: {
    /** Detailed technical description. */
    technicalDescription?: string;
    /** Dependencies on other agents. */
    dependencies?: string[];
    /** Performance characteristics. */
    performance?: {
      expectedResponseTime?: number;
      memoryUsage?: string;
      complexity?: "low" | "medium" | "high";
    };
    /** Error handling strategies. */
    errorHandling?: {
      retryStrategy?: "none" | "exponential" | "fixed";
      maxRetries?: number;
      fallbackAgent?: string;
    };
    /** Monitoring and metrics. */
    monitoring?: {
      healthCheckEndpoint?: string;
      metricsToTrack?: string[];
      alertThresholds?: Record<string, number>;
    };
  };
}

/**
 * Agent profile configuration.
 *
 * @example
 * ```ts
 * const profile: AgentProfile = {
 *   priority: "high",
 *   timeout: 5000,
 *   cacheEnabled: true,
 * };
 * ```
 */
export interface AgentProfile {
  /** Execution priority for the agent. */
  priority: AgentPriority;
  /** Maximum execution timeout in milliseconds. */
  timeout: number;
  /** Enable caching for this agent. */
  cacheEnabled?: boolean;
}

/**
 * Global agent configuration settings.
 *
 * @example
 * ```ts
 * const global: AgentGlobalConfig = {
 *   maxExecutionTime: 15000,
 *   enableTelemetry: true,
 *   cacheEnabled: true,
 *   cacheTtl: 60000,
 * };
 * ```
 */
export interface AgentGlobalConfig {
  /** Maximum execution time for any agent in milliseconds. */
  maxExecutionTime: number;
  /** Enable telemetry collection for agents. */
  enableTelemetry: boolean;
  /** Enable caching globally for agents. */
  cacheEnabled: boolean;
  /** Cache time-to-live in milliseconds. */
  cacheTtl: number;
}

/**
 * Data validation configuration.
 *
 * @example
 * ```ts
 * const validation: DataValidationConfig = {
 *   strictMode: true,
 *   validateOnLoad: true,
 *   validateRelationships: true,
 * };
 * ```
 */
export interface DataValidationConfig {
  /** Enable strict validation mode. */
  strictMode: boolean;
  /** Validate data on load. */
  validateOnLoad: boolean;
  /** Validate relationship integrity. */
  validateRelationships: boolean;
}

/**
 * Cache configuration settings.
 *
 * @example
 * ```ts
 * const cache: CacheConfig = {
 *   enabled: true,
 *   directory: ".cache",
 *   maxSize: "256mb",
 *   ttl: 60000,
 * };
 * ```
 */
export interface CacheConfig {
  /** Enable caching. */
  enabled: boolean;
  /** Cache directory path. */
  directory: string;
  /** Maximum cache size. */
  maxSize: string;
  /** Time-to-live for cached items in milliseconds. */
  ttl: number;
}

/**
 * Logging file configuration.
 *
 * @example
 * ```ts
 * const file: LoggingFileConfig = {
 *   enabled: true,
 *   path: "logs/app.log",
 *   maxSize: "10mb",
 *   maxFiles: 5,
 * };
 * ```
 */
export interface LoggingFileConfig {
  /** Enable file logging. */
  enabled: boolean;
  /** Log file path. */
  path: string;
  /** Maximum file size before rotation. */
  maxSize: string;
  /** Maximum number of log files to keep. */
  maxFiles: number;
}

/**
 * Rate limiting configuration.
 *
 * @example
 * ```ts
 * const rl: RateLimitConfig = {
 *   enabled: true,
 *   windowMs: 60000,
 *   maxRequests: 100,
 * };
 * ```
 */
export interface RateLimitConfig {
  /** Enable rate limiting. */
  enabled: boolean;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests per window. */
  maxRequests: number;
}

/**
 * Performance monitoring configuration.
 *
 * @example
 * ```ts
 * const perfMon: PerformanceMonitoringConfig = {
 *   enabled: true,
 *   sampleRate: 0.25,
 * };
 * ```
 */
export interface PerformanceMonitoringConfig {
  /** Enable performance monitoring. */
  enabled: boolean;
  /** Sample rate for monitoring (0-1). */
  sampleRate: number;
}

/**
 * Memory management configuration.
 *
 * @example
 * ```ts
 * const mem: MemoryConfig = {
 *   maxHeapSize: "1gb",
 *   gcThreshold: 0.7,
 * };
 * ```
 */
export interface MemoryConfig {
  /** Maximum heap size. */
  maxHeapSize: string;
  /** Garbage collection threshold (0-1). */
  gcThreshold: number;
}

/**
 * Experimental features configuration.
 *
 * @example
 * ```ts
 * const experimental: ExperimentalConfig = {
 *   enableAdvancedCaching: false,
 *   enableParallelProcessing: true,
 *   enableStreamingResponses: false,
 * };
 * ```
 */
export interface ExperimentalConfig {
  /** Enable advanced caching features. */
  enableAdvancedCaching: boolean;
  /** Enable parallel processing. */
  enableParallelProcessing: boolean;
  /** Enable streaming responses. */
  enableStreamingResponses: boolean;
}

/**
 * Extension features configuration.
 *
 * @example
 * ```ts
 * const ext: ExtensionConfig = {
 *   allowThirdParty: false,
 *   sandboxMode: true,
 * };
 * ```
 */
export interface ExtensionConfig {
  /** Allow third-party extensions. */
  allowThirdParty: boolean;
  /** Run extensions in sandbox mode. */
  sandboxMode: boolean;
}

/**
 * JSON schema validation configuration.
 *
 * @example
 * ```ts
 * const schema: JsonSchemaConfig = {
 *   pattern: "docs/*.json",
 *   schema: "schemas/doc.schema.json",
 *   description: "Validate docs JSON files",
 * };
 * ```
 *
 * @see docs/tools/validateJson/README.md
 */
export interface JsonSchemaConfig {
  /** File pattern to match. */
  pattern: string;
  /** Path to JSON schema file. */
  schema: string;
  /** Human-readable description of validation purpose. */
  description: string;
}

/**
 * Markdown validation configuration.
 *
 * @example
 * ```ts
 * const md: MarkdownConfig = {
 *   include: ["docs/*.md"],
 *   exclude: ["_ARCHIVE/**"],
 *   requiredFrontMatter: ["title"],
 *   requiredSections: ["## Logs"],
 * };
 * ```
 *
 * @see docs/tools/validateMarkdown/README.md
 */
export interface MarkdownConfig {
  /** File patterns to include in validation. */
  include: string[];
  /** File patterns to exclude from validation. */
  exclude: string[];
  /** Required front matter fields. */
  requiredFrontMatter: string[];
  /** Required section headings. */
  requiredSections: string[];
}

/**
 * Report generation configuration.
 *
 * @example
 * ```ts
 * const reportCfg: ReportConfig = { output: "coverage/report.json" };
 * ```
 */
export interface ReportConfig {
  /** Output path for generated reports. */
  output: string;
}

/**
 * Comprehensive application configuration structure.
 *
 * @remarks
 * Serves as the single entry point for app configuration. External tools can
 * generate or validate this structure during build.
 *
 * @example
 * See generated docs for a complete sample.
 *
 * @see docs/config/application.config/variables/applicationConfig.md
 * @see src/config/application.config.ts
 */
export interface ApplicationConfig {
  /** Application metadata and environment settings. */
  application: {
    /** Application name. */
    name: string;
    /** Application version. */
    version: string;
    /** Application description. */
    description: string;
    /** Environment-specific configurations. */
    environments: {
      development: EnvironmentConfig;
      staging: EnvironmentConfig;
      production: EnvironmentConfig;
    };
  };

  /** MCP (Model Context Protocol) configuration. */
  mcp: {
    /** Server configuration settings. */
    server: McpServerConfig;
    /** Client configuration settings. */
    client: McpClientConfig;
  };

  /** Agent configuration and profiles. */
  agents: {
    /** Global agent settings. */
    global: AgentGlobalConfig;
    /** Detailed agent definitions with metadata. */
    definitions: {
      orchestrator: AgentDefinition;
      relevantDataManager: AgentDefinition;
      userContext?: AgentDefinition;
      databaseAgent: AgentDefinition;
      dataAgent: AgentDefinition;
      clarificationAgent: AgentDefinition;
    };
    /** Individual agent profiles. */
    profiles: {
      orchestrator: AgentProfile;
      relevantDataManager: AgentProfile;
      userContext?: AgentProfile;
      databaseAgent: AgentProfile;
      dataAgent: AgentProfile;
      clarificationAgent: AgentProfile;
    };
    /** Template replacement mappings. */
    templateReplacements?: Record<string, string>;
  };

  /** Data management configuration. */
  data: {
    /** Available data categories. */
    categories: string[];
    /** Data validation settings. */
    validation: DataValidationConfig;
    /** Cache configuration. */
    cache: CacheConfig;
  };

  /** TypeScript compilation settings. */
  typescript: {
    /** Files to include in compilation. */
    include: string[];
  };

  /** JSON schema validation configurations. */
  jsonSchemas: JsonSchemaConfig[];

  /** Markdown validation configuration. */
  markdown: MarkdownConfig;

  /** Report generation configuration. */
  report: ReportConfig;

  /** Logging configuration. */
  logging: {
    /** Default log level. */
    level: string;
    /** Log output format. */
    format: string;
    /** Log output destinations. */
    outputs: string[];
    /** File logging configuration. */
    file: LoggingFileConfig;
  };

  /** Security configuration. */
  security: {
    /** Enable CORS support. */
    enableCORS: boolean;
    /** Allowed origins for CORS. */
    allowedOrigins: string[];
    /** Rate limiting configuration. */
    rateLimit: RateLimitConfig;
  };

  /** Performance configuration. */
  performance: {
    /** Performance monitoring settings. */
    monitoring: PerformanceMonitoringConfig;
    /** Memory management settings. */
    memory: MemoryConfig;
  };

  /** Feature flags and experimental settings. */
  features: {
    /** Experimental features configuration. */
    experimental: ExperimentalConfig;
    /** Extension management configuration. */
    extensions: ExtensionConfig;
  };
}
