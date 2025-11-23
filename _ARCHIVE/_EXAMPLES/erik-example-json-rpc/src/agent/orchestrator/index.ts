/**
 * @packageDocumentation Configuration-driven orchestrator implementation
 */

import { BaseAgentConfig } from "@shared/config/baseAgentConfig";
import type {
  AgentConfigDefinition,
  OrchestrationConfig,
  IntentConfig,
  ConfigDescriptor,
  DataSource,
} from "@internal-types/agentConfig";
import { createDescriptorMap } from "@shared/config/descriptors";
import {
  validateAgentConfig,
  generateValidationReport,
} from "@shared/validation/configValidation";
import { orchestratorConfig } from "@agent/orchestrator/agent.config";
import type {
  OrchestratorIntent,
  OrchestratorClassification,
  OrchestratorInput,
  OrchestratorResponse,
} from "@internal-types/agentConfig";
import {
  scoreSignals,
  containsAnyPhrase,
  type TextProcessingConfig,
} from "@shared/textProcessing";
import {
  CommunicationAgent,
  type AgentResponse,
  type SeverityLevel,
} from "@agent/communicationAgent";
import { DatabaseAgent } from "@agent/databaseAgent";
import { DataAgent } from "@agent/dataAgent";
import { UserContextAgent } from "@agent/userContextAgent";
import type {
  WorkflowState,
  WorkflowAction,
  WorkflowActionType,
  WorkflowContext,
  WorkflowResult,
  PerformanceMetrics,
  WorkflowDiagnostics,
  WorkflowHistory,
  AgentRegistry,
  GetSnapshotParams,
  QueryParams,
  AnalyzeParams,
} from "@internal-types/workflow.types";
import { WorkflowLogger } from "@shared/workflowLogger";
import { ensureCacheDirectory } from "@extension/mcpCache";

// ============================================================================
// Workflow Coordination Types (imported from @internal-types/workflow.types)
// ============================================================================
// Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md - Workflow State Machine Design
//
// All workflow types are now defined in src/types/workflow.types.ts
// This ensures proper separation of concerns and reusability
//
// WorkflowLogger is imported from @shared/workflowLogger

// ============================================================================
// Orchestrator Class
// ============================================================================

/**
 * Configuration-driven orchestrator that routes questions to appropriate agents
 *
 * Now includes workflow coordination capabilities:
 * - Executes agents (not just routes to them)
 * - Manages workflow state machine
 * - Provides structured logging and diagnostics
 * - Tracks performance metrics
 * - Supports multi-step workflows with dependencies
 *
 * Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md for architecture details
 */
export class Orchestrator extends BaseAgentConfig {
  // Configuration fields
  private stopWords: Set<string>;
  private intentAgentMap: Record<string, string>;
  private scoringWeights: {
    signalMatch: number;
    focusMatch: number;
    promptStarterMatch: number;
  };
  private minimumKeywordLength: number;
  private vaguePhrases: string[];
  private messages: Required<NonNullable<OrchestrationConfig["messages"]>>;
  private textProcessingConfig: TextProcessingConfig;
  private communicationAgent: CommunicationAgent;

  // Workflow coordination fields
  private logger: WorkflowLogger;
  private workflows: Map<string, WorkflowContext>;
  private workflowHistory: WorkflowHistory[];
  private workflowIdCounter: number;
  private agentRegistry: AgentRegistry;
  private userContextAgent: UserContextAgent | null = null;

