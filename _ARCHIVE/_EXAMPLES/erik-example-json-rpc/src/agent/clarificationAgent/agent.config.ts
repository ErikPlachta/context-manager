/**
 * @packageDocumentation Clarification Agent Configuration
 *
 * Defines all settings for the clarification agent, which handles ambiguous user
 * requests and provides guidance to help users formulate better queries. This agent
 * serves as a fallback when user queries cannot be routed to specialized agents,
 * offering helpful guidance and context to improve query quality and user experience.
 */

import type { AgentConfigDefinition } from "@internal-types/agentConfig";
import { CONFIG_IDS } from "@internal-types/configRegistry";

/**
 * Complete configuration for the Clarification Agent
 *
 * The clarification agent specializes in handling unclear or ambiguous requests,
 * providing users with guidance, examples, and context to help them ask better
 * questions and get more useful results from the system.
 */
export const clarificationAgentConfig: AgentConfigDefinition = {
  /**
   * Unique configuration schema identifier from central registry
   */
  $configId: CONFIG_IDS.CLARIFICATION_AGENT,

  /**
   * Basic agent identity and metadata
   */
  agent: {
    /** Unique agent identifier used in routing and logging */
    id: "clarification-agent",

    /** Human-readable name displayed in UI */
    name: "Clarification Agent",

    /** Semantic version for tracking configuration changes */
    version: "1.0.0",

    /** Comprehensive description of agent purpose and capabilities */
    description:
      "Handles ambiguous user requests and provides guidance to help users formulate actionable queries",
  },

  /**
   * Clarification agent-specific configuration section
   */
  clarification: {
    /**
     * User guidance and assistance settings
     */
    guidance: {
      /** Maximum number of suggestions to provide per clarification */
      maxSuggestions: 5,

      /** Whether to include category-specific examples in guidance */
      includeCategoryExamples: true,

      /** Whether to include query templates to help users */
      includeQueryTemplates: true,

      /** Whether to suggest alternative phrasings for ambiguous queries */
      suggestAlternativePhrasings: true,

      /** Types of guidance to provide */
      guidanceTypes: [
        "query_refinement",
        "category_suggestions",
        "example_questions",
        "available_data_overview",
        "related_topics",
      ],

      /** Tone and style for clarification responses */
      responseStyle: {
        tone: "helpful",
        formality: "friendly",
        includeEncouragement: true,
        maxResponseLength: 500,
      },

      /** Help system configuration for capability discovery */
      helpSystem: {
        /** Whether to enable the help command system */
        enabled: true,

        /** Whether to list all available agent capabilities */
        listAgentCapabilities: true,

        /** Whether to include example queries for each agent */
        includeExampleQueries: true,

        /** Maximum number of example queries per agent */
        maxExamplesPerAgent: 3,

        /** Whether to include category summaries in help */
        includeCategorySummaries: true,

        /** Maximum number of categories to list in help */
        maxCategoriesToList: 5,
      },
    },

    /**
     * Escalation and fallback handling
     */
    escalation: {
      /** Number of clarification attempts before escalating */
      escalationThreshold: 3,

      /** Available fallback strategies when clarification fails */
      fallbackStrategies: [
        "provide_general_help",
        "suggest_browsing_categories",
        "offer_tutorial_guidance",
        "redirect_to_documentation",
      ],

      /** Maximum number of clarification rounds with user */
      maxClarificationRounds: 3,

      /** Whether to automatically suggest switching to human support */
      suggestHumanSupportAfterMaxRounds: true,

      /** Time window for considering consecutive clarification requests (minutes) */
      clarificationTimeWindow: 15,
    },

    /**
     * Knowledge base integration settings
     */
    knowledgeBase: {
      /** Whether to search knowledge base for relevant context */
      enableKnowledgeSearch: true,

      /** Maximum number of knowledge snippets to include */
      maxKnowledgeSnippets: 2,

      /** Minimum relevance threshold for knowledge snippets (0.0 - 1.0) */
      relevanceThreshold: 0.6,

      /** Whether to rank knowledge snippets by relevance */
      enableKnowledgeRanking: true,

      /** Types of knowledge sources to search */
      knowledgeSources: [
        "category_descriptions",
        "example_queries",
        "data_schemas",
        "relationship_definitions",
        "user_guides",
      ],

      /** Maximum search time for knowledge lookup (milliseconds) */
      knowledgeSearchTimeout: 3000,
    },

    /**
     * Agent routing and coordination
     */
    routing: {
      /** Whether to analyze missing signals for better agent routing */
      analyzeMissingSignals: true,

      /** Whether to suggest alternative agents when appropriate */
      suggestAlternativeAgents: true,

      /** Maximum number of candidate agents to consider */
      maxCandidateAgents: 3,

      /** Confidence threshold for agent routing suggestions */
      routingConfidenceThreshold: 0.5,

      /** Whether to provide agent capability summaries */
      includeAgentCapabilitySummaries: true,
    },

    /**
     * Context analysis and interpretation
     */
    contextAnalysis: {
      /** Whether to analyze user intent from query context */
      enableIntentAnalysis: true,

      /** Whether to identify missing query components */
      identifyMissingComponents: true,

      /** Whether to suggest query structure improvements */
      suggestQueryStructure: true,

      /** Whether to detect and handle domain-specific terminology */
      handleDomainTerminology: true,

      /** Minimum context confidence for making suggestions */
      contextConfidenceThreshold: 0.4,
    },
  },

  /**
   * User-facing configuration for better experience
   */
  userFacing: {
    /** Friendly description shown to users */
    friendlyDescription:
      "I help clarify unclear questions and guide you toward asking more specific queries that will get better results from our system.",

    /** When to recommend using this agent */
    useWhen: [
      "Your question is too broad or vague",
      "You're not sure what data is available",
      "You need help formulating a specific query",
      "You want to understand what questions you can ask",
      "You're new to the system and need guidance",
    ],

    /** Example interactions that trigger this agent */
    exampleQueries: [
      "I need some information about our company",
      "Can you help me with data analysis?",
      "What can I ask about?",
      "I'm looking for something but don't know where to start",
      "What kind of reports can you generate?",
    ],

    /** Help text for users */
    helpText:
      "I'll help you clarify your question and guide you to the right information. Feel free to ask me anything, even if you're not sure exactly what you're looking for!",
  },

  /**
   * Performance and optimization settings
   */
  performance: {
    /** Enable response caching for common clarifications */
    enableResponseCaching: true,

    /** Cache time-to-live for clarification responses (milliseconds) */
    responseCacheTTL: 60 * 60 * 1000, // 1 hour

    /** Maximum response time for clarification (milliseconds) */
    maxResponseTime: 5000,

    /** Enable parallel processing for knowledge search and routing analysis */
    enableParallelProcessing: true,

    /** Batch size for processing multiple clarification requests */
    processingBatchSize: 5,
  },

  /**
   * Telemetry and monitoring configuration
   */
  telemetry: {
    /** Log all clarification requests for analysis */
    logQueries: true,

    /** Log clarification response times */
    logPerformance: true,

    /** Track knowledge base search effectiveness */
    logCacheStats: true,

    /** Threshold for logging slow clarification responses (milliseconds) */
    slowQueryThreshold: 3000,

    /** Track clarification success rates */
    trackClarificationSuccess: true,

    /** Track user satisfaction with clarifications */
    trackUserSatisfaction: true,
  },

  /**
   * Error handling and recovery settings
   */
  errorHandling: {
    /** Maximum retry attempts for failed clarifications */
    maxRetries: 1,

    /** Base delay between retry attempts (milliseconds) */
    retryDelay: 1000,

    /** Use exponential backoff for retries */
    exponentialBackoff: false,

    /** Fallback to generic help when clarification fails */
    fallbackToGenericHelp: true,

    /** Continue with partial information when some sources fail */
    allowPartialClarification: true,

    /** Gracefully handle knowledge base failures */
    gracefulKnowledgeFailure: true,
  },
};
