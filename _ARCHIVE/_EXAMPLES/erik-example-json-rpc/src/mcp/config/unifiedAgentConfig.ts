/**
 * @packageDocumentation Unified agent configuration system that consolidates all agent-related settings
 */

/**
 * Agent identifiers for type safety
 */
export type AgentIdentifier =
  | "orchestrator"
  | "relevant-data-manager"
  | "user-context"
  | "database-agent"
  | "data-agent"
  | "clarification-agent";

/**
 * Lightweight agent profile for orchestration logic
 *
 */
export interface OrchestrationProfile {
  readonly id: AgentIdentifier;
  readonly title: string;
  readonly description: string;
  readonly primarySignals: string[];
  readonly escalateWhen: string[];
}

/**
 * Execution settings for runtime behavior
 *
 */
export interface ExecutionProfile {
  priority: "high" | "medium" | "low";
  timeout: number;
  cacheEnabled?: boolean;
}

/**
 * Rich metadata for user and application interfaces
 *
 */
export interface RichMetadata {
  name: string;
  label: string;
  displayName: string;
  className: string;
  capabilities: string[];
  responsibility: string;
  userFacing: {
    friendlyDescription: string;
    useWhen: string[];
    exampleQueries: string[];
    helpText: string;
  };
  applicationFacing: {
    technicalDescription: string;
    dependencies: string[];
    performance: {
      expectedResponseTime: number;
      memoryUsage: "low" | "medium" | "high";
      complexity: "low" | "medium" | "high";
    };
    errorHandling: {
      retryStrategy: "none" | "fixed" | "exponential";
      maxRetries: number;
      fallbackAgent?: string;
    };
    monitoring: {
      metricsToTrack: string[];
      alertThresholds: {
        response_time_ms: number;
        error_rate_percent: number;
      };
    };
  };
}

/**
 * Complete agent configuration combining all aspects
 *
 */
export interface UnifiedAgentConfig {
  orchestration: OrchestrationProfile;
  execution: ExecutionProfile;
  metadata: RichMetadata;
}

/**
 * Central agent configuration registry
 */
