/**
 * @packageDocumentation Data Agent Configuration
 *
 * Defines all settings for the data agent, which specializes in generating insights,
 * building exploration plans, and mapping relationships between business categories.
 * Acts as an analytical engine that discovers patterns, connections, and actionable
 * insights from business data across multiple categories.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the Data Agent
 *
 * The data agent excels at high-level analysis, insight generation, and strategic
 * data exploration planning. It helps users understand complex relationships
 * and discover actionable patterns in their business data.
 */
export const dataAgentConfig: AgentConfigDefinition = {
  /**
   * Unique configuration schema identifier from central registry
   */
  $configId: CONFIG_IDS.DATA_AGENT,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "data-agent",

    /** Human-readable name displayed in UI */
    name: "Data Agent",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Comprehensive description of agent purpose and capabilities */
    description:
      "Generates insights, builds exploration plans, and maps relationships between business categories for strategic data analysis",
  },

  /**
   * Data agent-specific configuration section
   */
  data: {
    /**
     * Analysis and insight generation settings
     */
    analysis: {
      /** Whether to automatically generate insights from data patterns */
      enableInsightGeneration: true,

      /** Maximum depth for insight analysis (levels of related data to examine) */
      maxInsightDepth: 3,

      /** Whether to perform analysis across different business categories */
      crossCategoryAnalysis: true,

      /** Minimum confidence threshold for generated insights (0.0 - 1.0) */
      insightConfidenceThreshold: 0.7,

      /** Maximum number of insights to generate per analysis */
      maxInsightsPerAnalysis: 10,

      /** Categories of insights to focus on */
      insightCategories: [
        "patterns",
        "anomalies",
        "correlations",
        "trends",
        "opportunities",
        "risks",
      ],

      /** Enable automatic insight ranking by relevance */
      enableInsightRanking: true,

      /** Maximum number of records to highlight in topic overviews */
      highlightRecordLimit: 3,

      /** Maximum number of supporting records to include per category */
      maxSupportingRecords: 2,

      /** Maximum number of example hints to show in exploration plans */
      maxExampleHints: 5,
    },

    /**
     * Data quality and anomaly detection settings
     */
    quality: {
      /** Threshold for detecting missing fields (0.0 - 1.0) - 0.1 means 10% missing triggers alert */
      missingFieldThreshold: 0.1,

      /** Whether to enable automatic anomaly detection */
      anomalyDetectionEnabled: true,

      /** Minimum number of records required for meaningful analysis */
      minimumRecordCount: 5,

      /** Field completeness threshold for data quality reporting (0.0 - 1.0) */
      fieldCompletenessThreshold: 0.9,
    },

    /**
     * Data exploration planning configuration
     */
    exploration: {
      /** Maximum number of steps in an exploration plan */
      maxExplorationSteps: 8,

      /** Whether to automatically generate exploration plans */
      enableAutomaticPlanGeneration: true,

      /** Complexity limit for generated exploration plans */
      planComplexityLimit: "medium",

      /** Whether to include example queries in exploration steps */
      includeExampleQueries: true,

      /** Whether to suggest data validation steps */
      includeDateValidationSteps: true,

      /** Priority categories for exploration (ordered by importance) */
      explorationPriorities: [
        "people",
        "departments",
        "applications",
        "companyPolicies",
        "companyResources",
      ],

      /** Enable dynamic plan adjustment based on findings */
      enableDynamicPlanAdjustment: true,

      /** Minimum number of supporting resources required for exploration */
      minSupportingResources: 2,
    },

    /**
     * Relationship mapping and analysis settings
     */
    relationships: {
      /** Whether to enable comprehensive relationship mapping */
      enableRelationshipMapping: true,

      /** Maximum depth to traverse relationships (degrees of separation) */
      maxRelationshipDepth: 4,

      /** Whether to include weak/indirect relationships in analysis */
      includeWeakRelationships: false,

      /** Minimum relationship strength threshold (0.0 - 1.0) */
      relationshipStrengthThreshold: 0.3,

      /** Types of relationships to track and analyze */
      relationshipTypes: [
        "direct",
        "hierarchical",
        "dependency",
        "correlation",
        "temporal",
        "functional",
      ],

      /** Enable relationship impact assessment */
      enableImpactAssessment: true,

      /** Maximum number of relationships to map per analysis */
      maxRelationshipsPerAnalysis: 25,
    },

    /**
     * Topic overview and synthesis settings
     */
    synthesis: {
      /** Whether to create comprehensive topic overviews */
      enableTopicOverviews: true,

      /** Maximum number of highlight records to include in overviews */
      maxHighlightRecords: 5,

      /** Whether to include validation reports in overviews */
      includeValidationReports: true,

      /** Whether to synthesize findings from multiple data sources */
      enableMultiSourceSynthesis: true,

      /** Confidence threshold for including findings in synthesis */
      synthesisConfidenceThreshold: 0.6,
    },

    /**
     * Performance and optimization settings
     */
    performance: {
      /** Enable caching for frequently accessed topic overviews */
      enableTopicOverviewCaching: true,

      /** Cache time-to-live for topic overviews (milliseconds) */
      topicOverviewCacheTTL: 30 * 60 * 1000, // 30 minutes

      /** Maximum concurrent analysis operations */
      maxConcurrentAnalyses: 3,

      /** Timeout for individual analysis operations (milliseconds) */
      analysisTimeout: 60000, // 1 minute

      /** Enable parallel processing for relationship mapping */
      enableParallelRelationshipMapping: true,

      /** Batch size for processing large datasets */
      processingBatchSize: 100,
    },

    /**
     * Search and filtering configuration
     */
    search: {
      /** Maximum number of search results to return */
      maxResults: 50,

      /** Enable fuzzy matching for search terms */
      enableFuzzyMatching: true,

      /** Search operation timeout (milliseconds) */
      searchTimeout: 5000, // 5 seconds

      /** Minimum match score for including results (0.0 - 1.0) */
      minimumMatchScore: 0.3,

      /** Enable filtering results by category */
      enableCategoryFiltering: true,

      /** Prioritize more recently modified results */
      prioritizeRecentResults: false,
    },
  },

  /**
   * User-facing configuration for better experience
   */
  userFacing: {
    /** Friendly description shown to users */
    friendlyDescription:
      "I analyze business data to uncover insights, create exploration plans, and map relationships between different areas of your organization.",

    /** When to recommend using this agent */
    useWhen: [
      "You want to discover patterns in your business data",
      "You need to understand relationships between departments, people, and processes",
      "You're looking for actionable insights from your organizational data",
      "You want to plan a comprehensive data exploration strategy",
      "You need to analyze the impact of changes across business categories",
    ],

    /** Example queries that work well with this agent */
    exampleQueries: [
      "What patterns can you find in our application usage across departments?",
      "How are our teams connected through shared applications and policies?",
      "Create an exploration plan for analyzing our organizational efficiency",
      "What insights can you discover about our company resource utilization?",
      "Map the relationships between our people, projects, and policies",
    ],

    /** Help text for users */
    helpText:
      "Ask me to analyze data patterns, create exploration plans, or map relationships. I work best with questions about discovering insights and understanding connections in your business data.",
  },

  /**
   * Telemetry and monitoring configuration
   */
  telemetry: {
    /** Log all data analysis operations for debugging */
    logQueries: true,

    /** Log performance metrics for analysis operations */
    logPerformance: true,

    /** Log caching statistics for optimization */
    logCacheStats: true,

    /** Threshold for logging slow analysis operations (milliseconds) */
    slowQueryThreshold: 5000,

    /** Track insight generation metrics */
    trackInsightMetrics: true,

    /** Track relationship mapping metrics */
    trackRelationshipMetrics: true,
  },

  /**
   * Error handling and recovery settings
   */
  errorHandling: {
    /** Maximum retry attempts for failed analyses */
    maxRetries: 2,

    /** Base delay between retry attempts (milliseconds) */
    retryDelay: 2000,

    /** Use exponential backoff for retries */
    exponentialBackoff: true,

    /** Fallback to simpler analysis on complex operation failures */
    fallbackToSimpleAnalysis: true,

    /** Continue partial analysis when some data sources fail */
    allowPartialAnalysis: true,

    /** Gracefully handle missing relationship data */
    gracefulRelationshipHandling: true,
  },
};
