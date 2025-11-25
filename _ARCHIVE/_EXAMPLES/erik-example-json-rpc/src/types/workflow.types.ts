/**
 * @packageDocumentation
 * Workflow coordination types for Orchestrator.
 *
 * Defines types for workflow state management, action execution,
 * diagnostics, and performance monitoring.
 *
 * @remarks
 * These types model orchestration without importing agent implementations.
 * They are safe to use in tests and diagnostics and are decoupled from
 * presentation formatting handled by the CommunicationAgent.
 *
 * @see ORCHESTRATOR_WORKFLOW_ANALYSIS.md
 */

/**
 * Workflow state during lifecycle
 *
 * State transitions:
 * - pending → classifying
 * - classifying → executing | needs-clarification
 * - executing → processing | failed
 * - processing → completed | failed
 * - needs-clarification → (waiting for user)
 *
 * Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md - State Machine section
 */
export type WorkflowState =
  | "pending"
  | "classifying"
  | "executing"
  | "processing"
  | "needs-clarification"
  | "completed"
  | "failed";

/**
 * Workflow action type
 *
 * Determines how the action is processed
 */
export type WorkflowActionType =
  | "classify"
  | "execute-agent"
  | "format"
  | "clarify";

/**
 * Workflow action status
 *
 * Tracks execution state of individual actions
 */
export type WorkflowActionStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "failed";

/**
 * Workflow action definition.
 *
 * Represents a single step in the workflow execution plan.
 *
 * @typeParam T - Result type for the action.
 *
 * @example
 * ```ts
 * const classify: WorkflowAction = {
 *   id: "a1",
 *   type: "classify",
 *   status: "pending"
 * };
 * ```
 */
export interface WorkflowAction<T = unknown> {
  /** Unique action identifier */
  id: string;

  /** Type of action to perform */
  type: WorkflowActionType;

  /** Agent identifier if type is 'execute-agent' */
  agent?: string;

  /** Method name to call on the agent */
  method?: string;

  /** Parameters to pass to the method */
  params?: unknown;

  /** Action IDs this action depends on (must complete first) */
  dependencies?: string[];

  /** Current execution status */
  status: WorkflowActionStatus;

  /** Result data if completed successfully */
  result?: T;

  /** Error if failed */
  error?: Error;

  /** Timestamp when action started */
  startTime?: number;

  /** Timestamp when action completed */
  endTime?: number;

  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Workflow execution context.
 *
 * Maintains state throughout the workflow lifecycle.
 */
export interface WorkflowContext {
  /** Unique workflow identifier */
  workflowId: string;

  /** Current workflow state */
  state: WorkflowState;

  /** Original user input */
  input: {
    question: string;
    topic?: string;
    [key: string]: unknown;
  };

  /** Classification result (if completed) */
  classification?: {
    intent: string;
    agent: string;
    confidence?: number;
    [key: string]: unknown;
  };

  /** Action currently being executed */
  currentAction: WorkflowAction | null;

  /** Actions that have been completed */
  completedActions: WorkflowAction[];

  /** Actions waiting to be executed */
  pendingActions: WorkflowAction[];

  /** Results map keyed by action ID */
  results: Map<string, unknown>;

  /** Errors encountered during execution */
  errors: Error[];

  /** Performance metrics */
  metrics?: PerformanceMetrics;

  /** Workflow start timestamp */
  startTime: number;

  /** Workflow end timestamp (when completed or failed) */
  endTime?: number;
}

/**
 * Performance metrics for workflow execution.
 *
 * Tracks timing for each phase and action.
 *
 * @see ORCHESTRATOR_WORKFLOW_ANALYSIS.md (Performance Monitoring)
 */
export interface PerformanceMetrics {
  /** Unique workflow identifier */
  workflowId: string;

  /** Total workflow duration in milliseconds */
  totalDuration: number;

  /** Time spent classifying intent */
  classificationDuration: number;

  /** Time spent planning actions */
  planningDuration: number;

  /** Time spent executing actions */
  executionDuration: number;

  /** Time spent formatting response */
  formattingDuration: number;

  /** Per-action timing details */
  actionMetrics: Array<{
    /** Action identifier */
    actionId: string;

    /** Agent that executed the action */
    agent: string;

    /** Method that was called */
    method: string;

    /** Execution duration in milliseconds */
    duration: number;

    /** Number of records processed (if applicable) */
    recordCount?: number;

    /** Timestamp when action started */
    timestamp: number;
  }>;

  /** Workflow start timestamp */
  startTime: number;