export const agentConfigurations: Record<string, UnifiedAgentConfig> = {
  orchestrator: {
    orchestration: {
      id: "orchestrator",
      title: "Orchestrator",
      description:
        "routes questions to appropriate agents based on intent classification",
      primarySignals: ["routing", "coordination", "intent", "workflow"],
      escalateWhen: ["no suitable agent found", "multiple agents conflict"],
    },
    execution: {
      priority: "high",
      timeout: 5000,
      cacheEnabled: false,
    },
    metadata: {
      name: "Orchestrator",
      label: "Orchestrator",
      displayName: "Orchestrator",
      className: "Orchestrator",
      capabilities: [
        "intent-classification",
        "agent-routing",
        "workflow-coordination",
        "escalation-management",
        "coordination-management",
        "request-synthesis",
      ],
      responsibility: "Primary coordination and routing of user requests",
      userFacing: {
        friendlyDescription:
          "I'm the coordinator who figures out which specialized agent can best help you with your question.",
        useWhen: [
          "You have a complex question that might need multiple agents",
          "Your request is ambiguous and needs to be routed properly",
          "You want to understand what capabilities are available",
        ],
        exampleQueries: [
          "Can you help me find information about our company policies?",
          "I need to understand how departments connect to our applications",
          "What can you help me with?",
        ],
        helpText:
          "Ask me anything about your business data and I'll route your question to the right specialist.",
      },
      applicationFacing: {
        technicalDescription:
          "Central routing agent that analyzes user intent and directs requests to appropriate specialized agents",
        // Use canonical hyphenated agent identifiers for consistency
        // During migration include both legacy and new ids
        dependencies: [
          "clarification-agent",
          "relevant-data-manager",
          "user-context",
        ],
        performance: {
          expectedResponseTime: 500,
          memoryUsage: "low",
          complexity: "medium",
        },
        errorHandling: {
          retryStrategy: "fixed",
          maxRetries: 2,
          fallbackAgent: "clarificationAgent",
        },
        monitoring: {
          metricsToTrack: [
            "routing_accuracy",
            "response_time",
            "escalation_rate",
          ],
          alertThresholds: {
            response_time_ms: 1000,
            error_rate_percent: 5,
          },
        },
      },
    },
  },

  "relevant-data-manager": {
    orchestration: {
      id: "relevant-data-manager",
      title: "Relevant Data Manager",
      description:
        "curates category metadata, schemas, and validation artifacts",
      primarySignals: ["schema", "metadata", "catalog", "snapshot"],
      escalateWhen: ["category folder is missing", "schema validation fails"],
    },
    execution: {
      priority: "high",
      timeout: 3000,
      cacheEnabled: true,
    },
    metadata: {
      name: "RelevantDataManagerAgent",
      label: "Relevant data manager",
      displayName: "Relevant Data Manager",
      className: "RelevantDataManagerAgent",
      capabilities: [
        "metadata-management",
        "schema-validation",
        "relationship-mapping",
        "data-structure",
      ],
      responsibility:
        "Provides metadata about categories, schemas, and data structure",
      userFacing: {
        friendlyDescription:
          "I help you understand the structure and organization of your business data categories.",
        useWhen: [
          "You want to know what data categories are available",
          "You need to understand data relationships",
          "You're looking for schema or structure information",
        ],
        exampleQueries: [
          "What data categories do we have?",
          "How are departments related to applications?",
          "What's the structure of our people data?",
        ],
        helpText:
          "I'm your guide to understanding how your business data is organized and connected.",
      },
      applicationFacing: {
        technicalDescription:
          "Core metadata management agent responsible for category schemas, relationships, and data structure validation",
        dependencies: [],
        performance: {
          expectedResponseTime: 300,
          memoryUsage: "medium",
          complexity: "medium",
        },
        errorHandling: {
          retryStrategy: "exponential",
          maxRetries: 3,
        },
        monitoring: {
          metricsToTrack: [
            "cache_hit_rate",
            "schema_validation_time",
            "metadata_freshness",
          ],
          alertThresholds: {
            response_time_ms: 800,
            error_rate_percent: 3,
          },
        },
      },
    },
  },

  "database-agent": {
    orchestration: {
      id: "database-agent",
      title: "Database Agent",
      description:
        "executes structured queries and saved blueprints against cached datasets",
      primarySignals: ["query", "records", "filter", "list"],
      escalateWhen: [
        "category metadata is missing",
        "no records match the criteria",
      ],
    },
    execution: {
      priority: "medium",
      timeout: 10000,
      cacheEnabled: true,
    },
    metadata: {
      name: "DatabaseAgent",
      label: "Database agent",
      displayName: "Database Agent",
      className: "DatabaseAgent",
      capabilities: [
        "data-filtering",
        "record-search",
        "cache-management",
        "query-execution",
      ],
      responsibility:
        "Executes queries and searches across business data records",
      userFacing: {
        friendlyDescription:
          "I help you search and filter through your business records to find specific information.",
        useWhen: [
          "You need to find specific records or data",
          "You want to filter data based on certain criteria",
          "You're looking for lists of items that match conditions",
        ],
        exampleQueries: [
          "Show me all applications used by the Marketing department",
          "Find people who work in departments that use Salesforce",
          "List all company policies related to remote work",
        ],
        helpText:
          "Ask me to search, filter, or list records from your business data.",
      },
      applicationFacing: {
        technicalDescription:
          "Query execution agent that provides filtering and search capabilities across cached business records",
        dependencies: ["relevant-data-manager"],
        performance: {
          expectedResponseTime: 2000,
          memoryUsage: "high",
          complexity: "high",
        },
        errorHandling: {
          retryStrategy: "fixed",
          maxRetries: 2,
        },
        monitoring: {
          metricsToTrack: [
            "query_performance",
            "cache_efficiency",
            "result_accuracy",
          ],
          alertThresholds: {
            response_time_ms: 5000,
            error_rate_percent: 2,
          },
        },
      },
    },
  },

  "data-agent": {
    orchestration: {
      id: "data-agent",
      title: "Exploration & Insight Agent",
      description:
        "crafts exploration plans and synthesises insights across datasets",
      primarySignals: ["insight", "plan", "narrative", "connections"],
      escalateWhen: [
        "relationships are missing",
        "no supporting records are available",
      ],
    },
    execution: {
      priority: "medium",
      timeout: 15000,
      cacheEnabled: true,
    },
    metadata: {
      name: "DataAgent",
      label: "Data agent",
      displayName: "Data Agent",
      className: "DataAgent",
      capabilities: [
        "insight-generation",
        "data-analysis",
        "exploration-planning",
        "pattern-recognition",
      ],
      responsibility:
        "Generates insights and creates data exploration strategies",
      userFacing: {
        friendlyDescription:
          "I analyze your business data to create insights, find patterns, and suggest exploration strategies.",
        useWhen: [
          "You want to understand patterns in your data",
          "You need insights about business relationships",
          "You're looking for strategic recommendations",
        ],
        exampleQueries: [
          "What insights can you provide about our department structure?",
          "How do our applications connect across different teams?",
          "Create an exploration plan for understanding our company resources",
        ],
        helpText:
          "Ask me to analyze patterns, create insights, or develop exploration strategies for your data.",
      },
      applicationFacing: {
        technicalDescription:
          "Analytics and insight generation agent that creates exploration plans and synthesizes cross-category insights",
        dependencies: ["database-agent", "relevant-data-manager"],
        performance: {
          expectedResponseTime: 8000,
          memoryUsage: "high",
          complexity: "high",
        },
        errorHandling: {
          retryStrategy: "exponential",
          maxRetries: 2,
        },
        monitoring: {
          metricsToTrack: [
            "insight_quality",
            "analysis_depth",
            "recommendation_accuracy",
          ],
          alertThresholds: {
            response_time_ms: 12000,
            error_rate_percent: 4,
          },
        },
      },
    },
  },

  "clarification-agent": {
    orchestration: {
      id: "clarification-agent",
      title: "Clarification Agent",
      description: "triages ambiguous requests and asks follow-up questions",
      primarySignals: ["unclear", "unknown", "missing context"],
      escalateWhen: [
        "the user cannot provide category context",
        "no agents match the request",
      ],
    },
    execution: {
      priority: "high",
      timeout: 2000,
      cacheEnabled: false,
    },
    metadata: {
      name: "ClarificationAgent",
      label: "Clarification agent",
      displayName: "Clarification Agent",
      className: "ClarificationAgent",
      capabilities: [
        "intent-clarification",
        "requirement-gathering",
        "question-refinement",
        "context-building",
      ],
      responsibility:
        "Clarifies ambiguous requests and gathers additional context",
      userFacing: {
        friendlyDescription:
          "I help clarify what you're looking for when your question needs more detail or context.",
        useWhen: [
          "Your question is unclear or too broad",
          "You're not sure what you're looking for",
          "You need help refining your request",
        ],
        exampleQueries: [
          "I need some information but I'm not sure what",
          "Can you help me figure out what I should be asking?",
          "I'm looking for something related to our company data",
        ],
        helpText:
          "When you're not sure what to ask or need help clarifying your request, I'm here to guide you.",
      },
      applicationFacing: {
        technicalDescription:
          "Request clarification agent that helps users refine ambiguous queries and provides guidance on available capabilities",
        dependencies: [],
        performance: {
          expectedResponseTime: 1000,
          memoryUsage: "low",
          complexity: "low",
        },
        errorHandling: {
          retryStrategy: "none",
          maxRetries: 1,
        },
        monitoring: {
          metricsToTrack: [
            "clarification_success_rate",
            "user_satisfaction",
            "follow_up_effectiveness",
          ],
          alertThresholds: {
            response_time_ms: 2000,
            error_rate_percent: 1,
          },
        },
      },
    },
  },
};

