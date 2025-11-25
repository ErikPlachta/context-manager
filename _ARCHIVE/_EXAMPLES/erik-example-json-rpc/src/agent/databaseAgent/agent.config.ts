/**
 * @packageDocumentation Database Agent Configuration
 *
 * Defines all settings for the database agent which handles structured data retrieval
 * with filtering, joins, and query optimization. Functions as a query engine that
 * simulates database operations over the MCP relevant-data workspace, providing
 * structured access to business category data including filtering and relationship
 * traversal capabilities.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the Database Agent
 *
 * The database agent specializes in structured data access patterns, providing
 * SQL-like query capabilities over business category data with caching,
 * performance optimization, and relationship-aware joins.
 */
export const databaseAgentConfig: AgentConfigDefinition = {
  /**
   * Unique configuration schema identifier from central registry
   */
  $configId: CONFIG_IDS.DATABASE_AGENT,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "database-agent",

    /** Human-readable name displayed in UI */
    name: "Database Agent",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Comprehensive description of agent purpose and capabilities */
    description:
      "Handles structured data retrieval with filtering, joins, and query optimization over business category datasets",
  },

  /**
   * Database-specific configuration section
   */
  database: {
    /**
     * Field alias mappings for different categories
     *
     * These aliases allow users to use convenient field names that map to
     * actual field names in the data records, improving usability.
     */
    fieldAliases: {
      /** People category field aliases */
      people: {
        /** Map "skill" queries to "skills" field */
        skill: "skills",
        /** Map "applicationId" queries to "applicationIds" field */
        applicationId: "applicationIds",
        /** Map "policyId" queries to "policyAcks" field */
        policyId: "policyAcks",
      },

      /** Department category field aliases */
      departments: {
        /** Map "applicationId" queries to "applicationIds" field */
        applicationId: "applicationIds",
        /** Map "policyId" queries to "policyIds" field */
        policyId: "policyIds",
      },

      /** Applications category field aliases */
      applications: {
        /** Map "policyId" queries to "relatedPolicyIds" field */
        policyId: "relatedPolicyIds",
      },

      /** Company policies category field aliases */
      companyPolicies: {
        /** Map "applicationId" queries to "applicationIds" field */
        applicationId: "applicationIds",
      },

      /** Company resources category field aliases */
      companyResources: {
        /** Map "applicationId" queries to "applicationIds" field */
        applicationId: "applicationIds",
        /** Map "policyId" queries to "linkedPolicyIds" field */
        policyId: "linkedPolicyIds",
      },
    },

    /**
     * Query performance and optimization settings
     */
    performance: {
      /**
       * Default cache configuration for database queries
       * Caching improves performance by storing frequent query results
       */
      caching: {
        /** Whether to enable caching by default for all queries */
        enabledByDefault: true,

        /** Default cache key prefix for organizing cached results */
        defaultKeyPrefix: "db-query",

        /** Maximum number of cached query results to maintain */
        maxCacheEntries: 1000,

        /** Cache entry time-to-live in milliseconds (24 hours) */
        cacheTTL: 24 * 60 * 60 * 1000,
      },

      /**
       * Query execution timeouts and limits
       */
      limits: {
        /** Maximum execution time for a single query in milliseconds */
        queryTimeout: 30000,

        /** Maximum number of records to return in a single query */
        maxResultSize: 10000,

        /** Maximum depth for relationship traversals */
        maxJoinDepth: 3,
      },
    },

    /**
     * Query validation and transformation settings
     */
    validation: {
      /**
       * Schema validation settings for query parameters
       */
      schemaValidation: {
        /** Whether to validate query criteria against known schemas */
        enableStrictValidation: true,

        /** Whether to allow unknown fields in query criteria */
        allowUnknownFields: false,

        /** Whether to auto-transform field names using aliases */
        autoTransformAliases: true,
      },

      /**
       * Data integrity checks during query execution
       */
      integrityChecks: {
        /** Whether to validate relationships before traversal */
        validateRelationships: true,

        /** Whether to check for missing referenced records */
        checkMissingReferences: true,

        /** Whether to warn about schema inconsistencies */
        warnOnSchemaIssues: true,
      },
    },

    /**
     * Supported query operations and their configurations
     */
    operations: {
      /**
       * Filter operation settings
       */
      filtering: {
        /** Supported comparison operators */
        operators: [
          "eq",
          "ne",
          "gt",
          "gte",
          "lt",
          "lte",
          "in",
          "nin",
          "contains",
          "startswith",
          "endswith",
        ],

        /** Whether to enable case-insensitive string comparisons */
        caseInsensitiveStrings: true,

        /** Whether to enable fuzzy matching for text fields */
        enableFuzzyMatching: false,
      },

      /**
       * Join operation settings for relationship traversal
       */
      joins: {
        /** Types of joins supported */
        supportedJoinTypes: ["inner", "left", "right"],

        /** Whether to enable automatic relationship discovery */
        autoDiscoverRelationships: true,

        /** Maximum number of records to load for join operations */
        maxJoinRecords: 1000,
      },

      /**
       * Aggregation operation settings
       */
      aggregation: {
        /** Supported aggregation functions */
        functions: ["count", "sum", "avg", "min", "max", "distinct"],

        /** Whether to enable group by operations */
        enableGroupBy: true,

        /** Maximum number of groups in group by operations */
        maxGroups: 100,
      },
    },
  },

  /**
   * Logging and telemetry configuration
   */
  telemetry: {
    /** Whether to log all database queries for debugging */
    logQueries: true,

    /** Whether to log query performance metrics */
    logPerformance: true,

    /** Whether to log cache hit/miss statistics */
    logCacheStats: true,

    /** Minimum query execution time (ms) to log as slow query */
    slowQueryThreshold: 1000,
  },

  /**
   * Error handling and recovery settings
   */
  errorHandling: {
    /** Maximum number of retry attempts for failed queries */
    maxRetries: 3,

    /** Base delay between retry attempts in milliseconds */
    retryDelay: 1000,

    /** Whether to use exponential backoff for retries */
    exponentialBackoff: true,

    /** Whether to fallback to uncached queries on cache errors */
    fallbackOnCacheError: true,
  },
};
