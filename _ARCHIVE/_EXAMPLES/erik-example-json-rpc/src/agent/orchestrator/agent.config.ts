/**
 * @packageDocumentation Orchestrator configuration using TypeScript for full type safety and documentation
 *
 * This configuration defines how the orchestrator agent behaves, including:
 * - Intent classification and routing logic
 * - Text processing parameters for keyword extraction
 * - Escalation strategies for ambiguous requests
 * - Performance and monitoring settings
 *
 * Benefits of TypeScript config:
 * - Full IntelliSense support in IDEs
 * - Compile-time type checking
 * - Inline documentation with JSDoc
 * - Ability to use computed values and imports
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the Orchestrator agent.
 *
 * The orchestrator's primary responsibility is intent classification and routing.
 * It analyzes incoming user questions to determine which specialized agent
 * should handle the request.
 */
export const orchestratorConfig: AgentConfigDefinition = {
  /**
   * Unique identifier for this configuration schema.
   * Used for validation and versioning of configuration format.
   */
  $configId: CONFIG_IDS.ORCHESTRATOR,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "orchestrator",

    /** Human-readable name displayed in UI */
    name: "Orchestrator",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Brief description of agent's primary purpose */
    description:
      "Routes questions to appropriate agents based on intent classification",
  },

  /**
   * Orchestration-specific configuration for intent classification and routing
   */
  orchestration: {
    /**
     * Intent definitions that map user questions to target agents.
     * Each intent represents a category of user request that should be
     * handled by a specific specialized agent.
     */
    intents: {
      /**
       * Metadata intent: Requests for schema information, data structure,
       * and category organization details.
       */
      metadata: {
        name: "metadata",
        description:
          "Requests for category metadata, schemas, and data structure information",

        /** Target agent that should handle this type of request */
        targetAgent: "relevant-data-manager",

        /**
         * Signal keywords that indicate this intent.
         * These words in user questions increase the confidence score
         * for classifying the request as this intent type.
         */
        signals: [
          "routing", // Orchestration-related queries
          "coordination", // Multi-agent workflow questions
          "intent", // Questions about capabilities
          "workflow", // Process-related questions
          "schema", // Data structure queries
          "metadata", // Information about data organization
          "catalog", // Data catalog requests (American English primary)
          "snapshot", // Data snapshot requests
        ],
      },

      /**
       * Records intent: Requests for specific data searches, filtering,
       * and record retrieval operations.
       */
      records: {
        name: "records",
        description: "Requests for specific record searches and filtering",
        targetAgent: "database-agent",
        signals: [
          "query", // Database query requests
          "records", // Explicit record requests
          "filter", // Filtering operations
          "list", // List/enumeration requests
          "search", // Search operations
          "find", // Find/lookup operations
        ],
      },

      /**
       * Insight intent: Requests for data analysis, pattern recognition,
       * and strategic recommendations.
       */
      insight: {
        name: "insight",
        description:
          "Requests for data analysis, insights, and exploration plans",
        targetAgent: "data-agent",
        signals: [
          "insight", // Explicit insight requests
          "plan", // Planning and strategy requests
          "narrative", // Story/explanation requests
          "connections", // Relationship analysis
          "analysis", // Data analysis requests
          "explore", // Exploration requests
        ],
      },

      /**
       * Clarification intent: Fallback for unclear, ambiguous, or
       * insufficient user requests.
       */
      clarification: {
        name: "clarification",
        description: "Fallback for unclear or ambiguous requests",
        targetAgent: "clarification-agent",
        signals: [
          "unclear", // Explicitly unclear requests
          "unknown", // Unknown/unspecified requests
          "missing context", // Requests lacking context
          "help", // General help requests
          "what", // Open-ended questions
          "how", // Process questions
        ],
      },
    },

    /**
     * Text processing configuration for keyword extraction and scoring.
     * These settings control how user questions are analyzed for intent classification.
     */
    textProcessing: {
      /**
       * Stop words to ignore during keyword extraction.
       * These common words don't contribute to intent classification
       * and are filtered out to focus on meaningful terms.
       */
      stopWords: [
        // Articles and determiners
        "the",
        "a",
        "an",

        // Common conjunctions and prepositions
        "and",
        "or",
        "but",
        "that",
        "this",
        "with",
        "into",
        "from",
        "about",
        "using",
        "based",
        "within",
        "without",

        // Common verbs and auxiliaries
        "will",
        "have",
        "should",
        "before",
        "after",

        // Pronouns
        "they",
        "their",
        "them",
        "your",

        // Question words (handled separately in intent classification)
        "what",
        "when",

        // Comparative and quantitative words
        "such",
        "like",
        "more",
        "also",
        "than",
        "each",
      ],

      /**
       * Minimum length for keywords to be considered in classification.
       * Shorter words are typically less meaningful for intent determination.
       */
      minimumKeywordLength: 3,

      /**
       * Scoring weights for different types of signal matches.
       * Higher weights give more influence in intent classification.
       */
      scoringWeights: {
        /** Weight for direct signal keyword matches */
        signalMatch: 2,

        /** Weight for focus area matches (highest priority) */
        focusMatch: 3,

        /** Weight for prompt starter matches (lower priority) */
        promptStarterMatch: 1,
      },
    },

    /**
     * Escalation configuration for handling classification failures
     * and ambiguous requests.
     */
    escalation: {
      /**
       * Conditions that trigger escalation to clarification agent.
       * When these situations occur, the orchestrator will request
       * more information from the user.
       */
      conditions: [
        "no suitable agent found", // No agent matches the request
        "multiple agents conflict", // Multiple agents have similar scores
        "insufficient context provided", // Request lacks necessary context
      ],

      /** Default agent to handle escalated requests */
      fallbackAgent: "clarification-agent",

      /** Maximum number of escalation attempts before giving up */
      maxRetries: 2,

      /**
       * Phrases that are considered too vague even if they match an intent.
       * When these phrases are detected, the request will be escalated to
       * clarification regardless of intent matching.
       */
      vaguePhrases: [
        // Generic record requests without category
        "list records",
        "show records",
        "get records",
        "find records",
        "display records",
        "retrieve records",
        // Generic data requests without context
        "show data",
        "get data",
        "list data",
        "fetch data",
        "get information",
        "show information",
        // Generic database requests
        "database info",
        "database data",
        "database records",
        "show database",
        "list database",
        // Too generic queries
        "tell me about",
        "what is",
        "info about",
        "information on",
      ],
    },

    /**
     * Configurable user-facing messages for various orchestrator responses.
     * These messages are presented to users in different scenarios.
     */
    messages: {
      /** Message when no intent can be determined from the user's question */
      noIntentDetected: "No clear intent detected from the question",

      /** Prompt asking for more context when intent detection fails */
      needMoreContext:
        "I need more context to help you properly. Could you provide more details about what you're looking for?",

      /** Prompt when question matches intent but lacks specificity */
      questionTooVague:
        "Your question is quite general. Could you provide more specific details about what you're looking for?",

      /** Default missing signals hints for vague questions */
      missingSignalsHint: ["specific context", "topic details"],

      /** Generic error message when processing fails */
      errorOccurred: "An error occurred while processing your request",

      /** Summary templates for different intents */
      summaries: {
        metadata: "Providing metadata information about {topic}",
        records: "Searching for {topic} records matching your criteria",
        insight: "Analyzing {topic} data to generate insights",
        clarification: "I need more information to help you properly",
        defaultTopic: "the requested data",
      },

      /** Guidance messages for different agent routing scenarios */
      guidance: {
        metadata: "Retrieving category schemas and structure information",
        recordsConnections: "Preparing to search across related categories",
        recordsFiltering: "Filtering records based on your criteria",
        insightPlan: ["Analyze data patterns", "Generate insights"],
        insightOverview: "Creating data exploration strategy",
        insightRecommendations: "Developing analytical recommendations",
        clarificationPrompt:
          "Please clarify what specific information you're looking for",
      },
    },
  },

  /**
   * Runtime execution configuration.
   * These settings control how the agent behaves during execution.
   */
  execution: {
    /**
     * Execution priority level.
     * High priority agents get preferential scheduling and resource allocation.
     */
    priority: "high" as const,

    /**
     * Maximum execution timeout in milliseconds.
     * Requests taking longer than this will be terminated.
     */
    timeout: 30000, // 30 seconds

    /**
     * Whether to cache results for identical requests.
     * Orchestrator typically doesn't cache since each request is unique.
     */
    cacheEnabled: false,

    /**
     * Retry strategy for failed executions.
     * Fixed strategy retries the same operation without modification.
     */
    retryStrategy: "fixed" as const,

    /** Maximum number of retry attempts for failed operations */
    maxRetries: 2,
  },

  /**
   * User-facing metadata for UI and help systems.
   * This information is shown to users to help them understand
   * when and how to use this agent.
   */
  userFacing: {
    /**
     * Friendly description shown in user interfaces.
     * Should be conversational and explain the agent's role clearly.
     */
    friendlyDescription:
      "I'm the coordinator who figures out which specialized agent can best help you with your question.",

    /**
     * Situations where users should interact with this agent.
     * Helps users understand when this agent is appropriate.
     */
    useWhen: [
      "You have a complex question that might need multiple agents",
      "Your request is ambiguous and needs to be routed properly",
      "You want to understand what capabilities are available",
    ],

    /**
     * Example queries that demonstrate this agent's capabilities.
     * These help users understand how to interact effectively.
     */
    exampleQueries: [
      "Can you help me find information about our company policies?",
      "I need to understand how departments connect to our applications",
      "What can you help me with?",
    ],

    /**
     * Brief help text shown in tooltips and quick help.
     * Should be concise but informative.
     */
    helpText:
      "Ask me anything about your business data and I'll route your question to the right specialist.",
  },

  /**
   * Application-facing metadata for logging, monitoring, and integration.
   * This information is used by the system for operational purposes.
   */
  applicationFacing: {
    /**
     * Technical description for developers and system administrators.
     * Should explain implementation details and architecture.
     */
    technicalDescription:
      "Central routing agent that analyzes user intent and directs requests to appropriate specialized agents",

    /**
     * Other agents that this agent depends on.
     * Used for dependency management and startup ordering.
     */
    dependencies: [
      "clarification-agent", // Fallback for unclear requests
      "relevant-data-manager", // Metadata for category-specific routing
    ],

    /**
     * List of capabilities this agent provides.
     * Used for capability discovery and routing decisions.
     */
    capabilities: [
      "intent-classification", // Analyze user intent from questions
      "agent-routing", // Route requests to appropriate agents
      "workflow-coordination", // Coordinate multi-agent workflows
      "escalation-management", // Handle unclear or failed requests
      "coordination-management", // Manage agent coordination
      "request-synthesis", // Combine results from multiple agents
    ],

    /**
     * Performance expectations and resource requirements.
     */
    performance: {
      /** Expected response time in milliseconds for typical requests */
      expectedResponseTime: 500, // 500ms for classification

      /** Memory usage classification for resource planning */
      memoryUsage: "low" as const, // Orchestrator is lightweight

      /** Computational complexity for scheduling decisions */
      complexity: "medium" as const, // Involves text analysis and scoring
    },

    /**
     * Error handling and recovery configuration.
     */
    errorHandling: {
      /** Strategy for retrying failed operations */
      retryStrategy: "fixed" as const,

      /** Maximum retry attempts before giving up */
      maxRetries: 2,

      /** Agent to handle requests when this agent fails */
      fallbackAgent: "clarification-agent",
    },

    /**
     * Monitoring and observability configuration.
     */
    monitoring: {
      /**
       * Metrics to track for this agent.
       * These metrics help monitor agent performance and behavior.
       */
      metricsToTrack: [
        "routing_accuracy", // How often routing decisions are correct
        "response_time", // Time to classify and route requests
        "escalation_rate", // Rate of requests escalated to clarification
        "intent_classification_confidence", // Confidence scores for classifications
      ],

      /**
       * Alert thresholds for monitoring systems.
       * When these thresholds are exceeded, alerts should be generated.
       */
      alertThresholds: {
        /** Alert if response time exceeds 1 second */
        response_time_ms: 1000,

        /** Alert if error rate exceeds 5% */
        error_rate_percent: 5,

        /** Alert if escalation rate exceeds 20% */
        escalation_rate_percent: 20,
      },
    },
  },
} as const;

/**
 * Type-safe accessor for orchestrator configuration.
 * Provides runtime access to configuration with full type safety.
 */
export default orchestratorConfig;