// Backwards-compatibility: alias the legacy relevant-data-manager configuration
// to the new user-context identifier so both ids are valid during migration.
(agentConfigurations as unknown as Record<string, UnifiedAgentConfig>)[
  "user-context"
] = agentConfigurations["relevant-data-manager"];

/**
 * Utility functions for accessing specific aspects of agent configurations
 */
export const getOrchestrationProfile =
  /**
   * getOrchestrationProfile function.
   *
   * @param {AgentIdentifier} agentId - Canonical or aliased agent identifier.
   * @returns {OrchestrationProfile} - Immutable orchestration profile describing routing signals and escalation triggers.
   */
  (agentId: AgentIdentifier): OrchestrationProfile => {
    return agentConfigurations[agentId].orchestration;
  };

export const getExecutionProfile =
  /**
   * getExecutionProfile function.
   *
   * @param {AgentIdentifier} agentId - Canonical or aliased agent identifier.
   * @returns {ExecutionProfile} - Execution characteristics including priority, timeout, and cache settings.
   */
  (agentId: AgentIdentifier): ExecutionProfile => {
    return agentConfigurations[agentId].execution;
  };

export const getRichMetadata =
  /**
   * getRichMetadata function.
   *
   * @param {AgentIdentifier} agentId - Canonical or aliased agent identifier.
   * @returns {RichMetadata} - Detailed metadata for UI and system integrations (capabilities, responsibilities, dependencies).
   */
  (agentId: AgentIdentifier): RichMetadata => {
    return agentConfigurations[agentId].metadata;
  };

export const getAllAgentIds =
  /**
   * getAllAgentIds function.
   *
   * @returns {AgentIdentifier[]} - Array of registered agent identifiers including migration aliases.
   */
  (): AgentIdentifier[] => {
    return Object.keys(agentConfigurations) as AgentIdentifier[];
  };

// Legacy compatibility exports (for backward compatibility during transition)
export const OrchestratorProfile =
  agentConfigurations.orchestrator.orchestration;
export const RelevantDataManagerAgentProfile =
  agentConfigurations["relevant-data-manager"].orchestration;
export const DatabaseAgentProfile =
  agentConfigurations["database-agent"].orchestration;
export const DataAgentProfile = agentConfigurations["data-agent"].orchestration;
export const ClarificationAgentProfile =
  agentConfigurations["clarification-agent"].orchestration;

// Type exports for backward compatibility
/**
 *
 */
export type AgentProfile = OrchestrationProfile;
/**
 *
 */
export type KnownAgentProfile = OrchestrationProfile;
