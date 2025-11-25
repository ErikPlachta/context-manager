/**
 * @packageDocumentation
 * Agent configuration type declarations used across the application.
 *
 * This module defines structures for agent identity, routing intents,
 * text processing, escalation logic, performance profiling, execution
 * control, scoring, and composite configuration objects consumed by
 * the Orchestrator and individual agents.
 *
 * @remarks
 * - Single source of truth for agent configuration related types.
 * - Keep runtime helper functions in shared modules; this file remains types-only.
 * - Add focused `@example` blocks on individual interfaces where helpful.
 * - Prefer concise property level comments over large top-level samples.
 */
import type { ConfigDescriptor } from "@shared/config/descriptors";

/** Agent identity metadata. */
export interface AgentIdentity {
  /**
   * Unique agent identifier used in routing and logging.
   */
  id: string;

  /**
   * Human-readable name of the agent.
   */
  name: string;

  /**
   * Semantic version of the agent configuration.
   */
  version: string;

  /**
   * Comprehensive description of the agent's purpose and capabilities.
   */
  description: string;
}

/**
 * Intent configuration for the Orchestrator routing system.
 *
 * Associates a named intent with a target agent and optional detection signals.
 *
 * @example
 * ```ts
 * const classifyIntent: IntentConfig = {
 *   name: "fetch-metadata",
 *   description: "Retrieve category metadata and schemas",
 *   targetAgent: "data-agent",
 *   signals: ["schema", "fields", "metadata"],
 * };
 * ```
 */
export interface IntentConfig {
  /* Unique name of the intent */
  name: string;
  /* Description of the intent's purpose */
  description: string;
  /* Identifier of the agent to handle this intent */
  targetAgent: string;
  /* Optional array of keywords/signals for intent detection */
  signals?: string[];
}

/**
 * Text processing configuration for extracting signals and keywords.
 *
 * @example
 * ```ts
 * const textCfg: TextProcessingConfig = {
 *   stopWords: ["the", "a", "an"],
 *   minimumKeywordLength: 3,
 *   scoringWeights: {
 *     signalMatch: 0.6,
 *     focusMatch: 0.3,
 *     promptStarterMatch: 0.1,
 *   },
 * };
 * ```
 */
export interface TextProcessingConfig {
  /* List of common stop words to ignore */
  stopWords: string[];
  /* Minimum length for valid keywords */
  minimumKeywordLength: number;
  /* Weights for different keyword matching criteria */
  scoringWeights: {
    /* Weight for signal match */
    signalMatch: number;
    /* Weight for focus match */
    focusMatch: number;
    /* Weight for prompt starter match */
    promptStarterMatch: number;
  };
}

/**
 * Escalation configuration controlling retries and fallback behavior.
 *
 * @example
 * ```ts
 * const esc: EscalationConfig = {
 *   conditions: ["low-confidence", "missing-signals"],
 *   fallbackAgent: "clarification-agent",
 *   maxRetries: 1,
 *   vaguePhrases: ["help", "not sure"],
 * };
 * ```
 */
export interface EscalationConfig {
  conditions: string[];
  fallbackAgent: string;
  maxRetries: number;
  vaguePhrases?: string[];
}

/** Orchestration configuration: intents, text handling, escalation, and messages. */
export interface OrchestrationConfig {
  intents?: Record<string, IntentConfig>;
  textProcessing?: TextProcessingConfig;
  escalation?: EscalationConfig;
  messages?: {
    noIntentDetected?: string;
    needMoreContext?: string;
    questionTooVague?: string;
    missingSignalsHint?: string[];
    errorOccurred?: string;
    summaries?: {
      metadata?: string;
      records?: string;
      insight?: string;
      clarification?: string;
      defaultTopic?: string;
    };
    guidance?: {
      metadata?: string;
      recordsConnections?: string;
      recordsFiltering?: string;
      insightPlan?: string[];
      insightOverview?: string;
      insightRecommendations?: string;
      clarificationPrompt?: string;
    };
  };
}

/** Runtime execution configuration for an agent. */

/**
 * Error handling preferences for an agent.
 *
 * Example removed for brevity; configure in agent.config.ts with preferred retry strategy.
 */
export interface ErrorHandlingConfig {
  retryStrategy: "none" | "fixed" | "exponential";
  maxRetries: number;
  fallbackAgent?: string;
}

