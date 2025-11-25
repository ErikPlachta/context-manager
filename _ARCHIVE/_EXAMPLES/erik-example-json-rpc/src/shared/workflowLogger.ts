/**
 * @packageDocumentation
 * Workflow logging utility for structured logging throughout workflow lifecycle
 *
 * Provides consistent logging interface for workflow execution, state transitions,
 * action lifecycle events, and performance tracking.
 *
 * Reference: ORCHESTRATOR_WORKFLOW_ANALYSIS.md - Logging Infrastructure section
 *
 * @module shared/workflowLogger
 */

import type {
  WorkflowState,
  WorkflowAction,
} from "@internal-types/workflow.types";

/**
 * Workflow logger for structured logging
 *
 * All log messages include workflowId for request tracing
 *
 * Usage:
 * ```typescript
 * const logger = new WorkflowLogger();
 * logger.logWorkflowStart(workflowId, input);
 * logger.logClassification(workflowId, classification);
 * logger.logWorkflowComplete(workflowId, result);
 * ```
 */
export class WorkflowLogger {
  /**
   * Log workflow start
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {unknown} input - User input that initiated the workflow
   */
  public logWorkflowStart(workflowId: string, input: unknown): void {
    console.log(`[Workflow:${workflowId}] START`, input);
  }

  /**
   * Log classification result
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {unknown} classification - Intent classification result
   */
  public logClassification(workflowId: string, classification: unknown): void {
    console.log(`[Workflow:${workflowId}] CLASSIFY`, classification);
  }

  /**
   * Log action planning
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {WorkflowAction} action - Planned workflow action
   */
  public logActionPlanned(workflowId: string, action: WorkflowAction): void {
    console.log(
      `[Workflow:${workflowId}] PLAN`,
      `${action.type}:${action.agent || "none"}.${action.method || "none"}`
    );
  }

  /**
   * Log action start
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {WorkflowAction} action - Action being started
   */
  public logActionStart(workflowId: string, action: WorkflowAction): void {
    console.log(
      `[Workflow:${workflowId}] ACTION_START`,
      `${action.id} (${action.agent}.${action.method})`
    );
  }

  /**
   * Log action completion
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {WorkflowAction} action - Completed action
   */
  public logActionComplete(workflowId: string, action: WorkflowAction): void {
    console.log(
      `[Workflow:${workflowId}] ACTION_COMPLETE`,
      `${action.id} (${action.duration}ms)`
    );
  }

  /**
   * Log action failure
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {WorkflowAction} action - Failed action
   * @param {Error} error - Error that caused failure
   */
  public logActionFailed(
    workflowId: string,
    action: WorkflowAction,
    error: Error
  ): void {
    console.error(
      `[Workflow:${workflowId}] ACTION_FAILED`,
      `${action.id}:`,
      error.message
    );
  }

  /**
   * Log state transition
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {WorkflowState} fromState - Previous state
   * @param {WorkflowState} toState - New state
   */
  public logStateTransition(
    workflowId: string,
    fromState: WorkflowState,
    toState: WorkflowState
  ): void {
    console.log(
      `[Workflow:${workflowId}] STATE_TRANSITION`,
      `${fromState} → ${toState}`
    );
  }

  /**
   * Log workflow completion
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {unknown} result - Final workflow result
   */
  public logWorkflowComplete(workflowId: string, result: unknown): void {
    console.log(`[Workflow:${workflowId}] COMPLETE`, result);
  }

  /**
   * Log workflow failure
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {Error} error - Error that caused failure
   */
  public logWorkflowFailed(workflowId: string, error: Error): void {
    console.error(`[Workflow:${workflowId}] FAILED`, error.message, error);
  }

  /**
   * Log general information
   *
   * @param {string} workflowId - Unique workflow identifier
   * @param {string} message - Information message
   * @param {unknown} [data] - Optional additional data
   */
  public logInfo(workflowId: string, message: string, data?: unknown): void {
    console.log(`[Workflow:${workflowId}] INFO`, message, data || "");
  }
}
