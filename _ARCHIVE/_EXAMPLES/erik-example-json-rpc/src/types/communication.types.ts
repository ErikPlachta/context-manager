/**
 * @packageDocumentation Communication type definitions
 *
 * Type definitions for agent communication, response formatting, and error handling.
 * These types are used by CommunicationAgent and Orchestrator for consistent response formatting.
 */

/**
 * Response type enumeration for categorizing agent responses.
 *
 * @remarks
 * Used to drive formatting and UX decisions in the CommunicationAgent.
 */
export type ResponseType =
  | "success"
  | "error"
  | "progress"
  | "validation"
  | "info";

/**
 * Severity levels for error and warning messages.
 */
export type SeverityLevel = "low" | "medium" | "high" | "critical";

/**
 * Structured response from an agent before formatting.
 *
 * @remarks
 * This type is returned by agents and then transformed by the
 * CommunicationAgent into a user-facing {@link FormattedResponse}.
 *
 * @example
 * ```ts
 * const response: AgentResponse<{ items: string[] }> = {
 *   type: "success",
 *   status: "success",
 *   data: { items: ["A", "B"] },
 *   metadata: { agentId: "data-agent", operation: "list" }
 * };
 * ```
 */
export interface AgentResponse<T = unknown> {
  /** Type of response */
  type: ResponseType;

  /** Status of the operation */
  status: "success" | "error" | "in-progress" | "partial";

  /** Main response data */
  data?: T;

  /** Human-readable message (optional, will be generated if not provided) */
  message?: string;

  /** Additional metadata about the response */
  metadata?: {
    /** Agent that generated this response */
    agentId?: string;

    /** Operation that was performed */
    operation?: string;

    /** Timestamp of the response */
    timestamp?: number;

    /** Duration of the operation in milliseconds */
    duration?: number;

    /** Count of items (for data retrieval) */
    count?: number;

    /** Entity type being operated on */
    entityType?: string;

    /** Additional context-specific fields */
    [key: string]: unknown;
  };

  /** Errors that occurred (for error responses) */
  errors?: Array<{
    /** Error code for programmatic handling */
    code?: string;

    /** Human-readable error message */
    message: string;

    /** Field or path where error occurred */
    path?: string;

    /** Severity of the error */
    severity?: SeverityLevel;

    /** Suggested recovery actions */
    suggestions?: string[];
  }>;

  /** Progress information (for in-progress responses) */
  progress?: {
    /** Current progress (0-100) */
    percentage?: number;

    /** Current step in the process */
    currentStep?: string;

    /** Total number of steps */
    totalSteps?: number;

    /** Elapsed time in milliseconds */
    elapsedTime?: number;

    /** Estimated time remaining in milliseconds */
    estimatedTimeRemaining?: number;
  };
}

/**
 * Formatted response ready for display to the user.
 *
 * @remarks
 * Produced by the CommunicationAgent. Carries both the rendered message and
 * optional raw payload for programmatic handling.
 *
 * @example
 * ```ts
 * const view: FormattedResponse = {
 *   message: "### Results\n- A\n- B",
 *   format: "markdown",
 *   isFinal: true
 * };
 * ```
 */
export interface FormattedResponse {
  /** Formatted message text */
  message: string;

  /** Format of the response */
  format: "markdown" | "plaintext" | "html";

  /** Severity level (for errors) */
  severity?: SeverityLevel;

  /** Whether this response is final or will be updated */
  isFinal: boolean;

  /** Original response data (for programmatic access) */
  raw?: AgentResponse;
}