/**
 * Monitoring/telemetry configuration for an agent.
 *
 * Example removed for brevity; define metrics and thresholds in runtime configuration.
 */
export interface MonitoringConfig {
  metricsToTrack: string[];
  alertThresholds: Record<string, number>;
}

/** Performance characteristics and optional limits for an agent. */
export interface PerformanceConfig {
  expectedResponseTime?: number;
  memoryUsage?: string;
  complexity?: string;
  caching?: {
    enabledByDefault?: boolean;
    defaultKeyPrefix?: string;
    maxCacheEntries?: number;
    cacheTTL?: number;
  };
  limits?: {
    queryTimeout?: number;
    maxResultSize?: number;
    maxJoinDepth?: number;
  };
  [key: string]: unknown;
}

/** Execution settings controlling runtime behavior. */
export interface ExecutionConfig {
  mode?: string;
  maxConcurrency?: number;
  timeoutMs?: number;
  [key: string]: unknown;
}

/** User-facing descriptive configuration for docs & examples. */
export interface UserFacingConfig {
  friendlyDescription?: string;
  exampleQueries?: string[];
  successDisplay?: {
    includeAvailableCategories?: boolean;
    maxCategoriesInSuccess?: number;
    availableCategoriesHeader?: string;
  };
  [key: string]: unknown;
}

/** Technical/application-facing metadata for operators and documentation. */
export interface ApplicationFacingConfig {
  technicalDescription?: string;
  dependencies?: string[];
  capabilities?: string[];
  performance?: PerformanceConfig;
  errorHandling?: ErrorHandlingConfig;
  monitoring?: MonitoringConfig;
}

/**
 * DatabaseAgent configuration for query behavior, validation, and performance.
 *
 * All business values (aliases, operators) must come from configuration.
 *
 * @example
 * ```ts
 * const dbCfg: DatabaseConfig = {
 *   fieldAliases: { people: { dept: "departmentId" } },
 *   performance: {
 *     caching: { enabledByDefault: true, defaultKeyPrefix: "db:", maxCacheEntries: 500, cacheTTL: 60000 },
 *     limits: { queryTimeout: 5000, maxResultSize: 1000, maxJoinDepth: 2 }
 *   },
 *   validation: {
 *     schemaValidation: { enableStrictValidation: true, allowUnknownFields: false, autoTransformAliases: true },
 *     integrityChecks: { validateRelationships: true, checkMissingReferences: true, warnOnSchemaIssues: true }
 *   },
 *   operations: {
 *     filtering: { operators: ["=", "!=", "in"], caseInsensitiveStrings: true, enableFuzzyMatching: false },
 *     joins: { supportedJoinTypes: ["inner", "left"], autoDiscoverRelationships: true, maxJoinRecords: 5000 },
 *     aggregation: { functions: ["count", "avg"], enableGroupBy: true, maxGroups: 100 }
 *   }
 * };
 * ```
 */
export interface DatabaseConfig {
  fieldAliases: Record<string, Record<string, string>>;
  performance: {
    caching: {
      enabledByDefault: boolean;
      defaultKeyPrefix: string;
      maxCacheEntries: number;
      cacheTTL: number;
    };
    limits?: {
      /** Maximum time (ms) allowed for query execution */
      queryTimeout?: number;
      /** Maximum number of records to return */
      maxResultSize?: number;
      /** Maximum depth of joins permitted */
      maxJoinDepth?: number;
    };
  };
  validation: DatabaseValidationConfig;
  operations: DatabaseOperationsConfig;
}

/** Validation and transformation settings for database queries. */
export interface DatabaseValidationConfig {
  schemaValidation: {
    enableStrictValidation: boolean;
    allowUnknownFields: boolean;
    autoTransformAliases: boolean;
  };
  integrityChecks: {
    validateRelationships: boolean;
    checkMissingReferences: boolean;
    warnOnSchemaIssues: boolean;
  };
}

/** Supported query operations and their configurations. */
export interface DatabaseOperationsConfig {
  filtering: {
    operators: string[];
    caseInsensitiveStrings?: boolean;
    enableFuzzyMatching?: boolean;
  };
  joins: {
    supportedJoinTypes: string[];
    autoDiscoverRelationships?: boolean;
    maxJoinRecords?: number;
  };
  aggregation: {
    functions: string[];
    enableGroupBy?: boolean;
    maxGroups?: number;
  };
}