  /**
   * Create an orchestrator using the provided configuration (or defaults).
   *
   * @param {AgentConfigDefinition} [config] - Optional pre-loaded configuration.
   */
  constructor(config?: AgentConfigDefinition) {
    console.log("🚀 Orchestrator constructor START");
    const configToUse = config || orchestratorConfig;
    const validationResult = validateAgentConfig(configToUse);
    if (!validationResult.isValid) {
      const report = generateValidationReport(validationResult);
      throw new Error(`Invalid orchestrator configuration:\n${report}`);
    }

    super(configToUse);
    this._validateRequiredSections();

    // Resolve and cache common config items for performance
    const stop = this.getConfigItem<string[]>(
      "orchestration.textProcessing.stopWords"
    );
    if (!Array.isArray(stop)) {
      throw new Error("Orchestrator config missing textProcessing.stopWords");
    }
    this.stopWords = new Set(stop);

    const weights = this.getConfigItem<{
      signalMatch: number;
      focusMatch: number;
      promptStarterMatch: number;
    }>("orchestration.textProcessing.scoringWeights");
    if (!weights) {
      throw new Error(
        "Orchestrator config missing textProcessing.scoringWeights"
      );
    }
    this.scoringWeights = weights;

    const minLen = this.getConfigItem<number>(
      "orchestration.textProcessing.minimumKeywordLength"
    );
    if (typeof minLen !== "number") {
      throw new Error(
        "Orchestrator config missing textProcessing.minimumKeywordLength"
      );
    }
    this.minimumKeywordLength = minLen;

    this.vaguePhrases =
      this.getConfigItem<string[]>("orchestration.escalation.vaguePhrases") ??
      [];

    const intents = this.getConfigItem<Record<string, IntentConfig>>(
      "orchestration.intents"
    );
    if (!intents || Object.keys(intents).length === 0) {
      throw new Error("Orchestrator config missing intents block");
    }
    this.intentAgentMap = {};
    for (const [intent, cfg] of Object.entries(intents)) {
      this.intentAgentMap[intent] = cfg.targetAgent;
    }

    const msgs = this.getConfigItem<
      NonNullable<OrchestrationConfig["messages"]>
    >("orchestration.messages");
    if (!msgs) {
      throw new Error("Orchestrator config missing messages block");
    }
    this.messages = msgs as Required<
      NonNullable<OrchestrationConfig["messages"]>
    >;

    // Initialize text processing config for utility functions
    this.textProcessingConfig = {
      stopWords: this.stopWords,
      minimumKeywordLength: this.minimumKeywordLength,
      handleInflections: true,
    };

    // Initialize communication agent for response formatting
    this.communicationAgent = new CommunicationAgent();

    // Initialize workflow coordination infrastructure
    this.logger = new WorkflowLogger();
    this.workflows = new Map();
    this.workflowHistory = [];
    this.workflowIdCounter = 0;

    // Initialize agent registry with agent instances
    // Each agent is instantiated with its required dependencies
    try {
      const cacheDirectory = ensureCacheDirectory();
      console.log("🔧 Orchestrator: Initializing agent registry...");
      console.log("🔧 Cache directory promise:", cacheDirectory);

      console.log("🔧 Creating UserContextAgent...");
      let userContextAgent: UserContextAgent | null = null;
      try {
        userContextAgent = new UserContextAgent(undefined, cacheDirectory);
        console.log("✅ UserContextAgent created successfully");
      } catch (ucError) {
        console.error("❌ UserContextAgent creation failed:", ucError);
        console.error(
          "❌ UserContextAgent stack:",
          ucError instanceof Error ? ucError.stack : "N/A"
        );
        // Don't throw - allow other agents to initialize
      }

      // Store reference for data-driven query extraction
      this.userContextAgent = userContextAgent;

      // Build data sources from UserContextAgent categories for DatabaseAgent
      const dataSources: DataSource[] = [];
      if (userContextAgent) {
        const categories = userContextAgent.listCategories();
        for (const categorySummary of categories) {
          try {
            const category = userContextAgent.getCategory(categorySummary.id);
            dataSources.push({
              id: category.id,
              name: category.name,
              records: category.records,
              schema: category.schemas, // BusinessCategory has schemas (plural)
              fieldAliases: {}, // BusinessCategory doesn't have fieldAliases, use empty object
            });
          } catch (catError) {
            console.warn(
              `⚠️ Failed to load category ${categorySummary.id}:`,
              catError
            );
            // Continue with other categories
          }
        }
        console.log(
          `✅ Loaded ${dataSources.length} data sources for DatabaseAgent`
        );
      }

      console.log("🔧 Creating DatabaseAgent...");
      const dbAgent = new DatabaseAgent(dataSources, cacheDirectory);
      console.log("✅ DatabaseAgent created successfully");

      console.log("🔧 Creating DataAgent...");
      const dataAgent = new DataAgent();
      console.log("✅ DataAgent created successfully");

      this.agentRegistry = {
        "database-agent": dbAgent,
        "data-agent": dataAgent,
        "user-context-agent": userContextAgent,
      };

      console.log(
        "✅ Agent registry initialized successfully:",
        Object.keys(this.agentRegistry)
      );
      this.logger.logInfo("system", "Agent registry initialized successfully", {
        agents: Object.keys(this.agentRegistry),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error("❌ Failed to initialize agent registry:", errorMessage);
      console.error("❌ Stack trace:", stack);
      this.logger.logInfo("system", "Failed to initialize agent registry", {
        error: errorMessage,
        stack,
      });
      // Initialize with empty registry as fallback
      this.agentRegistry = {
        "database-agent": null,
        "data-agent": null,
        "user-context-agent": null,
      };
    }
  }

  /**
   * Load configuration from disk (TypeScript or JSON fallback) and create an orchestrator.
   *
   * @param {string} [configPath] - Optional path to a JSON config; when omitted uses TS defaults.
   * @returns {Promise<Orchestrator>} Orchestrator instance.
   */
  public static async createFromConfig(
    configPath?: string
  ): Promise<Orchestrator> {
    try {
      if (!configPath) return new Orchestrator(orchestratorConfig);
      const fs = await import("fs");
      const configData = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(configData) as AgentConfigDefinition;
      return new Orchestrator(parsed);
    } catch (error) {
      console.warn(
        `Failed to load orchestrator config, using defaults: ${error}`
      );
      return new Orchestrator(orchestratorConfig);
    }
  }

  /**
   * Get the underlying agent configuration structure.
   *
   * @returns {Record<string, unknown>} Raw public configuration object.
   */
  public getConfig(): Record<string, unknown> {
    return super.getConfig();
  }

  /**
   * List all supported intents configured for routing.
   *
   * @returns {OrchestratorIntent[]} Array of configured intent identifiers.
   */
  public getSupportedIntents(): OrchestratorIntent[] {
    const intents = this.getConfigItem<Record<string, IntentConfig>>(
      "orchestration.intents"
    );
    if (!intents) return [];
    return Object.keys(intents);
  }

  /**
   * Determine whether the input question lacks sufficient context.
   *
   * @param {string} question - User's raw question.
   * @param {string} _intent - Candidate matched intent (unused, retained for future heuristics).
   * @returns {boolean} True if clarification should be requested.
   */
  private isQuestionTooVague(question: string, _intent: string): boolean {
    return containsAnyPhrase(question, this.vaguePhrases);
  }

  /**
   * Build helpful clarification response with examples
   * Classify intent for a question (legacy string or new structured input).
   *
   * @param {string | OrchestratorInput} questionOrInput - Raw question text or structured input.
   * @param {{ topic?: string }} [context] - Legacy context object providing topic.
   * @param {string} [context.topic] - Optional topic string used for classification context.
   * @returns {OrchestratorClassification} Classification result (intent & rationale).
   */
  classify(
    questionOrInput: string | OrchestratorInput,
    context?: { topic?: string }
  ): OrchestratorClassification {
    // Handle both legacy and new calling patterns
    let input: OrchestratorInput;
    if (typeof questionOrInput === "string") {
      // Legacy signature: classify(question, context)
      input = {
        question: questionOrInput,
        topic: context?.topic,
      };
    } else {
      // New signature: classify(input)
      input = questionOrInput;
    }

    // Score each intent based on configuration
    const intentScores: Array<{
      intent: string;
      score: number;
      matches: string[];
      agent: string;
    }> = [];

    const intents =
      this.getConfigItem<Record<string, IntentConfig>>(
        "orchestration.intents"
      ) || {};
    for (const intent of Object.keys(intents)) {
      const intentConfig = intents[intent];
      if (!intentConfig) continue;

      // Use shared text processing utility for signal scoring
      const signalResult = scoreSignals(
        input.question,
        intentConfig.signals || [],
        this.textProcessingConfig
      );

      const signalScore =
        signalResult.matched.length * this.scoringWeights.signalMatch;

      if (signalScore > 0) {
        intentScores.push({
          intent,
          score: signalScore,
          matches: signalResult.matched,
          agent: intentConfig.targetAgent,
        });
      }
    }

    // Sort by score and select best match
    intentScores.sort((a, b) => b.score - a.score);

    const bestMatch = intentScores[0];

    if (!bestMatch || bestMatch.score === 0) {
      return {
        intent: "clarification",
        rationale: this.messages.noIntentDetected,
        escalationPrompt: this.messages.needMoreContext,
        matchedSignals: [],
        missingSignals: [],
      };
    }

    // Check if the question is too vague even if it matches an intent
    if (this.isQuestionTooVague(input.question, bestMatch.intent)) {
      return {
        intent: "clarification",
        rationale: `Question matches ${bestMatch.intent} intent but lacks sufficient context`,
        escalationPrompt: this.messages.questionTooVague,
        matchedSignals: bestMatch.matches,
        missingSignals: this.messages.missingSignalsHint,
      };
    }

    return {
      intent: bestMatch.intent,
      rationale: `Classified as ${bestMatch.intent} based on ${bestMatch.matches.length} signal matches`,
      matchedSignals: bestMatch.matches,
      missingSignals: [],
    };
  }

  /**
   * Route an input using configured intent/agent mappings.
   *
   * @param {OrchestratorInput} input - Structured user request.
   * @returns {Promise<OrchestratorResponse>} Resolved routing response.
   */
  async route(input: OrchestratorInput): Promise<OrchestratorResponse> {
    const classification = this.classify(input);

    // Create more contextual summary and payload
    const agent =
      this.intentAgentMap[classification.intent] || this._getFallbackAgent();
    const summary = this.generateSummary(classification, input);
    const payload = this.generatePayload(classification, input);

    // Compose a message and delegate formatting to CommunicationAgent
    const lines: string[] = [];
    lines.push(
      `## ${
        classification.intent.charAt(0).toUpperCase() +
        classification.intent.slice(1)
      } Request`
    );
    if (summary) lines.push(summary);
    if (agent !== this._getFallbackAgent()) {
      lines.push(`*Routing to: ${agent}*`);
    }
    if ((classification.matchedSignals?.length || 0) > 0) {
      lines.push(
        `**Matched keywords:** ${classification.matchedSignals!.join(", ")}`
      );
    }
    const message = lines.join("\n\n");
    const formatted = this.communicationAgent.formatSuccess(
      CommunicationAgent.createSuccessResponse(payload, {
        message,
        metadata: { operation: "route", intent: classification.intent },
      })
    );

    return {
      intent: classification.intent,
      agent,
      summary,
      rationale: classification.rationale,
      payload,
      formatted: { message: formatted.message, markdown: formatted.message },
    };
  }

  /**
   * Create a concise summary describing the routing decision.
   *
   * @param {OrchestratorClassification} classification - Classification result.
   * @param {OrchestratorInput} input - Original user input.
   * @returns {string} Human readable summary.
   */
  private generateSummary(
    classification: OrchestratorClassification,
    input: OrchestratorInput
  ): string {
    const rawSummaries = (this.messages.summaries ?? {}) as Record<
      string,
      unknown
    >;
    const defaultTopic =
      (rawSummaries as { defaultTopic?: string }).defaultTopic ??
      "the requested data";
    const topic = input.topic ?? defaultTopic;
    const metadata = (rawSummaries as { metadata?: string }).metadata ?? "";
    const records = (rawSummaries as { records?: string }).records ?? "";
    const insight = (rawSummaries as { insight?: string }).insight ?? "";
    const clarification =
      (rawSummaries as { clarification?: string }).clarification ?? "";

    switch (classification.intent) {
      case "metadata":
        return metadata.replace("{topic}", topic);
      case "records":
        return records.replace("{topic}", topic);
      case "insight":
        return insight.replace("{topic}", topic);
      case "clarification":
        return clarification;
      default:
        return `Routed to ${classification.intent}`;
    }
  }

  /**
   * Build structured payload tailored to the classified intent.
   *
   * @param {OrchestratorClassification} classification - Classification result.
   * @param {OrchestratorInput} input - Original user input.
   * @returns {unknown} Intent-specific payload object.
   */
  private generatePayload(
    classification: OrchestratorClassification,
    input: OrchestratorInput
  ): unknown {
    const basePayload = { classification, input };

    switch (classification.intent) {
      case "metadata":
        return {
          ...basePayload,
          guidance: this.messages.guidance.metadata,
          matchedSignals: classification.matchedSignals,
        };
      case "records":
        return {
          ...basePayload,
          connections: this.messages.guidance.recordsConnections,
          guidance: this.messages.guidance.recordsFiltering,
        };
      case "insight":
        return {
          ...basePayload,
          plan: { steps: this.messages.guidance.insightPlan },
          overview: this.messages.guidance.insightOverview,
          guidance: this.messages.guidance.insightRecommendations,
        };
      case "clarification":
        return {
          ...basePayload,
          prompt: this.messages.guidance.clarificationPrompt,
        };
      default:
        return basePayload;
    }
  }

  /**
   * High-level entry point wrapping classification + routing + formatting.
   *
   * @param {OrchestratorInput} input - Structured user request.
   * @returns {Promise<OrchestratorResponse>} Final enriched response.
   */
  async handle(input: OrchestratorInput): Promise<OrchestratorResponse> {
    try {
      // Delegate to the existing route method
      const response = await this.route(input);

      // Return typed response; presentation owned by CommunicationAgent via `formatted`
      return response;
    } catch (error) {
      // Fallback error handling
      return {
        intent: "clarification",
        agent: this._getFallbackAgent(),
        summary: this.messages.errorOccurred,
        rationale: error instanceof Error ? error.message : "Unknown error",
        payload: { error, input },
        formatted: {
          message: `## Error\n\nI encountered an issue while processing your request: ${
            error instanceof Error ? error.message : "Unknown error"
          }\n\nPlease try rephrasing your question or ask for help.`,
          markdown: `## Error\n\nI encountered an issue while processing your request: ${
            error instanceof Error ? error.message : "Unknown error"
          }\n\nPlease try rephrasing your question or ask for help.`,
        },
      };
    }
  }

  // Presentation helpers were removed; CommunicationAgent owns user-facing formatting.

  /**
   * Snapshot current high-level orchestrator settings for diagnostics.
   *
   * @returns {Record<string, unknown>} Diagnostic summary object.
   */
  public getCurrentConfig(): Record<string, unknown> {
    return {
      supportedIntents: this.getSupportedIntents(),
      intentAgentMap: this.intentAgentMap,
      stopWordsCount: this.stopWords.size,
      scoringWeights: this.scoringWeights,
    };
  }

  // -------------------------
  // Validation & helper accessors
  // -------------------------

  /**
   * Validate required configuration paths.
   *
   * @throws {Error} When any required path missing.
   */
  private _validateRequiredSections(): void {
    const required: readonly string[] = [
      "orchestration.intents",
      "orchestration.textProcessing.stopWords",
      "orchestration.textProcessing.minimumKeywordLength",
      "orchestration.textProcessing.scoringWeights.signalMatch",
      "orchestration.textProcessing.scoringWeights.focusMatch",
      "orchestration.textProcessing.scoringWeights.promptStarterMatch",
      "orchestration.escalation.fallbackAgent",
      "orchestration.messages.noIntentDetected",
      "orchestration.messages.needMoreContext",
      "orchestration.messages.questionTooVague",
      "orchestration.messages.missingSignalsHint",
      "orchestration.messages.errorOccurred",
      "orchestration.messages.summaries.defaultTopic",
      "orchestration.messages.guidance.clarificationPrompt",
    ];
    const { passed, missing } = this.confirmConfigItems(required);
    if (!passed) {
      throw new Error(
        `Orchestrator configuration missing required items: ${missing.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Get configured fallback agent.
   *
   * @returns {string} Fallback agent id.
   * @throws {Error} When not configured.
   */
  private _getFallbackAgent(): string {
    const agent = this.getConfigItem<string>(
      "orchestration.escalation.fallbackAgent"
    );
    if (!agent) {
      throw new Error("Orchestrator config missing escalation.fallbackAgent");
    }
    return agent;
  }

  /**
   * Descriptor map for dynamic configuration access.
   *
   * @returns {Record<string, {name:string; path:string; type:string; visibility:"public"|"private"; verifyPaths?: string[]}>} Descriptor definitions.
   */
  public getConfigDescriptors(): Record<string, ConfigDescriptor> {
    return createDescriptorMap([
      [
        "vaguePhrases",
        {
          name: "Vague Phrases",
          path: "orchestration.escalation.vaguePhrases",
          type: "string[]",
          visibility: "public",
          verifyPaths: ["orchestration.escalation.vaguePhrases"],
          group: "Escalation",
          description:
            "List of phrases that trigger escalation to fallback agent",
          /**
           * Validate that the value is an array of strings.
           *
           * @param {unknown} value - Value to validate.
           * @returns {boolean | string} True if valid, error message if invalid.
           */
          validate: (value: unknown): boolean | string => {
            if (!Array.isArray(value)) return "Must be an array";
            return (
              value.every((item) => typeof item === "string") ||
              "All items must be strings"
            );
          },
        },
      ],
      [
        "fallbackAgent",
        {
          name: "Fallback Agent",
          path: "orchestration.escalation.fallbackAgent",
          type: "string",
          visibility: "public",
          verifyPaths: ["orchestration.escalation.fallbackAgent"],
        },
      ],
      [
        "stopWords",
        {
          name: "Stop Words",
          path: "orchestration.textProcessing.stopWords",
          type: "string[]",
          visibility: "public",
          verifyPaths: ["orchestration.textProcessing.stopWords"],
        },
      ],
      [
        "minimumKeywordLength",
        {
          name: "Minimum Keyword Length",
          path: "orchestration.textProcessing.minimumKeywordLength",
          type: "number",
          visibility: "public",
          verifyPaths: ["orchestration.textProcessing.minimumKeywordLength"],
        },
      ],
      [
        "scoringWeights",
        {
          name: "Scoring Weights",
          path: "orchestration.textProcessing.scoringWeights",
          type: "{ signalMatch:number; focusMatch:number; promptStarterMatch:number }",
          visibility: "private",
          verifyPaths: [
            "orchestration.textProcessing.scoringWeights.signalMatch",
            "orchestration.textProcessing.scoringWeights.focusMatch",
            "orchestration.textProcessing.scoringWeights.promptStarterMatch",
          ],
        },
      ],
      [
        "intents",
        {
          name: "Intents",
          path: "orchestration.intents",
          type: "Record<string, IntentConfig>",
          visibility: "private",
          verifyPaths: ["orchestration.intents"],
        },
      ],
      [
        "messages",
        {
          name: "Messages",
          path: "orchestration.messages",
          type: "OrchestrationConfig['messages']",
          visibility: "public",
          verifyPaths: ["orchestration.messages"],
        },
      ],
    ]);
  }

  /**
   * Get all descriptors for this agent (delegates to getConfigDescriptors).
   *
   * @returns {Record<string, ConfigDescriptor>} Map of descriptor keys to their definitions.
   */
  public getAllDescriptors(): Record<string, ConfigDescriptor> {
    return this.getConfigDescriptors();
  }

  /**
   * Create default orchestrator using embedded TS config.
   *
   * @returns {Orchestrator} Orchestrator instance.
   */
  public static createDefault(): Orchestrator {
    return new Orchestrator(orchestratorConfig);
  }

  // -------------------------
  // Agent Call Wrappers (Demonstration of Correct Pattern)
  // -------------------------

  /**
   * Execute an agent method and wrap the result in a formatted response.
   *
   * This method demonstrates the CORRECT architecture pattern where:
   * 1. Orchestrator calls agent method (agent returns typed data)
   * 2. Orchestrator builds AgentResponse<T> with metadata
   * 3. Orchestrator uses CommunicationAgent for formatting
   *
   * Agents MUST NOT import from other agents. This pattern maintains agent isolation.
   *
   * @template T Type of data returned by the agent
   * @param {string} agentId - Identifier of the agent being called.
   * @param {string} operation - Name of the operation being performed.
   * @param {() => Promise<T>} agentCall - Async function that calls the agent method.
   * @param {Partial<AgentResponse<T>>} [options] - Optional metadata to include in response.
   * @returns {Promise<AgentResponse<T>>} Structured response ready for formatting.
   *
   * @example
   * ```typescript
   * // Call DatabaseAgent
   * const response = await orchestrator.callAgentWithResponse(
   *   "database-agent",
   *   "executeQuery",
   *   () => databaseAgent.executeQuery("people", { skill: "python" }),
   *   { metadata: { entityType: "people" } }
   * );
   * const formatted = communicationAgent.formatSuccess(response);
   * ```
   */
  async callAgentWithResponse<T>(
    agentId: string,
    operation: string,
    agentCall: () => Promise<T>,
    options?: Partial<AgentResponse<T>>
  ): Promise<AgentResponse<T>> {
    try {
      const startTime = Date.now();
      const data = await agentCall();
      const duration = Date.now() - startTime;

      // Determine count if data is an array
      const count = Array.isArray(data) ? data.length : undefined;

      return CommunicationAgent.createSuccessResponse(data, {
        ...options,
        message:
          options?.message ||
          `${operation} completed successfully in ${duration}ms`,
        metadata: {
          agentId,
          operation,
          timestamp: Date.now(),
          duration,
          count,
          ...options?.metadata,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Determine error severity based on context
      const severity = this.assessErrorSeverity(error, operation);

      // Generate recovery suggestions
      const suggestions = this.generateRecoverySuggestions(error, operation);

      return CommunicationAgent.createErrorResponse(errorMessage, {
        ...options,
        metadata: {
          agentId,
          operation,
          timestamp: Date.now(),
          ...options?.metadata,
        },
        errors: [
          {
            message: errorMessage,
            severity,
            code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
            suggestions,
          },
        ],
      });
    }
  }

  /**
   * Assess error severity based on error type and operation context.
   *
   * @param {unknown} error - The error that occurred.
   * @param {string} _operation - Name of the operation that failed (reserved for future use).
   * @returns {SeverityLevel} Assessed severity level.
   */
  private assessErrorSeverity(
    error: unknown,
    _operation: string
  ): "low" | "medium" | "high" | "critical" {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    // Critical: System-level failures
    if (
      errorMessage.includes("out of memory") ||
      errorMessage.includes("system error")
    ) {
      return "critical";
    }

    // High: Data corruption or security issues
    if (
      errorMessage.includes("corrupt") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("permission denied")
    ) {
      return "high";
    }

    // Low: Expected user errors (not found, invalid input)
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("does not exist") ||
      errorMessage.includes("invalid")
    ) {
      return "low";
    }

    // Medium: Default for unexpected errors
    return "medium";
  }

  /**
   * Generate contextual recovery suggestions based on error type.
   *
   * @param {unknown} error - The error that occurred.
   * @param {string} operation - Name of the operation that failed.
   * @returns {string[]} Array of recovery suggestions.
   */
  private generateRecoverySuggestions(
    error: unknown,
    operation: string
  ): string[] {
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : String(error);
    const suggestions: string[] = [];

    // Category not found
    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("does not exist")
    ) {
      suggestions.push(
        "Verify the category ID or entity name is spelled correctly"
      );
      suggestions.push("Use the metadata agent to list available categories");
    }

    // Permission errors
    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("unauthorized")
    ) {
      suggestions.push("Check that you have access to the requested resource");
      suggestions.push("Contact your administrator if access is needed");
    }

    // Timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      suggestions.push(
        "Try again with a smaller dataset or more specific filters"
      );
      suggestions.push("Consider breaking the query into smaller parts");
    }

    // Validation errors
    if (
      errorMessage.includes("invalid") ||
      errorMessage.includes("validation")
    ) {
      suggestions.push("Check that all required parameters are provided");
      suggestions.push("Review the parameter format and try again");
    }

    // Generic fallback
    if (suggestions.length === 0) {
      suggestions.push(`Retry the ${operation} operation`);
      suggestions.push("Check the error message for specific details");
    }

    return suggestions;
  }

  // ============================================================================
  // Workflow Coordination Methods
  // ============================================================================
  // Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md for complete implementation

  /**
   * Generate unique workflow identifier
   *
   * Format: wf-{counter}-{timestamp}
   * Example: wf-1-1699654321
   *
   * @returns {string} Unique workflow ID string
   */
  private generateWorkflowId(): string {
    this.workflowIdCounter++;
    const timestamp = Date.now().toString(36);
    return `wf-${this.workflowIdCounter}-${timestamp}`;
  }

  /**
   * Initialize performance metrics for a workflow
   *
   * @param {string} workflowId - Unique workflow identifier
   * @returns {PerformanceMetrics} Initialized PerformanceMetrics object
   */
  private initializeMetrics(workflowId: string): PerformanceMetrics {
    const now = Date.now();
    return {
      workflowId,
      totalDuration: 0,
      classificationDuration: 0,
      planningDuration: 0,
      executionDuration: 0,
      formattingDuration: 0,
      actionMetrics: [],
      startTime: now,
      endTime: now,
    };
  }

  /**
   * Check performance metrics and log warnings for slow operations
   *
   * Thresholds:
   * - Workflow: >5000ms
   * - Action: >2000ms
   *
   * @param {PerformanceMetrics} metrics - Performance metrics to check
   */
  private checkPerformance(metrics: PerformanceMetrics): void {
    // Check overall workflow duration
    if (metrics.totalDuration > 5000) {
      console.warn(
        `⚠️ Slow workflow: ${metrics.workflowId} took ${metrics.totalDuration}ms`
      );
    }

    // Check individual action durations
    metrics.actionMetrics.forEach((action) => {
      if (action.duration > 2000) {
        console.warn(
          `⚠️ Slow action: ${action.agent}.${action.method} took ${action.duration}ms`
        );
      }
    });
  }

  /**
   * Record workflow in history for debugging and replay
   *
   * Keeps only the most recent 100 workflows to limit memory usage
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {OrchestratorInput} input - Original user input
   * @param {WorkflowResult} result - Final workflow result
   * @param {number} duration - Total workflow duration in ms
   * @param {WorkflowHistory["events"]} events - Array of workflow events for replay
   */
  private recordWorkflow(
    workflowId: string,
    input: OrchestratorInput,
    result: WorkflowResult,
    duration: number,
    events: WorkflowHistory["events"]
  ): void {
    const MAX_HISTORY_SIZE = 100;

    this.workflowHistory.push({
      workflowId,
      input: input as WorkflowHistory["input"],
      result,
      duration,
      timestamp: Date.now(),
      events,
    });

    // Keep only recent history
    if (this.workflowHistory.length > MAX_HISTORY_SIZE) {
      this.workflowHistory.shift();
    }
  }

  /**
   * Get diagnostic snapshot of workflow state
   *
   * Useful for debugging stuck workflows or understanding execution
   *
   * @param {string} workflowId - Unique workflow identifier
   * @returns {WorkflowDiagnostics | null} Diagnostic snapshot or null if workflow not found
   */
  public getWorkflowDiagnostics(
    workflowId: string
  ): WorkflowDiagnostics | null {
    const context = this.workflows.get(workflowId);
    if (!context) return null;

    return {
      workflowId,
      state: context.state,
      input: context.input,
      classification: context.classification,
      totalActions:
        context.pendingActions.length + context.completedActions.length,
      completedActions: context.completedActions.length,
      failedActions: context.completedActions.filter(
        (a) => a.status === "failed"
      ).length,
      currentAction: context.currentAction,
      pendingActions: context.pendingActions,
      errors: context.errors,
      startTime: context.startTime,
      elapsedTime: Date.now() - context.startTime,
    };
  }

  /**
   * List all active workflows (for monitoring dashboard)
   *
   * @returns {WorkflowDiagnostics[]} Array of diagnostic snapshots for active workflows
   */
  public getActiveWorkflows(): WorkflowDiagnostics[] {
    return Array.from(this.workflows.entries())
      .filter(([_, ctx]) => ctx.state !== "completed" && ctx.state !== "failed")
      .map(([id, _]) => this.getWorkflowDiagnostics(id)!)
      .filter((diag): diag is WorkflowDiagnostics => diag !== null);
  }

  /**
   * Replay workflow for debugging (without executing agents)
   *
   * @param {string} workflowId - Unique workflow identifier to replay
   * @returns {WorkflowHistory | null} Workflow history or null if not found
   */
  public replayWorkflow(workflowId: string): WorkflowHistory | null {
    return (
      this.workflowHistory.find((h) => h.workflowId === workflowId) || null
    );
  }

  /**
   * Get recent failed workflows for debugging
   *
   * @param {number} [limit=10] - Maximum number of failed workflows to return
   * @returns {WorkflowHistory[]} Array of failed workflow histories
   */
  public getFailedWorkflows(limit = 10): WorkflowHistory[] {
    return this.workflowHistory
      .filter((h) => h.result.state === "failed")
      .slice(-limit);
  }

  /**
   * Check agent registry health status
   *
   * Verifies all agents in the registry are properly initialized
   *
   * @returns {{ healthy: boolean; agents: Record<string, boolean>; message: string }} Health status with agent availability
   */
  public checkAgentHealth(): {
    healthy: boolean;
    agents: Record<string, boolean>;
    message: string;
  } {
    const agentStatus: Record<string, boolean> = {
      "database-agent": this.agentRegistry["database-agent"] !== null,
      "data-agent": this.agentRegistry["data-agent"] !== null,
      "user-context-agent": this.agentRegistry["user-context-agent"] !== null,
    };

    const allHealthy = Object.values(agentStatus).every((status) => status);
    const healthyCount = Object.values(agentStatus).filter(
      (status) => status
    ).length;

    return {
      healthy: allHealthy,
      agents: agentStatus,
      message: allHealthy
        ? "All agents initialized successfully"
        : `${healthyCount}/3 agents initialized`,
    };
  }

  /**
   * Generates a human-readable performance summary for a completed workflow
   *
   * Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md - Performance Monitoring section
   *
   * @param {PerformanceMetrics} metrics - Performance metrics to summarize
   * @returns {string} Formatted performance summary string with breakdown and percentages
   */
  private generatePerformanceSummary(metrics: PerformanceMetrics): string {
    const {
      totalDuration,
      classificationDuration,
      planningDuration,
      executionDuration,
      formattingDuration,
      actionMetrics,
    } = metrics;

    const lines: string[] = [
      `Total Duration: ${totalDuration}ms`,
      `Breakdown:`,
      `  - Classification: ${classificationDuration}ms (${(
        (classificationDuration / totalDuration) *
        100
      ).toFixed(1)}%)`,
      `  - Planning: ${planningDuration}ms (${(
        (planningDuration / totalDuration) *
        100
      ).toFixed(1)}%)`,
      `  - Execution: ${executionDuration}ms (${(
        (executionDuration / totalDuration) *
        100
      ).toFixed(1)}%)`,
      `  - Formatting: ${formattingDuration}ms (${(
        (formattingDuration / totalDuration) *
        100
      ).toFixed(1)}%)`,
    ];

    // Add action timings if any
    if (actionMetrics.length > 0) {
      lines.push(`Actions:`);
      actionMetrics.forEach(
        ({ actionId, agent, method, duration, recordCount }) => {
          const countInfo =
            recordCount !== undefined ? ` (${recordCount} records)` : "";
          lines.push(
            `  - ${actionId} (${agent}.${method}): ${duration}ms${countInfo}`
          );
        }
      );
    }

    return lines.join("\n");
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Validate workflow input
   *
   * Ensures input meets basic requirements before workflow execution
   *
   * @param {OrchestratorInput} input - User input to validate
   * @returns {{ valid: boolean; error?: string }} Validation result
   */
  private validateInput(input: OrchestratorInput): {
    valid: boolean;
    error?: string;
  } {
    // Check required question field
    if (!input.question || typeof input.question !== "string") {
      return {
        valid: false,
        error: "Input must include a 'question' string field",
      };
    }

    // Check question is not empty
    const trimmed = input.question.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        error: "Question cannot be empty",
      };
    }

    // Check maximum length (1000 characters)
    if (trimmed.length > 1000) {
      return {
        valid: false,
        error: `Question too long (${trimmed.length} characters, maximum 1000)`,
      };
    }

    // Check topic is valid if provided
    if (
      input.topic &&
      !["general", "metadata", "records", "insight"].includes(input.topic)
    ) {
      return {
        valid: false,
        error: `Invalid topic: "${input.topic}". Must be one of: general, metadata, records, insight`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate workflow action definition
   *
   * Ensures action has all required fields and references valid agents/methods
   *
   * @param {WorkflowAction} action - Action to validate
   * @returns {{ valid: boolean; error?: string }} Validation result
   */
  private validateAction(action: WorkflowAction): {
    valid: boolean;
    error?: string;
  } {
    // Check required id field
    if (!action.id || typeof action.id !== "string") {
      return {
        valid: false,
        error: "Action must include an 'id' string field",
      };
    }

    // Check required type field
    if (!action.type) {
      return {
        valid: false,
        error: `Action ${action.id}: missing 'type' field`,
      };
    }

    // Check valid type
    const validTypes: WorkflowActionType[] = [
      "classify",
      "execute-agent",
      "format",
      "clarify",
    ];
    if (!validTypes.includes(action.type)) {
      return {
        valid: false,
        error: `Action ${action.id}: invalid type "${
          action.type
        }". Must be one of: ${validTypes.join(", ")}`,
      };
    }

    // For execute-agent actions, validate agent and method
    if (action.type === "execute-agent") {
      // Check agent field
      if (!action.agent) {
        return {
          valid: false,
          error: `Action ${action.id}: execute-agent type requires 'agent' field`,
        };
      }

      // Check agent exists in registry (data-driven from registry keys)
      const validAgents = Object.keys(this.agentRegistry || {});
      if (!validAgents.includes(action.agent)) {
        return {
          valid: false,
          error: `Action ${action.id}: unknown agent "${
            action.agent
          }". Must be one of: ${validAgents.join(", ")}`,
        };
      }

      // Check agent is initialized
      if (
        !this.agentRegistry[action.agent as keyof typeof this.agentRegistry]
      ) {
        return {
          valid: false,
          error: `Action ${action.id}: agent "${action.agent}" not initialized`,
        };
      }

      // Check method field
      if (!action.method) {
        return {
          valid: false,
          error: `Action ${action.id}: execute-agent type requires 'method' field`,
        };
      }

      // Validate method exists on agent (basic check - method name is string)
      if (typeof action.method !== "string") {
        return {
          valid: false,
          error: `Action ${action.id}: method must be a string`,
        };
      }
    }

    // Validate dependencies if present
    if (action.dependencies && !Array.isArray(action.dependencies)) {
      return {
        valid: false,
        error: `Action ${action.id}: dependencies must be an array`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate workflow state transition
   *
   * Ensures state transitions follow the valid state machine
   *
   * Valid transitions:
   * - pending → classifying
   * - classifying → executing | needs-clarification
   * - executing → processing | failed
   * - processing → completed | failed
   * - needs-clarification → (external - waiting for user)
   *
   * @param {WorkflowState} fromState - Current state
   * @param {WorkflowState} toState - Target state
   * @returns {{ valid: boolean; error?: string }} Validation result
   */
  private validateStateTransition(
    fromState: WorkflowState,
    toState: WorkflowState
  ): {
    valid: boolean;
    error?: string;
  } {
    // Define valid transitions
    const validTransitions: Record<WorkflowState, WorkflowState[]> = {
      pending: ["classifying"],
      classifying: ["executing", "needs-clarification", "failed"],
      executing: ["processing", "failed"],
      processing: ["completed", "failed"],
      "needs-clarification": ["classifying"], // After user provides clarification
      completed: [], // Terminal state
      failed: [], // Terminal state
    };

    // Check if transition is valid
    const allowedStates = validTransitions[fromState];
    if (!allowedStates.includes(toState)) {
      return {
        valid: false,
        error: `Invalid state transition: ${fromState} → ${toState}. Allowed transitions from ${fromState}: ${
          allowedStates.join(", ") || "none (terminal state)"
        }`,
      };
    }

    return { valid: true };
  }

  // ============================================================================
  // Workflow Execution Methods
  // ============================================================================

  /**
   * Execute a complete workflow from user input to formatted response
   *
   * This is the main entry point for workflow execution. It orchestrates:
   * 1. Input validation
   * 2. Classification
   * 3. Action planning
   * 4. Action execution (with dependencies)
   * 5. Response formatting
   * 6. Performance tracking
   * 7. Error handling and recovery
   *
   * @param {OrchestratorInput} input - User input to process
   * @param {number} [timeout=30000] - Workflow timeout in milliseconds (default 30s)
   * @returns {Promise<WorkflowResult>} Complete workflow result with formatted response
   */
  public async executeWorkflow(
    input: OrchestratorInput,
    timeout = 30000
  ): Promise<WorkflowResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();

    // Initialize workflow context
    const context: WorkflowContext = {
      workflowId,
      state: "pending",
      input: {
        question: input.question,
        topic: input.topic,
      },
      classification: undefined,
      currentAction: null,
      completedActions: [],
      pendingActions: [],
      results: new Map<string, unknown>(),
      errors: [],
      metrics: this.initializeMetrics(workflowId),
      startTime,
      endTime: undefined,
    };

    this.workflows.set(workflowId, context);
    this.logger.logWorkflowStart(workflowId, input);

    try {
      // Validate input
      const inputValidation = this.validateInput(input);
      if (!inputValidation.valid) {
        return await this.failWorkflow(
          context,
          new Error(`Invalid input: ${inputValidation.error}`)
        );
      }

      // Transition to classifying
      await this.transitionState(context, "classifying");

      // Classify user intent
      const classificationStart = Date.now();
      const classification = this.classify(input);
      context.classification = {
        intent: classification.intent,
        agent:
          this.intentAgentMap[classification.intent] || "user-context-agent",
      };
      if (context.metrics) {
        context.metrics.classificationDuration =
          Date.now() - classificationStart;
      }

      this.logger.logClassification(workflowId, classification);

      // Check if clarification needed (vague query)
      const vaguePhraseFound = this.vaguePhrases.some((phrase) =>
        input.question.toLowerCase().includes(phrase)
      );
      if (
        vaguePhraseFound ||
        classification.intent === "clarification" ||
        classification.intent === "general"
      ) {
        await this.transitionState(context, "needs-clarification");

        // Get available categories from UserContextAgent
        const userContextAgent = this.agentRegistry["user-context-agent"];
        let categoryNames: string[] = [];
        if (
          userContextAgent &&
          typeof userContextAgent === "object" &&
          "listCategories" in userContextAgent
        ) {
          const categories =
            (
              userContextAgent as {
                listCategories: () => Array<{ name: string }>;
              }
            ).listCategories() || [];
          categoryNames = categories.map((c) => c.name);
        }

        // Delegate clarification formatting to CommunicationAgent
        const clarificationResponse: AgentResponse = {
          type: "info",
          status: "in-progress",
          message: "I need more information to help you properly",
          metadata: {
            originalQuestion: input.question,
            matchedIntent:
              classification.intent !== "clarification"
                ? classification.intent
                : undefined,
            availableCategories: categoryNames,
          },
        };

        const formatted = this.communicationAgent.formatClarification(
          clarificationResponse
        );

        return this.buildWorkflowResult(context, "needs-clarification", {
          message: formatted.message,
          markdown: formatted.message,
        });
      }

      // Transition to executing
      await this.transitionState(context, "executing");

      // Plan actions
      const planningStart = Date.now();
      const actions = await this.planActions(classification, input);
      context.pendingActions = actions;
      if (context.metrics) {
        context.metrics.planningDuration = Date.now() - planningStart;
      }

      // Log planned actions
      actions.forEach((action) =>
        this.logger.logActionPlanned(workflowId, action)
      );

      // Execute actions with timeout
      const executionPromise = this.executeActions(context);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Workflow timeout after ${timeout}ms`)),
          timeout
        )
      );

      await Promise.race([executionPromise, timeoutPromise]);

      // Transition to processing
      await this.transitionState(context, "processing");

      // Format final response
      const formattingStart = Date.now();
      const formatted = await this.formatWorkflowResult(context);
      if (context.metrics) {
        context.metrics.formattingDuration = Date.now() - formattingStart;
      }

      // Transition to completed
      await this.transitionState(context, "completed");

      // Build final result
      const result = this.buildWorkflowResult(context, "completed", formatted);

      // Record workflow for history
      const duration = Date.now() - startTime;
      this.recordWorkflow(workflowId, input, result, duration, []);

      // Check performance
      if (context.metrics) {
        this.checkPerformance(context.metrics);
      }

      // Log completion
      this.logger.logWorkflowComplete(workflowId, result);

      return result;
    } catch (error) {
      return await this.failWorkflow(
        context,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      // Update end time
      context.endTime = Date.now();
      if (context.metrics) {
        context.metrics.endTime = Date.now();
        context.metrics.totalDuration = context.endTime - startTime;
      }

      // Remove from active workflows after a delay (keep for diagnostics)
      setTimeout(() => this.workflows.delete(workflowId), 60000);
    }
  }

  /**
   * Plan workflow actions based on classification
   *
   * Maps user intents to specific agent method calls with parameters
   *
   * @param {OrchestratorClassification} classification - Intent classification
   * @param {OrchestratorInput} input - Original user input
   * @returns {Promise<WorkflowAction[]>} Array of planned actions
   */
  private async planActions(
    classification: OrchestratorClassification,
    input: OrchestratorInput
  ): Promise<WorkflowAction[]> {
    const actions: WorkflowAction[] = [];
    const intent = classification.intent;

    switch (intent) {
      case "metadata": {
        // Get user context snapshot - data-driven: no topicOrId specified
        const snapshotParams: GetSnapshotParams = {
          topicOrId: undefined, // Agent will use first available category
        };

        actions.push({
          id: "get-snapshot",
          type: "execute-agent",
          agent: "user-context-agent",
          method: "getOrCreateSnapshot",
          params: snapshotParams,
          status: "pending",
        });
        break;
      }

      case "records": {
        // Extract query parameters from user question - data-driven
        const queryParams: QueryParams = this.extractQueryParams(
          input.question
        );

        // Execute database query
        actions.push({
          id: "query-records",
          type: "execute-agent",
          agent: "database-agent",
          method: "executeQuery",
          params: queryParams,
          status: "pending",
        });
        break;
      }

      case "insight": {
        // Multi-step: query data, then analyze - data-driven
        const queryParams: QueryParams = this.extractQueryParams(
          input.question
        );

        // Step 1: Query data
        actions.push({
          id: "query-data",
          type: "execute-agent",
          agent: "database-agent",
          method: "executeQuery",
          params: queryParams,
          status: "pending",
        });

        // Step 2: Analyze results (depends on query) - data-driven
        const analyzeParams: AnalyzeParams = {
          data: undefined, // Will be populated from query-data result via dependency resolution
          analysisType: "summary", // Default analysis
          fields: undefined, // Agent will analyze all relevant fields
        };

        actions.push({
          id: "analyze-data",
          type: "execute-agent",
          agent: "data-agent",
          method: "analyzeData",
          params: analyzeParams,
          dependencies: ["query-data"],
          status: "pending",
        });
        break;
      }

      case "general":
      default: {
        // General queries might need clarification or simple routing - data-driven
        const snapshotParams: GetSnapshotParams = {
          topicOrId: undefined, // Agent will use first available category
        };

        actions.push({
          id: "get-context",
          type: "execute-agent",
          agent: "user-context-agent",
          method: "getOrCreateSnapshot",
          params: snapshotParams,
          status: "pending",
        });
        break;
      }
    }

    // Validate all planned actions
    for (const action of actions) {
      const validation = this.validateAction(action);
      if (!validation.valid) {
        throw new Error(`Action planning failed: ${validation.error}`);
      }
    }

    return actions;
  }

  /**
   * Extract query parameters from user question
   *
   * Parses natural language question into structured query parameters.
   * All extraction is DATA-DRIVEN based on actual category data from UserContextAgent.
   * Matches category names, aliases, and common filter keywords.
   *
   * @param {string} question - User's question
   * @returns {QueryParams} Structured query parameters for database agent
   */
  private extractQueryParams(question: string): QueryParams {
    const params: QueryParams = {
      limit: 10, // Default limit
    };

    // DATA-DRIVEN category matching using actual loaded categories
    const lowerQuestion = question.toLowerCase();

    if (this.userContextAgent) {
      try {
        const categories = this.userContextAgent.listCategories();

        // Match against category id, name, and aliases
        for (const categorySummary of categories) {
          const category = this.userContextAgent.getCategory(
            categorySummary.id
          );

          // Check category id (e.g., "people", "applications")
          if (lowerQuestion.includes(category.id.toLowerCase())) {
            params.category = category.id;
            break;
          }

          // Check category name (e.g., "People", "Applications")
          if (lowerQuestion.includes(category.name.toLowerCase())) {
            params.category = category.id;
            break;
          }

          // Check category aliases (e.g., "apps" -> "applications")
          if (category.aliases) {
            for (const alias of category.aliases) {
              if (lowerQuestion.includes(alias.toLowerCase())) {
                params.category = category.id;
                break;
              }
            }
            if (params.category) break; // Found match via alias
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to extract category from question:", error);
        // Fall through to hardcoded fallback
      }
    }

    // Extract filters - data-driven based on common skill keywords
    if (lowerQuestion.includes("python")) {
      params.filters = { skills: "Python" };
    } else if (
      lowerQuestion.includes("javascript") ||
      lowerQuestion.includes("js")
    ) {
      params.filters = { skills: "JavaScript" };
    } else if (lowerQuestion.includes("engineering")) {
      params.filters = { department: "Engineering" };
    }

    return params;
  }

  /**
   * Execute all pending actions in workflow context
   *
   * Handles action dependencies and executes in correct order
   *
   * @param {WorkflowContext} context - Workflow context with pending actions
   * @returns {Promise<void>}
   */
  private async executeActions(context: WorkflowContext): Promise<void> {
    const executionStart = Date.now();

    while (context.pendingActions.length > 0) {
      // Find next action with resolved dependencies
      const nextAction = this.findNextAction(context);

      if (!nextAction) {
        throw new Error(
          "No executable actions found (circular dependencies or all failed)"
        );
      }

      // Execute action
      await this.executeAction(nextAction, context);

      // Move to completed
      context.pendingActions = context.pendingActions.filter(
        (a) => a.id !== nextAction.id
      );
      context.completedActions.push(nextAction);
    }

    if (context.metrics) {
      context.metrics.executionDuration = Date.now() - executionStart;
    }
  }

  /**
   * Find next action ready to execute (dependencies resolved)
   *
   * @param {WorkflowContext} context - Workflow context
   * @returns {WorkflowAction | undefined} Next executable action or undefined
   */
  private findNextAction(context: WorkflowContext): WorkflowAction | undefined {
    return context.pendingActions.find((action) => {
      // Skip failed actions
      if (action.status === "failed") {
        return false;
      }

      // Check if all dependencies are completed
      if (!action.dependencies || action.dependencies.length === 0) {
        return true;
      }

      return action.dependencies.every((depId) =>
        context.completedActions.some(
          (a) => a.id === depId && a.status === "completed"
        )
      );
    });
  }

  /**
   * Execute a single workflow action
   *
   * Dispatches to agent method via registry, handles timeout and errors
   *
   * @param {WorkflowAction} action - Action to execute
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<void>}
   */
  private async executeAction(
    action: WorkflowAction,
    context: WorkflowContext
  ): Promise<void> {
    const actionTimeout = 10000; // 10 second per-action timeout
    action.status = "in-progress";
    action.startTime = Date.now();

    context.currentAction = action;
    this.logger.logActionStart(context.workflowId, action);

    try {
      // Resolve parameters (inject dependency results if needed)
      const resolvedParams = this.resolveParams(action, context);

      // Get agent from registry
      const agent =
        this.agentRegistry[action.agent as keyof typeof this.agentRegistry];

      if (!agent) {
        throw new Error(`Agent ${action.agent} not initialized`);
      }

      // Execute with timeout
      const executionPromise = this.callAgentMethod(
        agent,
        action.method!,
        resolvedParams
      );
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Action ${action.id} timeout after ${actionTimeout}ms`)
            ),
          actionTimeout
        )
      );

      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Store result
      action.result = result;
      action.status = "completed";
      action.endTime = Date.now();
      action.duration = action.endTime - action.startTime;

      context.results.set(action.id, result);

      // Add to metrics
      if (context.metrics) {
        context.metrics.actionMetrics.push({
          actionId: action.id,
          agent: action.agent!,
          method: action.method!,
          duration: action.duration,
          recordCount: Array.isArray(result) ? result.length : undefined,
          timestamp: Date.now(),
        });
      }

      this.logger.logActionComplete(context.workflowId, action);
    } catch (error) {
      action.status = "failed";
      action.error = error instanceof Error ? error : new Error(String(error));
      action.endTime = Date.now();
      action.duration = action.endTime - action.startTime;

      context.errors.push(action.error);

      this.logger.logActionFailed(context.workflowId, action, action.error);

      // Check if error is retryable
      const isRetryable = this.isRetryableError(action.error);

      if (!isRetryable) {
        throw action.error; // Fail workflow on non-retryable errors
      }

      // For retryable errors, continue (other actions might succeed)
    }
  }

  /**
   * Call agent method dynamically
   *
   * Handles various parameter formats:
   * - undefined: No params
   * - GetSnapshotParams/QueryParams/AnalyzeParams: Single structured object
   * - Array: Multiple positional arguments
   *
   * @param {unknown} agent - Agent instance
   * @param {string} method - Method name
   * @param {unknown} params - Method parameters (structured object, array, or undefined)
   * @returns {Promise<unknown>} Method result
   */
  private async callAgentMethod(
    agent: unknown,
    method: string,
    params: unknown
  ): Promise<unknown> {
    const agentObj = agent as Record<string, unknown>;
    const methodFn = agentObj[method];

    if (typeof methodFn !== "function") {
      throw new Error(`Method ${method} not found on agent`);
    }

    // Handle different parameter formats
    if (params === undefined) {
      // No parameters
      return await (methodFn as () => Promise<unknown>).call(agent);
    } else if (Array.isArray(params)) {
      // Multiple positional arguments
      return await (methodFn as (...args: unknown[]) => Promise<unknown>).apply(
        agent,
        params
      );
    } else if (typeof params === "object" && params !== null) {
      // Structured parameter object (GetSnapshotParams, QueryParams, AnalyzeParams, etc.)
      // Extract the actual parameter value(s) from the structured object
      const paramObj = params as Record<string, unknown>;

      // For GetSnapshotParams: { topicOrId?: string }
      if ("topicOrId" in paramObj) {
        return await (
          methodFn as (topicOrId?: string) => Promise<unknown>
        ).call(agent, paramObj.topicOrId as string | undefined);
      }

      // For QueryParams: destructure into positional args for DatabaseAgent.executeQuery
      if (
        "category" in paramObj ||
        "filters" in paramObj ||
        "limit" in paramObj
      ) {
        const queryParams = paramObj as {
          category?: string;
          filters?: Record<string, unknown>;
          limit?: number;
        };
        const categoryId = queryParams.category;
        const criteria = queryParams.filters || {};
        const options = queryParams.limit ? { limit: queryParams.limit } : {};

        return await (
          methodFn as (
            categoryId: string | undefined,
            criteria: Record<string, unknown>,
            options: Record<string, unknown>
          ) => Promise<unknown>
        ).call(agent, categoryId, criteria, options);
      }

      // For AnalyzeParams and other structured params: pass the whole object
      return await (methodFn as (params: unknown) => Promise<unknown>).call(
        agent,
        params
      );
    } else {
      // Single primitive parameter
      return await (methodFn as (arg: unknown) => Promise<unknown>).call(
        agent,
        params
      );
    }
  }

  /**
   * Resolve action parameters by injecting dependency results
   *
   * @param {WorkflowAction} action - Action with params to resolve
   * @param {WorkflowContext} context - Workflow context with results
   * @returns {unknown} Resolved parameters
   */
  private resolveParams(
    action: WorkflowAction,
    context: WorkflowContext
  ): unknown {
    // If no dependencies, return params as-is
    if (!action.dependencies || action.dependencies.length === 0) {
      return action.params;
    }

    // If action depends on previous results, inject them
    // For now, simple case: inject first dependency result as params
    const firstDepId = action.dependencies[0];
    const depResult = context.results.get(firstDepId);

    return depResult !== undefined ? depResult : action.params;
  }

  /**
   * Check if error is retryable
   *
   * @param {Error} error - Error to check
   * @returns {boolean} True if error might succeed on retry
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network/timeout errors are retryable
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return true;
    }

    // Not found, permission errors are not retryable
    if (
      message.includes("not found") ||
      message.includes("permission") ||
      message.includes("unauthorized")
    ) {
      return false;
    }

    // Default: not retryable
    return false;
  }

  /**
   * Transition workflow to new state
   *
   * Validates transition and logs state change
   *
   * @param {WorkflowContext} context - Workflow context
   * @param {WorkflowState} newState - Target state
   * @returns {Promise<void>}
   */
  private async transitionState(
    context: WorkflowContext,
    newState: WorkflowState
  ): Promise<void> {
    const validation = this.validateStateTransition(context.state, newState);

    if (!validation.valid) {
      throw new Error(`State transition failed: ${validation.error}`);
    }

    const oldState = context.state;
    context.state = newState;

    this.logger.logStateTransition(context.workflowId, oldState, newState);
  }

  /**
   * Format workflow result into user-facing response
   *
   * Delegates to CommunicationAgent for proper user-friendly formatting
   * instead of doing simple Object.entries() dump.
   *
   * @param {WorkflowContext} context - Workflow context
   * @returns {Promise<{ message: string; markdown?: string }>} Formatted response
   */
  private async formatWorkflowResult(
    context: WorkflowContext
  ): Promise<{ message: string; markdown?: string }> {
    // Get primary result (last completed action)
    const lastAction =
      context.completedActions[context.completedActions.length - 1];

    if (!lastAction || !lastAction.result) {
      return {
        message: "Workflow completed but no results available",
      };
    }

    const result = lastAction.result;

    // Use CommunicationAgent for other response types
    try {
      // Wrap result in AgentResponse structure
      const agentResponse: AgentResponse<unknown> = {
        type: "success",
        status: "success",
        data: result,
        message: "Request completed successfully",
      };

      // Format using CommunicationAgent
      const formatted = this.communicationAgent.formatSuccess(agentResponse);

      return {
        message: formatted.message,
        markdown: formatted.message, // FormattedResponse.message contains the formatted text
      };
    } catch (error) {
      // Fallback to minimal message only to avoid hand-rolled formatting
      console.warn(
        "CommunicationAgent formatting failed; returning minimal message only",
        error
      );
      return { message: String(result) };
    }
  }

  // Note: Manual formatting helpers (formatRecords/formatObject) were removed.
  // All user-facing formatting is delegated to CommunicationAgent.

  /**
   * Build workflow result object
   *
   * @param {WorkflowContext} context - Workflow context
   * @param {WorkflowState} state - Final state
   * @param {object} [formatted] - Formatted response object
   * @param {string} formatted.message - Human-readable message describing the result
   * @param {string} [formatted.markdown] - Optional markdown-formatted content for rich display
   * @returns {WorkflowResult} Complete workflow result
   */
  private buildWorkflowResult(
    context: WorkflowContext,
    state: WorkflowState,
    formatted?: { message: string; markdown?: string }
  ): WorkflowResult {
    // Get primary data result
    const lastAction =
      context.completedActions[context.completedActions.length - 1];
    const data = lastAction?.result;

    return {
      state,
      data,
      error: context.errors.length > 0 ? context.errors[0] : undefined,
      formatted,
      metrics: context.metrics,
      workflowId: context.workflowId,
    };
  }

  /**
   * Fail workflow with error
   *
   * @param {WorkflowContext} context - Workflow context
   * @param {Error} error - Error that caused failure
   * @returns {Promise<WorkflowResult>} Failed workflow result
   */
  private async failWorkflow(
    context: WorkflowContext,
    error: Error
  ): Promise<WorkflowResult> {
    // Transition to failed state (skip validation since this is error handling)
    context.state = "failed";
    context.errors.push(error);

    this.logger.logWorkflowFailed(context.workflowId, error);

    // Build error result
    const result: WorkflowResult = {
      state: "failed",
      error,
      formatted: {
        message: `Workflow failed: ${error.message}`,
      },
      metrics: context.metrics,
      workflowId: context.workflowId,
    };

    // Record failed workflow
    const duration = Date.now() - context.startTime;
    this.recordWorkflow(
      context.workflowId,
      context.input,
      result,
      duration,
      []
    );

    return result;
  }
}