  /** Workflow end timestamp */
  endTime: number;
}

/**
 * Workflow diagnostic snapshot.
 *
 * Used for debugging and monitoring active workflows.
 *
 * @see ORCHESTRATOR_WORKFLOW_ANALYSIS.md (Diagnostics)
 */
export interface WorkflowDiagnostics {
  /** Unique workflow identifier */
  workflowId: string;

  /** Current workflow state */
  state: WorkflowState;

  /** Original user input */
  input: {
    question: string;
    topic?: string;
    [key: string]: unknown;
  };

  /** Classification result (if completed) */
  classification?: {
    intent: string;
    agent: string;
    confidence?: number;
    [key: string]: unknown;
  };

  /** Total number of planned actions */
  totalActions: number;

  /** Number of completed actions */
  completedActions: number;

  /** Number of failed actions */
  failedActions: number;

  /** Action currently being executed */
  currentAction: WorkflowAction | null;

  /** Actions waiting to be executed */
  pendingActions: WorkflowAction[];

  /** Errors encountered */
  errors: Error[];

  /** Workflow start timestamp */
  startTime: number;

  /** Time elapsed since start in milliseconds */
  elapsedTime: number;

  /** Estimated remaining time in milliseconds (if calculable) */
  estimatedRemainingTime?: number;
}

/**
 * Workflow history record.
 *
 * Stored for replay and debugging failed workflows.
 *
 * @see ORCHESTRATOR_WORKFLOW_ANALYSIS.md (Workflow History)
 */
export interface WorkflowHistory {
  /** Unique workflow identifier */
  workflowId: string;

  /** Original user input */
  input: {
    question: string;
    topic?: string;
    [key: string]: unknown;
  };

  /** Final workflow result */
  result: {
    state: WorkflowState;
    data?: unknown;
    error?: Error;
    formatted?: {
      message: string;
      markdown?: string;
    };
  };

  /** Total duration in milliseconds */
  duration: number;

  /** Completion timestamp */
  timestamp: number;

  /** Event log for replay */
  events: Array<{
    /** Event type */
    type: "state-change" | "action-start" | "action-complete" | "action-failed";

    /** Event timestamp */
    timestamp: number;

    /** Event-specific data */
    data: unknown;
  }>;
}

/**
 * Agent registry mapping agent IDs to instances
 *
 * Maps agent identifiers to their instantiated classes.
 * The actual agent classes are imported by the Orchestrator.
 *
 * Agent IDs:
 * - "database-agent": DatabaseAgent instance
 * - "data-agent": DataAgent instance
 * - "user-context-agent": UserContextAgent instance
 *
 * Note: Using 'unknown' to avoid circular dependencies.
 * The Orchestrator imports and properly types the actual agent classes.
 *
 * Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md - Agent Coordination section
 */
export interface AgentRegistry {
  "database-agent": unknown;
  "data-agent": unknown;
  "user-context-agent": unknown;
}

/**
 * Workflow result returned to the caller.
 *
 * Contains final state and formatted response.
 */
export interface WorkflowResult {
  /** Final workflow state */
  state: WorkflowState;

  /** Result data (if completed) */
  data?: unknown;

  /** Error (if failed) */
  error?: Error;

  /** Formatted response for user display */
  formatted?: {
    message: string;
    markdown?: string;
  };

  /** Performance metrics */
  metrics?: PerformanceMetrics;

  /** Workflow identifier for diagnostics */
  workflowId: string;
}

// ============================================================================
// Agent Method Parameter Types
// ============================================================================

/**
 * Parameters for UserContextAgent.getOrCreateSnapshot()
 *
 * If topicOrId is undefined, agent will use first available category (data-driven)
 */
export interface GetSnapshotParams {
  /** Optional category identifier. If undefined, uses first available category */
  topicOrId?: string;
}

/**
 * Parameters for DatabaseAgent.executeQuery()
 *
 * All fields optional to support data-driven querying
 */
export interface QueryParams {
  /** Category to query. If undefined, agent determines from context */
  category?: string;

  /** Filters to apply. Structure depends on category schema */
  filters?: Record<string, unknown>;

  /** Maximum number of results. Defaults to agent-specific limit */
  limit?: number;

  /** Fields to return. If undefined, returns all fields */
  fields?: string[];

  /** Sort order. Format: { field: 'asc' | 'desc' } */
  sort?: Record<string, "asc" | "desc">;
}

/**
 * Parameters for DataAgent.analyzeData()
 *
 * Accepts data from previous action or explicit dataset
 */
export interface AnalyzeParams {
  /** Data to analyze. Can come from dependency resolution */
  data?: unknown[];

  /** Type of analysis to perform */
  analysisType?: "summary" | "correlation" | "trend" | "distribution";

  /** Fields to analyze. If undefined, analyzes all numeric/categorical fields */
  fields?: string[];
}