/**
 * DataAgent configuration governing analysis, exploration, relationships, search, and performance.
 *
 * @example
 * ```ts
 * const dataCfg: DataConfig = {
 *   analysis: { enableInsightGeneration: true, maxInsightDepth: 3, crossCategoryAnalysis: true, insightConfidenceThreshold: 0.6 },
 *   exploration: { maxExplorationSteps: 5, enableAutomaticPlanGeneration: true, planComplexityLimit: "medium" },
 *   relationships: { enableRelationshipMapping: true, maxRelationshipDepth: 2, includeWeakRelationships: false },
 *   search: { maxResults: 50, enableFuzzyMatching: true, minimumMatchScore: 0.5 },
 * };
 * ```
 */
export interface DataConfig {
  analysis: {
    enableInsightGeneration: boolean;
    maxInsightDepth: number;
    crossCategoryAnalysis: boolean;
    insightConfidenceThreshold?: number;
    maxInsightsPerAnalysis?: number;
    insightCategories?: string[];
    enableInsightRanking?: boolean;
    highlightRecordLimit?: number;
    maxSupportingRecords?: number;
    maxExampleHints?: number;
  };
  quality?: {
    missingFieldThreshold?: number;
    anomalyDetectionEnabled?: boolean;
    minimumRecordCount?: number;
    fieldCompletenessThreshold?: number;
  };
  exploration: {
    maxExplorationSteps: number;
    enableAutomaticPlanGeneration: boolean;
    planComplexityLimit: "low" | "medium" | "high";
    includeExampleQueries?: boolean;
    includeDateValidationSteps?: boolean;
    explorationPriorities?: string[];
    enableDynamicPlanAdjustment?: boolean;
    minSupportingResources?: number;
  };
  relationships: {
    enableRelationshipMapping: boolean;
    maxRelationshipDepth: number;
    includeWeakRelationships: boolean;
    relationshipStrengthThreshold?: number;
    relationshipTypes?: string[];
    enableImpactAssessment?: boolean;
    maxRelationshipsPerAnalysis?: number;
  };
  search?: {
    maxResults?: number;
    enableFuzzyMatching?: boolean;
    searchTimeout?: number;
    minimumMatchScore?: number;
    enableCategoryFiltering?: boolean;
    prioritizeRecentResults?: boolean;
  };
  synthesis?: {
    enableTopicOverviews?: boolean;
    maxHighlightRecords?: number;
    includeValidationReports?: boolean;
    enableMultiSourceSynthesis?: boolean;
    synthesisConfidenceThreshold?: number;
  };
  performance?: {
    enableTopicOverviewCaching?: boolean;
    topicOverviewCacheTTL?: number;
    maxConcurrentAnalyses?: number;
    analysisTimeout?: number;
    enableParallelRelationshipMapping?: boolean;
    processingBatchSize?: number;
  };
}

/**
 * ClarificationAgent configuration for guidance, escalation, knowledge search, routing, and performance.
 *
 * @example
 * ```ts
 * const clarCfg: ClarificationConfig = {
 *   guidance: { maxSuggestions: 5, includeCategoryExamples: true, includeQueryTemplates: true },
 *   escalation: { escalationThreshold: 0.4, fallbackStrategies: ["rephrase", "handoff"], maxClarificationRounds: 1 },
 *   knowledgeBase: { enableKnowledgeSearch: true, maxKnowledgeSnippets: 3, relevanceThreshold: 0.5 },
 * };
 * ```
 */
