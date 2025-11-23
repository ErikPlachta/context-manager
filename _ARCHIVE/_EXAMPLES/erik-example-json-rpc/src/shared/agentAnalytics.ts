/**
 * @packageDocumentation Agent usage analytics system for tracking invocations and performance metrics.
 */

/**
 * Agent execution status enumeration.
 */
export enum AgentExecutionStatus {
  SUCCESS = "success",
  ERROR = "error",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
}

/**
 * Agent usage event data structure.
 *
 */
export interface AgentUsageEvent {
  /** Unique identifier for the event. */
  id: string;
  /** Timestamp when the event occurred. */
  timestamp: Date;
  /** Name of the agent that was invoked. */
  agentName: string;
  /** Method or operation that was called. */
  method: string;
  /** Execution status of the agent call. */
  status: AgentExecutionStatus;
  /** Duration of execution in milliseconds. */
  executionTime: number;
  /** Input parameters passed to the agent. */
  inputSize: number;
  /** Output data size in bytes. */
  outputSize: number;
  /** Error message if execution failed. */
  errorMessage?: string;
  /** User or session identifier. */
  userId?: string;
  /** Additional context metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated usage statistics for an agent.
 *
 */
export interface AgentUsageStats {
  /** Agent name. */
  agentName: string;
  /** Total number of invocations. */
  totalInvocations: number;
  /** Number of successful invocations. */
  successfulInvocations: number;
  /** Number of failed invocations. */
  failedInvocations: number;
  /** Average execution time in milliseconds. */
  averageExecutionTime: number;
  /** Minimum execution time in milliseconds. */
  minExecutionTime: number;
  /** Maximum execution time in milliseconds. */
  maxExecutionTime: number;
  /** Total execution time in milliseconds. */
  totalExecutionTime: number;
  /** Success rate as a percentage. */
  successRate: number;
  /** Most recent invocation timestamp. */
  lastInvocation: Date;
  /** Most frequently called method. */
  mostUsedMethod: string;
}

/**
 * Usage analytics summary across all agents.
 *
 */
export interface UsageAnalyticsSummary {
  /** Summary generation timestamp. */
  timestamp: Date;
  /** Total events processed. */
  totalEvents: number;
  /** Time period covered by the summary. */
  periodStart: Date;
  /** End of time period covered. */
  periodEnd: Date;
  /** Per-agent statistics. */
  agentStats: AgentUsageStats[];
  /** Overall success rate across all agents. */
  overallSuccessRate: number;
  /** Average response time across all agents. */
  averageResponseTime: number;
  /** Most frequently used agent. */
  mostUsedAgent: string;
  /** Agent with highest error rate. */
  highestErrorRateAgent: string;
}

/**
 * Configuration for analytics collection.
 *
 */
export interface AnalyticsConfig {
  /** Enable analytics collection. */
  enabled: boolean;
  /** Sample rate for event collection (0-1). */
  sampleRate: number;
  /** Maximum number of events to store. */
  maxEvents: number;
  /** Retention period in milliseconds. */
  retentionPeriod: number;
  /** Batch size for event processing. */
  batchSize: number;
  /** Enable persistent storage. */
  persistentStorage: boolean;
  /** Storage file path for persistent storage. */
  storageFile?: string;
}

/** Options for recording additional execution context. */
export interface AnalyticsExecutionOptions {
  /** Optional user/session identifier. */
  userId?: string;
  /** Arbitrary context for analytics enrichment. */
  metadata?: Record<string, unknown>;
}

/**
 * Agent usage analytics collector and processor.
 */
export class AgentUsageAnalytics {
  private events: AgentUsageEvent[] = [];
  private config: AnalyticsConfig;
  private eventCounter = 0;

  /**
   * Creates a new analytics collector instance.
   *
   * @param {AnalyticsConfig} config - config parameter.
   * @returns {unknown} - TODO: describe return value.
   */
  constructor(config: AnalyticsConfig) {
    this.config = config;
  }

