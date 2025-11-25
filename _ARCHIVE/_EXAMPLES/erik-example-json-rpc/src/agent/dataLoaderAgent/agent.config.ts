/**
 * @packageDocumentation DataLoader Agent Configuration
 *
 * Defines all settings for the data loader agent, which specializes in file I/O operations,
 * data validation, and path resolution for JSON data files. Provides centralized data loading
 * with runtime type checking and comprehensive error reporting.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the DataLoader Agent
 *
 * The data loader agent handles all file operations for loading and validating
 * business data. It provides type-safe data loading with detailed error context
 * and flexible path resolution strategies.
 */
export const dataLoaderAgentConfig: AgentConfigDefinition = {
  /**
   * Unique configuration schema identifier from central registry
   */
  $configId: CONFIG_IDS.DATA_LOADER_AGENT,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "data-loader-agent",

    /** Human-readable name displayed in UI */
    name: "DataLoader Agent",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Comprehensive description of agent purpose and capabilities */
    description:
      "Centralized file I/O and data validation agent for loading JSON data files with runtime type checking and comprehensive error handling",
  },

  /**
   * DataLoader agent-specific configuration section
   */
  dataLoader: {
    /**
     * Data validation settings
     */
    validation: {
      /** Enable strict type checking against TypeScript interfaces */
      enableStrictTypeChecking: true,

      /** Allow loading partial records with missing optional fields */
      allowPartialRecords: false,

      /** Validate data immediately on load (vs lazy validation) */
      validateOnLoad: true,

      /** Enable type guards for runtime validation */
      useTypeGuards: true,

      /** Maximum number of validation errors to collect before failing */
      maxValidationErrors: 10,

      /** Whether to log validation warnings (non-fatal issues) */
      logValidationWarnings: true,
    },

    /**
     * File operation settings
     */
    fileOperations: {
      /** Default file encoding for reading JSON files */
      encoding: "utf-8" as const,

      /** Maximum file size in bytes (10MB default) */
      maxFileSize: 10485760,

      /** Enable caching of loaded files to reduce I/O */
      enableCaching: true,

      /** Cache TTL in milliseconds (5 minutes default) */
      cacheTTL: 300000,

      /** Maximum number of files to keep in cache */
      maxCacheEntries: 100,

      /** Enable synchronous file operations (vs async) */
      allowSyncOperations: true,

      /** Retry failed file reads */
      enableRetry: true,

      /** Maximum retry attempts for failed reads */
      maxRetries: 3,

      /** Delay between retries in milliseconds */
      retryDelay: 100,
    },

    /**
     * Path resolution settings
     */
    pathResolution: {
      /** Enable fallback to examples directory if primary path not found */
      enableExamplesFallback: true,

      /** Default examples directory name */
      examplesDirectory: "examples",

      /** Resolve relative paths from data root */
      resolveFromDataRoot: true,

      /** Enable symlink resolution */
      followSymlinks: false,

      /** Normalize paths to prevent directory traversal */
      normalizePaths: true,

      /** Allow absolute paths (security consideration) */
      allowAbsolutePaths: true,
    },

    /**
     * Error handling and reporting settings
     */
    errorHandling: {
      /** Include stack traces in error messages */
      includeStackTrace: true,

      /** Include file path in error messages */
      provideFilePath: true,

      /** Suggest recovery actions in error messages */
      suggestRecovery: true,

      /** Wrap native errors in custom DataLoaderError */
      wrapNativeErrors: true,

      /** Log errors to telemetry */
      logToTelemetry: true,

      /** Error severity threshold for logging */
      logSeverityThreshold: "warning" as const,
    },

    /**
     * Performance and optimization settings
     */
    performance: {
      /** Enable parallel loading for bulk operations */
      enableParallelLoading: false,

      /** Maximum concurrent file operations */
      maxConcurrentOperations: 5,

      /** Enable streaming for large files */
      enableStreaming: false,

      /** File size threshold for streaming (1MB) */
      streamingThreshold: 1048576,

      /** Enable memory optimization for large datasets */
      enableMemoryOptimization: true,

      /** Maximum memory usage in bytes (50MB) */
      maxMemoryUsage: 52428800,
    },

    /**
     * Discovery and bulk loading settings
     */
    discovery: {
      /** Enable automatic category discovery from directories */
      enableAutoDiscovery: true,

      /** Required files for valid category (e.g., category.json, records.json) */
      requiredCategoryFiles: ["category.json", "records.json"],

      /** Optional files that enhance category but aren't required */
      optionalCategoryFiles: [
        "schemas",
        "types",
        "examples",
        "queries",
        "relationships.json",
      ],

      /** Skip hidden files and directories (starting with .) */
      skipHiddenFiles: true,

      /** Skip directories matching these patterns */
      skipPatterns: ["node_modules", ".git", "dist", "out"],

      /** Maximum directory depth for discovery */
      maxDepth: 3,

      /** Continue discovery on individual category failures */
      continueOnError: true,

      /** Log warnings for skipped/failed categories */
      logDiscoveryWarnings: true,
    },
  },
};