export interface ClarificationConfig {
  guidance: {
    maxSuggestions: number;
    includeCategoryExamples: boolean;
    includeQueryTemplates: boolean;
    suggestAlternativePhrasings?: boolean;
    guidanceTypes?: string[];
    responseStyle?: {
      tone?: string;
      formality?: string;
      includeEncouragement?: boolean;
      maxResponseLength?: number;
    };
    helpSystem?: {
      enabled?: boolean;
      listAgentCapabilities?: boolean;
      includeExampleQueries?: boolean;
      maxExamplesPerAgent?: number;
      includeCategorySummaries?: boolean;
      maxCategoriesToList?: number;
    };
  };
  escalation: {
    escalationThreshold: number;
    fallbackStrategies: string[];
    maxClarificationRounds: number;
    suggestHumanSupportAfterMaxRounds?: boolean;
    clarificationTimeWindow?: number;
  };
  knowledgeBase: {
    enableKnowledgeSearch: boolean;
    maxKnowledgeSnippets: number;
    relevanceThreshold: number;
    enableKnowledgeRanking?: boolean;
    knowledgeSources?: string[];
    knowledgeSearchTimeout?: number;
  };
  routing?: {
    analyzeMissingSignals?: boolean;
    suggestAlternativeAgents?: boolean;
    maxCandidateAgents?: number;
    routingConfidenceThreshold?: number;
    includeAgentCapabilitySummaries?: boolean;
  };
  contextAnalysis?: {
    enableIntentAnalysis?: boolean;
    identifyMissingComponents?: boolean;
    suggestQueryStructure?: boolean;
    handleDomainTerminology?: boolean;
    contextConfidenceThreshold?: number;
  };
  performance?: {
    enableResponseCaching?: boolean;
    responseCacheTTL?: number;
    maxResponseTime?: number;
    enableParallelProcessing?: boolean;
    processingBatchSize?: number;
  };
}

/** CommunicationAgent configuration for response formatting and user interaction. */
export interface CommunicationConfig {
  formatting: {
    defaultFormat: "markdown" | "plaintext" | "html";
    tone: {
      success: string;
      error: string;
      progress: string;
      validation: string;
    };
    verbosity: "minimal" | "balanced" | "detailed";
    maxMessageLength: number;
    includeEmoji?: boolean;
    includeSectionHeaders?: boolean;
    formatLists?: boolean;
    highlightKeyInfo?: boolean;
  };
  successTemplates?: {
    dataRetrieved?: string;
    analysisComplete?: string;
    metadataRetrieved?: string;
    exportComplete?: string;
    importComplete?: string;
    validationPassed?: string;
  };
  /** Optional success-path display customization (enumeration of categories) */
  successDisplay?: {
    /** Enable enumeration of availableCategories in success responses when metadata provides them */
    includeAvailableCategories?: boolean;
    /** Maximum categories to enumerate (default implementation uses 6) */
    maxCategoriesInSuccess?: number;
    /** Header to use above enumerated categories; falls back to clarification header or static default */
    availableCategoriesHeader?: string;
  };
  errorHandling: {
    includeStackTrace?: boolean;
    includeErrorCodes?: boolean;
    suggestRecoveryActions?: boolean;
    maxRecoverySuggestions?: number;
    errorTemplates?: {
      notFound?: string;
      validationFailed?: string;
      permissionDenied?: string;
      configurationError?: string;
      externalError?: string;
      unexpected?: string;
    };
    recoveryActions?: {
      notFound?: string[];
      validationFailed?: string[];
      permissionDenied?: string[];
      configurationError?: string[];
    };
  };
  progressTracking?: {
    enabled?: boolean;
    minimumDuration?: number;
    showPercentage?: boolean;
    showElapsedTime?: boolean;
    showEstimatedTimeRemaining?: boolean;
    updateInterval?: number;
    progressTemplates?: {
      started?: string;
      inProgress?: string;
      completed?: string;
    };
  };
  validation?: {
    groupByCategory?: boolean;
    maxErrorsPerEntity?: number;
    showFieldPaths?: boolean;
    showExpectedActual?: boolean;
    summaryTemplate?: string;
  };
  /** Clarification message templates and settings for CommunicationAgent */
  clarification?: CommunicationClarificationConfig;
  /** Allow forward-compatible keys */
  [key: string]: unknown;
}

/**
 * Clarification formatting configuration for the CommunicationAgent.
 *
 * Use groups with `usesCategories=true` to automatically substitute category names.
 * with runtime category names supplied via metadata.
 *
 * Example removed for brevity.
 */
export interface CommunicationClarificationConfig {
  /** Max number of categories to include in examples */
  maxCategoriesInExamples?: number;
  /** Heading before example prompts */
  examplesHeader?: string;
  /** Heading before category list */
  availableCategoriesHeader?: string;
  /** Closing prompt encouraging specificity */
  closingPrompt?: string;
  /** Template shown when the user request is unclear. */
  unknownRequestTemplate?: string;
  /** Template when an intent is guessed. */
  matchedIntentTemplate?: string;
  /** Example groups; when usesCategories=true, category placeholders are substituted. */
  groups?: Array<{
    title: string;
    usesCategories?: boolean;
    sampleTemplates: string[];
  }>;
}