  /**
   * Records an agent usage event.
   *
   * @param {Partial<AgentUsageEvent>} event - event parameter.
   */
  recordEvent(event: Partial<AgentUsageEvent>): void {
    if (!this.config.enabled) {
      return;
    }

    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    const completeEvent: AgentUsageEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      agentName: event.agentName || "unknown",
      method: event.method || "unknown",
      status: event.status || AgentExecutionStatus.SUCCESS,
      executionTime: event.executionTime || 0,
      inputSize: event.inputSize || 0,
      outputSize: event.outputSize || 0,
      errorMessage: event.errorMessage,
      userId: event.userId,
      metadata: event.metadata || {},
    };

    this.events.push(completeEvent);
    this.enforceRetention();

    if (this.config.persistentStorage) {
      this.persistEvent(completeEvent);
    }
  }

  /**
   * Tracks the execution of an agent method with automatic timing.
   *
   * @template T
   * @param {string} agentName - Name of the agent being executed.
   * @param {string} method - Logical operation name.
   * @param {() => Promise<T>} execution - Async function to execute and measure.
   * @param {AnalyticsExecutionOptions} [options] - Optional user and context metadata to record.
   * @returns {Promise<T>} Resolves with the result of the execution.
   * @throws {Error} Propagates any error thrown by the execution.
   */
  async trackExecution<T>(
    agentName: string,
    method: string,
    execution: () => Promise<T>,
    options: AnalyticsExecutionOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const eventData: Partial<AgentUsageEvent> = {
      agentName,
      method,
      userId: options.userId,
      metadata: options.metadata,
    };

    try {
      const result = await execution();
      const executionTime = Date.now() - startTime;

      this.recordEvent({
        ...eventData,
        status: AgentExecutionStatus.SUCCESS,
        executionTime,
        outputSize: this.estimateSize(result),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.recordEvent({
        ...eventData,
        status: AgentExecutionStatus.ERROR,
        executionTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Generates usage statistics for a specific agent.
   *
   * @param {string} agentName - agentName parameter.
   * @param {Date} since - since parameter.
   * @returns {AgentUsageStats | null} - TODO: describe return value.
   */
  getAgentStats(agentName: string, since?: Date): AgentUsageStats | null {
    const agentEvents = this.events.filter((event) => {
      if (event.agentName !== agentName) return false;
      if (since && event.timestamp < since) return false;
      return true;
    });

    if (agentEvents.length === 0) {
      return null;
    }

    const successfulEvents = agentEvents.filter(
      (e) => e.status === AgentExecutionStatus.SUCCESS
    );
    const failedEvents = agentEvents.filter(
      (e) => e.status !== AgentExecutionStatus.SUCCESS
    );

    const executionTimes = agentEvents.map((e) => e.executionTime);
    const totalExecutionTime = executionTimes.reduce(
      (sum, time) => sum + time,
      0
    );

    // Find most used method
    const methodCounts: Record<string, number> = agentEvents.reduce(
      (counts: Record<string, number>, event) => {
        counts[event.method] = (counts[event.method] || 0) + 1;
        return counts;
      },
      {}
    );

    const mostUsedMethod =
      Object.entries(methodCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "unknown";

    return {
      agentName,
      totalInvocations: agentEvents.length,
      successfulInvocations: successfulEvents.length,
      failedInvocations: failedEvents.length,
      averageExecutionTime: totalExecutionTime / agentEvents.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      totalExecutionTime,
      successRate: (successfulEvents.length / agentEvents.length) * 100,
      lastInvocation: new Date(
        Math.max(...agentEvents.map((e) => e.timestamp.getTime()))
      ),
      mostUsedMethod,
    };
  }

  /**
   * Generates comprehensive usage analytics summary.
   *
   * @param {Date} since - since parameter.
   * @returns {UsageAnalyticsSummary} - TODO: describe return value.
   */
  generateSummary(since?: Date): UsageAnalyticsSummary {
    const filteredEvents = this.events.filter(
      (event) => !since || event.timestamp >= since
    );

    if (filteredEvents.length === 0) {
      return {
        timestamp: new Date(),
        totalEvents: 0,
        periodStart: since || new Date(),
        periodEnd: new Date(),
        agentStats: [],
        overallSuccessRate: 0,
        averageResponseTime: 0,
        mostUsedAgent: "none",
        highestErrorRateAgent: "none",
      };
    }

    // Get unique agent names
    const agentNames = [...new Set(filteredEvents.map((e) => e.agentName))];
    const agentStats = agentNames
      .map((name) => this.getAgentStats(name, since))
      .filter((stats): stats is AgentUsageStats => stats !== null);

    // Calculate overall metrics
    const successfulEvents = filteredEvents.filter(
      (e) => e.status === AgentExecutionStatus.SUCCESS
    );
    const overallSuccessRate =
      (successfulEvents.length / filteredEvents.length) * 100;
    const averageResponseTime =
      filteredEvents.reduce((sum, e) => sum + e.executionTime, 0) /
      filteredEvents.length;

    // Find most used agent
    const agentCounts: Record<string, number> = filteredEvents.reduce(
      (counts: Record<string, number>, event) => {
        counts[event.agentName] = (counts[event.agentName] || 0) + 1;
        return counts;
      },
      {}
    );

    const mostUsedAgent =
      Object.entries(agentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "none";

    // Find agent with highest error rate
    const highestErrorRateAgent =
      agentStats.sort((a, b) => a.successRate - b.successRate)[0]?.agentName ||
      "none";

    const timestamps = filteredEvents.map((e) => e.timestamp.getTime());

    return {
      timestamp: new Date(),
      totalEvents: filteredEvents.length,
      periodStart: new Date(Math.min(...timestamps)),
      periodEnd: new Date(Math.max(...timestamps)),
      agentStats,
      overallSuccessRate,
      averageResponseTime,
      mostUsedAgent,
      highestErrorRateAgent,
    };
  }

  /**
   * Exports analytics data for external analysis.
   *
   * @param {Date} since - since parameter.
   * @returns {AgentUsageEvent[]} - TODO: describe return value.
   */
  exportData(since?: Date): AgentUsageEvent[] {
    return this.events.filter((event) => !since || event.timestamp >= since);
  }

  /**
   * Clears all collected analytics data.
   *
   */
  clearData(): void {
    this.events = [];
    this.eventCounter = 0;
  }

  /**
   * Generates a unique event identifier.
   *
   * @returns {string} - TODO: describe return value.
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${++this.eventCounter}`;
  }

  /**
   * Enforces retention policy by removing old events.
   *
   */
  private enforceRetention(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.retentionPeriod;

    // Remove events older than retention period
    this.events = this.events.filter(
      (event) => event.timestamp.getTime() > cutoffTime
    );

    // Enforce maximum event count
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }
  }

  /**
   * Persists an event to storage (placeholder implementation).
   *
   * @param {AgentUsageEvent} event - event parameter.
   */
  private persistEvent(event: AgentUsageEvent): void {
    // Placeholder for persistent storage implementation
    // Could write to file, database, or external analytics service
    console.log("Persisting event:", event.id);
  }

  /**
   * Estimates the size of data in bytes.
   *
   * @param {unknown} data - Value to estimate serialized size for.
   * @returns {number} Approximate byte length of the JSON-serialized value.
   */
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate for UTF-16
    } catch {
      return 0;
    }
  }
}

/**
 * Default analytics configuration.
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0,
  maxEvents: 10000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  batchSize: 100,
  persistentStorage: false,
};

/**
 * Global analytics instance.
 */
let globalAnalytics: AgentUsageAnalytics | null = null;

/**
 * Gets the global analytics instance.
 *
 * @param {AnalyticsConfig} config - config parameter.
 * @returns {AgentUsageAnalytics} - TODO: describe return value.
 */
export function getAnalytics(
  config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG
): AgentUsageAnalytics {
  if (!globalAnalytics) {
    globalAnalytics = new AgentUsageAnalytics(config);
  }
  return globalAnalytics;
}
