/**
 * @packageDocumentation Agent interfaces for orchestrator communication.
 *
 * Clean, dependency-light interfaces the Orchestrator uses to communicate with
 * specialized agents. Each agent has a distinct purpose and should only be used
 * for its specific function.
 *
 * @remarks
 * These are type-only contracts to preserve agent isolation: the Orchestrator
 * coordinates and returns typed data; agents implement these interfaces; the
 * CommunicationAgent owns all user-facing formatting.
 */

// Import centralized types to ensure consistency
import { CategoryId, CategoryRecord } from "@internal-types/agentConfig";

// Generic types that work with any data structure, not hard-coded categories

/**
 * ======================================
 *
 */
export interface DataSource {
  id: CategoryId;
  name: string;
  records: CategoryRecord[];
  schema?: unknown;
}

/**
 * Represents the result of a database query operation.
 *
 */
export interface QueryResult {
  categoryId: CategoryId;
  records: CategoryRecord[];
  totalCount: number;
  cached: boolean;
}

/**
 * Interface for database agents that handle data retrieval operations.
 *
 * @example
 * ```ts
 * // Orchestrator calling a DatabaseAgent
 * const records = await db.executeQuery("people", { department: "engineering" }, { useCache: true });
 * ```
 */
export interface DatabaseAgentInterface {
  executeQuery(
    categoryId: CategoryId,
    criteria: Record<string, unknown>,
    options?: { useCache?: boolean; cacheKeyPrefix?: string }
  ): Promise<CategoryRecord[]>;
}

/**
 * ======================================
 *
 */
export interface AnalysisInput {
  categoryId: CategoryId;
  records: CategoryRecord[];
  schemas?: CategorySchema[];
  relationships?: RelationshipDescription[];
}

/**
 * DataInsight interface.
 *
 */
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

/**
 * ExplorationPlan interface.
 *
 */
export interface ExplorationPlan {
  topic: string;
  question: string;
  steps: ExplorationStep[];
  recommendedQueries: string[];
  supportingResources: Array<{
    categoryId: CategoryId;
    ids: string[];
  }>;
}

/**
 * ExplorationStep interface.
 *
 */
export interface ExplorationStep {
  title: string;
  description: string;
  recommendedCategory: CategoryId;
  hints: string[];
}

/**
 * CrossCategoryConnection interface.
 *
 */
export interface CrossCategoryConnection {
  sourceCategory: CategoryId;
  targetCategory: CategoryId;
  connectionType: string;
  strength: number;
  description: string;
}

/**
 * Interface for data analysis agents.
 *
 * @example
 * ```ts
 * const insights = await dataAgent.analyzeData({ categoryId: "people", records });
 * ```
 */
export interface DataAgentInterface {
  analyzeData(input: AnalysisInput): Promise<DataInsight[]>;
  generateExplorationPlan(
    categoryId: CategoryId,
    question: string,
    availableData: AnalysisInput
  ): Promise<ExplorationPlan>;
  analyzeConnection(
    sourceData: AnalysisInput,
    targetData: AnalysisInput,
    relationship: RelationshipDescription
  ): Promise<CrossCategoryConnection>;
  searchData(keyword: string, data: AnalysisInput[]): TopicSearchResult[];
}

/**
 * ======================================
 *
 */
export interface CategorySchema {
  name: string;
  schema: unknown;
}

/**
 * RelationshipDescription interface.
 *
 */
export interface RelationshipDescription {
  name: string;
  description: string;
  targetCategory: CategoryId;
  viaField: string;
}

/**
 * BusinessDataCatalog interface (American English primary form).
 *
 */
export interface BusinessDataCatalog {
  categories: CategoryInfo[];
  relationships: RelationshipDescription[];
  schemas: CategorySchema[];
  lastUpdated: string;
}

/**
 * Deprecated British English alias retained for backwards compatibility.
 *
 * @deprecated Use BusinessDataCatalog instead.
 */
export type BusinessDataCatalogue = BusinessDataCatalog;

/**
 * UserContextCatalog alias (canonical user-facing catalog type).
 *
 */
export type UserContextCatalog = BusinessDataCatalog;

/**
 * Deprecated British English user context catalog alias.
 *
 * @deprecated Use UserContextCatalog instead.
 */
export type UserContextCatalogue = UserContextCatalog;

/**
 * CategoryInfo interface.
 *
 */
export interface CategoryInfo {
  id: CategoryId;
  name: string;
  description: string;
  recordCount: number;
  schemaVersion: string;
  relationships: RelationshipDescription[];
}

/**
 * RelevantDataManagerInterface interface.
 *
 */
export interface RelevantDataManagerInterface {
  /**
   * Primary American English method returning the business data catalog.
   */
  getBusinessDataCatalog(): BusinessDataCatalog;
  /**
   * Deprecated British English variant retained for migration window.
   *
   * @deprecated Use getBusinessDataCatalog instead.
   */
  getBusinessDataCatalogue(): BusinessDataCatalogue;
  getCategoryInfo(categoryId: CategoryId): CategoryInfo;
  getCategorySchema(categoryId: CategoryId): CategorySchema[];
  validateCategoryData(
    categoryId: CategoryId,
    records: CategoryRecord[]
  ): ValidationResult;
  getRelationships(categoryId: CategoryId): RelationshipDescription[];
}

/**
 * UserContextManagerInterface interface (renamed from RelevantDataManagerInterface).
 * Provides forward-compatible method names while delegating to legacy implementations.
 */
export interface UserContextManagerInterface
  extends RelevantDataManagerInterface {
  /**
   * Optional American English method returning the user context catalog.
   */
  getUserContextCatalog?(): UserContextCatalog;
  /**
   * Optional deprecated British English variant.
   *
   * @deprecated Use getUserContextCatalog instead.
   */
  getUserContextCatalogue?(): UserContextCatalogue;
}

/**
 * ======================================
 *
 */
export interface ClarificationInput {
  question: string;
  topic?: string;
  missingSignals?: string[];
  candidateAgents: string[];
}

/**
 * Clarification response from a ClarificationAgent.
 */
export interface ClarificationResponse {
  prompt: string;
  knowledgeSnippets: KnowledgeSnippet[];
}

/**
 * KnowledgeSnippet interface.
 *
 */
export interface KnowledgeSnippet {
  source: string;
  summary: string;
}

/**
 * Interface for agents that generate clarification prompts.
 */
export interface ClarificationAgentInterface {
  clarify(input: ClarificationInput): Promise<ClarificationResponse>;
}

/**
 * ======================================
 *
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}

/**
 * TopicSearchResult interface.
 *
 */
export interface TopicSearchResult {
  categoryId: CategoryId;
  recordId: string;
  displayName: string;
  matchingFields: string[];
}

/**
 * ======================================
 *
 */
export interface AgentRequest {
  agentType: "database" | "data" | "relevantDataManager" | "clarification";
  operation: string;
  parameters: unknown;
}

/**
 * Generic agent response shape used by orchestration helpers.
 *
 * @typeParam T - Response payload type.
 */
export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  agentType: string;
  operation: string;
}

/**
 * Orchestrator workflow for handling user requests.
 */
export interface OrchestrationWorkflow {
  userQuery: string;
  classifiedIntent: string;
  requiredAgents: string[];
  agentRequests: AgentRequest[];
  agentResponses: AgentResponse[];
  finalResponse: string;
}