/**
 * DataLoader configuration for file I/O, validation, discovery, and performance.
 */
export interface DataLoaderConfig {
  validation: {
    enableStrictTypeChecking: boolean;
    allowPartialRecords: boolean;
    validateOnLoad: boolean;
    useTypeGuards: boolean;
    maxValidationErrors: number;
    logValidationWarnings: boolean;
  };
  fileOperations: {
    encoding: "utf-8" | "ascii" | "utf8";
    maxFileSize: number;
    enableCaching: boolean;
    cacheTTL: number;
    maxCacheEntries: number;
    allowSyncOperations: boolean;
    enableRetry: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  pathResolution: {
    enableExamplesFallback: boolean;
    examplesDirectory: string;
    resolveFromDataRoot: boolean;
    followSymlinks: boolean;
    normalizePaths: boolean;
    allowAbsolutePaths: boolean;
  };
  errorHandling: {
    includeStackTrace: boolean;
    provideFilePath: boolean;
    suggestRecovery: boolean;
    wrapNativeErrors: boolean;
    logToTelemetry: boolean;
    logSeverityThreshold: "info" | "warning" | "error" | "critical";
  };
  performance: {
    enableParallelLoading: boolean;
    maxConcurrentOperations: number;
    enableStreaming: boolean;
    streamingThreshold: number;
    enableMemoryOptimization: boolean;
    maxMemoryUsage: number;
  };
  discovery: {
    enableAutoDiscovery: boolean;
    requiredCategoryFiles: string[];
    optionalCategoryFiles: string[];
    skipHiddenFiles: boolean;
    skipPatterns: string[];
    maxDepth: number;
    continueOnError: boolean;
    logDiscoveryWarnings: boolean;
  };
}

/**
 * RelevantDataManager configuration for metadata validation, relationship integrity,
 * caching, schema management, and operational performance.
 *
 * @example
 * ```ts
 * const rdmCfg: RelevantDataManagerConfig = {
 *   metadata: { enableSchemaValidation: true, enforceDataQuality: true, trackDataLineage: false },
 *   caching: { enableSnapshotCaching: true, snapshotTTL: 60000, maxCachedSnapshots: 10 },
 *   validation: { strictModeEnabled: true, allowPartialValidation: false, validationTimeout: 15000 },
 *   performance: { enableParallelProcessing: true, maxConcurrentOperations: 4 }
 * };
 * ```
 */
export interface RelevantDataManagerConfig {
  metadata: {
    enableSchemaValidation: boolean;
    enforceDataQuality: boolean;
    trackDataLineage: boolean;
    autoGenerateMetadata?: boolean;
    supportedCategories?: string[];
    requiredCategoryFiles?: Record<string, string>;
    requiredDirectories?: Record<string, string>;
    validateFolderStructure?: boolean;
  };
  caching: {
    enableSnapshotCaching: boolean;
    snapshotTTL: number;
    maxCachedSnapshots: number;
    cacheValidationResults?: boolean;
    validationCacheTTL?: number;
    enableRecordHashCaching?: boolean;
    cacheCleanupThreshold?: number;
  };
  validation: {
    strictModeEnabled: boolean;
    allowPartialValidation: boolean;
    validationTimeout: number;
    enableAjvValidation?: boolean;
    checkDuplicateSchemas?: boolean;
    validateRelationshipIntegrity?: boolean;
    checkOrphanedRecords?: boolean;
    validationWarningThreshold?: number;
  };
  schemaManagement?: {
    autoDetectSchemaChanges?: boolean;
    enableSchemaVersioning?: boolean;
    validationLibrary?: string;
    generateTypescriptTypes?: boolean;
    validateSchemaCompatibility?: boolean;
    maxSchemaFileSize?: number;
    supportedSchemaFormats?: string[];
  };
  relationships?: {
    enableAutoDiscovery?: boolean;
    validateReferences?: boolean;
    detectCircularReferences?: boolean;
    maxTraversalDepth?: number;
    buildRelationshipIndexes?: boolean;
    relationshipTypes?: string[];
  };
  dataManagement?: {
    enableAutoRefresh?: boolean;
    refreshInterval?: number;
    enableDataBackups?: boolean;
    backupRetentionDays?: number;
    validateOnLoad?: boolean;
    supportedImportFormats?: string[];
    maxImportFileSize?: number;
  };
  performance?: {
    enableParallelProcessing?: boolean;
    maxConcurrentOperations?: number;
    defaultOperationTimeout?: number;
    enableOperationCaching?: boolean;
    memoryOptimizationLevel?: string;
  };
}

/**
 * Complete TypeScript-based agent configuration definition.
 *
 * The single source of truth for all agent settings. Agents must not hardcode
 * business values in code; derive from this configuration or loaded data.
 *
 * Example removed for brevity.
 */
export interface AgentConfigDefinition {
  /** Unique configuration schema identifier for validation and versioning */
  $configId: string;

  /** Basic agent identity and metadata */
  agent: AgentIdentity;

  /** Agent-specific configuration (varies by agent type) */
  orchestration?: OrchestrationConfig;
  database?: DatabaseConfig;
  data?: DataConfig;
  clarification?: ClarificationConfig;
  communication?: CommunicationConfig;
  dataLoader?: DataLoaderConfig;
  relevantDataManager?: RelevantDataManagerConfig;

  /** Runtime execution configuration */
  execution?: ExecutionConfig;

  /** User-facing metadata */
  userFacing?: UserFacingConfig;

  /** Application-facing metadata */
  applicationFacing?: ApplicationFacingConfig;

  /** Performance configuration */
  performance?: {
    enableResponseCaching?: boolean;
    responseCacheTTL?: number;
    maxResponseTime?: number;
    enableParallelProcessing?: boolean;
    processingBatchSize?: number;
    maxConcurrentOperations?: number;
    defaultOperationTimeout?: number;
    enableOperationCaching?: boolean;
    memoryOptimizationLevel?: string;
  };

  /** Telemetry configuration */
  telemetry?: {
    logQueries?: boolean;
    logPerformance?: boolean;
    logCacheStats?: boolean;
    slowQueryThreshold?: number;
    trackInsightMetrics?: boolean;
    trackRelationshipMetrics?: boolean;
    trackClarificationSuccess?: boolean;
    trackUserSatisfaction?: boolean;
    trackDataQuality?: boolean;
    trackSchemaValidation?: boolean;
    trackRelationshipIntegrity?: boolean;
  };

  /** Error handling configuration */
  errorHandling?: {
    maxRetries?: number;
    retryDelay?: number;
    exponentialBackoff?: boolean;
    fallbackOnCacheError?: boolean;
    fallbackToSimpleAnalysis?: boolean;
    allowPartialAnalysis?: boolean;
    gracefulRelationshipHandling?: boolean;
    fallbackToGenericHelp?: boolean;
    allowPartialClarification?: boolean;
    gracefulKnowledgeFailure?: boolean;
    allowPartialDataLoad?: boolean;
    gracefulSchemaFailure?: boolean;
    fallbackToCachedData?: boolean;
    skipCorruptedRecords?: boolean;
  };
}

/**
 * Complete individual agent configuration (legacy) for JSON compatibility.
 */
export interface IndividualAgentConfig {
  agent: AgentIdentity;
  orchestration?: OrchestrationConfig;
  execution: ExecutionConfig;
  userFacing?: UserFacingConfig;
  applicationFacing?: ApplicationFacingConfig;
}

/**
 * Base class for agent configuration management
 */
// BaseAgentConfig moved to src/shared/config/baseAgentConfig.ts to preserve types-only purity here.

// ---------------------------------------------------------------------------------------------------------------------
// Runtime agent types (centralized)
// ---------------------------------------------------------------------------------------------------------------------

/** Identifier for a generic category or data source. */
export type CategoryId = string;

/**
 * Generic record model allowing arbitrary fields.
 * Represents a minimal record from any business data category.
 *
 * @param id - Unique identifier for the record (required)
 * @param name - Optional human-readable name
 * @param title - Optional alternative to name (some records use title instead)
 */
export interface CategoryRecord {
  id: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
}

// Orchestrator runtime types

/** List of supported orchestration intents (from configuration). */
export type OrchestratorIntent = string;

/** Classification metadata returned before executing a task. */
export interface OrchestratorClassification {
  intent: OrchestratorIntent;
  rationale: string;
  escalationPrompt?: string;
  matchedSignals?: string[];
  missingSignals?: string[];
}

/** Input supplied when asking the orchestrator to fulfil a task. */
export interface OrchestratorInput {
  topic?: string;
  question: string;
  criteria?: Record<string, unknown>;
}

/** Result of orchestrating a question across the available agents. */
export interface OrchestratorResponse {
  intent: OrchestratorIntent;
  agent: string;
  summary: string;
  rationale: string;
  payload: unknown;
  /**
   * Optional pre-formatted content. Prefer using `WorkflowResult.formatted` in
   * end-to-end workflows. This field exists only for transitional compatibility
   * with older orchestration paths.
   */
  formatted?: {
    /** Human-readable message describing the routing/decision */
    message: string;
    /** Markdown-formatted content for rich display */
    markdown?: string;
  };

  /**
   * @deprecated Use `formatted` (above) and, in full workflows, rely on
   * `WorkflowResult.formatted` produced via the CommunicationAgent. This field
   * will be removed in a future release after the deprecation lifecycle.
   */
  markdown?: string;
}

// Clarification agent runtime types
import type { KnowledgeHit } from "@mcp/knowledgeBase";

/** Input parameters for the clarification agent. */
export interface ClarificationAgentInput {
  question: string;
  topic?: string;
  missingSignals?: string[];
  candidateAgents: string[];
}

/** Response from the clarification agent containing guidance and context. */
export interface ClarificationResponse {
  prompt: string;
  knowledgeSnippets: KnowledgeHit[];
}

// Data agent runtime types

/** Schema definition for a category. */
export interface CategorySchema {
  name: string;
  schema: unknown;
}

/** Description of a relationship between two categories. */
export interface RelationshipDescription {
  name: string;
  description: string;
  targetCategory: CategoryId;
  viaField: string;
}

/** Input payload used for data analysis operations. */
export interface AnalysisInput {
  categoryId: CategoryId;
  records: CategoryRecord[];
  schemas?: CategorySchema[];
  relationships?: RelationshipDescription[];
}

/** Insight produced by analysis over data records. */
export interface DataInsight {
  type:
    | "pattern"
    | "anomaly"
    | "correlation"
    | "trend"
    | "opportunity"
    | "risk";
  description: string;
  confidence: number;
  category: CategoryId;
  affectedRecords?: string[];
}

/** Single step within a generated exploration plan. */
export interface ExplorationStep {
  title: string;
  description: string;
  recommendedCategory: CategoryId;
  hints: string[];
}

/** Structured plan for guiding a data exploration workflow. */
export interface ExplorationPlan {
  topic: string;
  question: string;
  steps: ExplorationStep[];
  recommendedQueries: string[];
  supportingResources: Array<{ categoryId: CategoryId; ids: string[] }>;
}

/** Match result from searching across topic records. */
export interface TopicSearchResult {
  categoryId: CategoryId;
  recordId: string;
  displayName: string;
  matchingFields: string[];
}

/** Aggregated description of a connection between categories. */
export interface CrossCategoryConnection {
  sourceCategory: CategoryId;
  targetCategory: CategoryId;
  connectionType: string;
  strength: number;
  description: string;
}

// Database agent runtime types

/** Definition for a data source the database agent can query. */
export interface DataSource {
  id: CategoryId;
  name: string;
  records: CategoryRecord[];
  schema?: unknown;
  fieldAliases?: Record<string, string>;
}

/** Metadata for the result of executing a query. */
export interface QueryResult {
  categoryId: CategoryId;
  records: CategoryRecord[];
  totalCount: number;
  cached: boolean;
}

/** Optional knobs controlling query execution behavior. */
export interface QueryOptions {
  useCache?: boolean;
  cacheKeyPrefix?: string;
}

// -------------------------
// Descriptor helper (for agent config UIs)
// -------------------------
// Re-exports are provided below to preserve existing import paths
// (e.g., `@internal-types/agentConfig`).

export type { ConfigDescriptor } from "@shared/config/descriptors";
// createDescriptorMap intentionally not re-exported to preserve types-only purity.
