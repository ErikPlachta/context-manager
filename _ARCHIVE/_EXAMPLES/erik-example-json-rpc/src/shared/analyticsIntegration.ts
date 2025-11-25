/**
 * @packageDocumentation Integration utilities for adding analytics tracking to existing agents.
 */

import {
  getAnalytics,
  type AgentUsageAnalytics,
  type AgentUsageStats,
} from "@shared/agentAnalytics";
import { loadApplicationConfig } from "@shared/configurationLoader";
import { createStandardReport } from "@shared/analyticsDashboard";

/**
 * Decorator function for automatic analytics tracking on agent methods.
 *
 * @param {string} agentName - agentName parameter.
 * @param {string} methodName - methodName parameter.
 * @returns {unknown} - TODO: describe return value.
 */
export function trackAgentExecution(agentName: string, methodName?: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const originalMethod = descriptor.value as T;
    const actualMethodName = methodName || propertyKey;
    /**
     * Wrapped method with analytics tracking.
     *
     * @param {unknown[]} args - Original method arguments.
     * @returns {Promise<unknown>} Result of the original method.
     */
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const analytics = getAnalytics();

      return analytics.trackExecution(
        agentName,
        actualMethodName,
        () => originalMethod.apply(this, args),
        {
          metadata: {
            className:
              typeof target === "object" &&
              target !== null &&
              "constructor" in target
                ? (target as { constructor?: { name?: string } }).constructor
                    ?.name ?? "Unknown"
                : "Unknown",
            argumentCount: args.length,
          },
        }
      );
    };
  };
}

/**
 * Base class with built-in analytics tracking for agent implementations.
 */
export abstract class TrackedAgent {
  private analytics: AgentUsageAnalytics;
  protected agentName: string;

  /**
   * Creates a new tracked agent instance.
   *
   * @param {string} agentName - agentName parameter.
   * @returns {unknown} - TODO: describe return value.
   */
  constructor(agentName: string) {
    this.agentName = agentName;
    this.analytics = getAnalytics();
  }

  /**
   * Execute an operation while recording analytics execution metadata.
   *
   * @template T
   * @param {string} operationName - Logical operation identifier.
   * @param {() => Promise<T>} operation - Function returning the operation result.
   * @param {{ userId?: string; metadata?: Record<string, unknown>; }} options - Optional tracking context.
   * @param {string} [options.userId] - End user identifier if available.
   * @param {Record<string, unknown>} [options.metadata] - Supplemental structured metadata.
   * @returns {Promise<T>} Fulfilled with the underlying operation result.
   */
  protected async executeTracked<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      userId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    return this.analytics.trackExecution(
      this.agentName,
      operationName,
      operation,
      options
    );
  }

  /**
   * Record a custom analytics event with arbitrary metadata.
   *
   * @param {string} method - Logical method or action name.
   * @param {Record<string, unknown>} eventData - Additional metadata fields.
   * @returns {void} Nothing returned.
   */
  protected recordEvent(
    method: string,
    eventData: Record<string, unknown> = {}
  ): void {
    this.analytics.recordEvent({
      agentName: this.agentName,
      method,
      ...eventData,
    });
  }

  /**
   * Get usage statistics for this tracked agent.
   *
   * @param {Date} [since] - Optional starting point for stats window.
   * @returns {AgentUsageStats | null} Aggregated usage statistics or null if none recorded.
   */
  getStats(since?: Date): AgentUsageStats | null {
    return this.analytics.getAgentStats(this.agentName, since);
  }
}

/**
 * Analytics middleware for MCP method invocations.
 *
 * @template T
 *
 * @param {string} agentName - agentName parameter.
 * @param {string} methodName - methodName parameter.
 * @param {T} handler - handler parameter.
 * @returns {T} - TODO: describe return value.
 */
export function withAnalytics<
  T extends (...args: unknown[]) => Promise<unknown>
>(agentName: string, methodName: string, handler: T): T {
  const analytics = getAnalytics();

  return (async (...args: unknown[]) => {
    return analytics.trackExecution(
      agentName,
      methodName,
      () => handler(...args),
      {
        metadata: {
          argumentTypes: args.map((arg) => typeof arg),
          timestamp: new Date().toISOString(),
        },
      }
    );
  }) as T;
}

/**
 * Performance monitoring utility for critical operations.
 */
export class PerformanceMonitor {
  private analytics: AgentUsageAnalytics;

  /**
   * Creates a new performance monitor instance.
   *
   * @returns {unknown} - TODO: describe return value.
   */
  constructor() {
    this.analytics = getAnalytics();
  }

  /**
   * Monitor a database query operation and record performance metadata.
   *
   * @template T
   * @param {string} queryType - Logical query classification (e.g. 'findRecords').
   * @param {() => Promise<T>} query - Async function performing the query.
   * @param {{ category?: string; filters?: Record<string, unknown>; }} options - Optional query context.
   * @param {string} [options.category] - Target category identifier.
   * @param {Record<string, unknown>} [options.filters] - Applied filter map.
   * @returns {Promise<T>} Result returned by the query function.
   */
  async monitorDatabaseQuery<T>(
    queryType: string,
    query: () => Promise<T>,
    options: {
      category?: string;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    return this.analytics.trackExecution("DatabaseAgent", queryType, query, {
      metadata: {
        queryType,
        category: options.category,
        filterCount: options.filters ? Object.keys(options.filters).length : 0,
        performanceMarker: "database-query",
      },
    });
  }

  /**
   * Monitor a data processing operation and record performance metadata.
   *
   * @template T
   * @param {string} operationType - Semantic operation type (e.g. 'aggregate').
   * @param {() => Promise<T>} processor - Async processing function.
   * @param {{ inputSize?: number; category?: string; }} options - Optional processing context.
   * @param {number} [options.inputSize] - Number of items processed.
   * @param {string} [options.category] - Category identifier involved.
   * @returns {Promise<T>} Result of the processing function.
   */
  async monitorDataProcessing<T>(
    operationType: string,
    processor: () => Promise<T>,
    options: {
      inputSize?: number;
      category?: string;
    } = {}
  ): Promise<T> {
    return this.analytics.trackExecution(
      "DataAgent",
      operationType,
      processor,
      {
        metadata: {
          operationType,
          inputSize: options.inputSize,
          category: options.category,
          performanceMarker: "data-processing",
        },
      }
    );
  }

  /**
   * Monitor an orchestration decision and record routing metadata.
   *
   * @template T
   * @param {string} decision - Decision identifier (e.g. 'routeIntent').
   * @param {() => Promise<T>} orchestration - Async function performing orchestration.
   * @param {{ intent?: string; agentCount?: number; }} options - Optional orchestration context.
   * @param {string} [options.intent] - Classified intent name.
   * @param {number} [options.agentCount] - Number of candidate agents considered.
   * @returns {Promise<T>} Result returned by the orchestration function.
   */
  async monitorOrchestration<T>(
    decision: string,
    orchestration: () => Promise<T>,
    options: {
      intent?: string;
      agentCount?: number;
    } = {}
  ): Promise<T> {
    return this.analytics.trackExecution(
      "Orchestrator",
      decision,
      orchestration,
      {
        metadata: {
          decision,
          intent: options.intent,
          agentCount: options.agentCount,
          performanceMarker: "orchestration",
        },
      }
    );
  }
}

/**
 * Initializes analytics for the application based on configuration.
 *
 * @returns {Promise<AgentUsageAnalytics>} - TODO: describe return value.
 */
export async function initializeAnalytics(): Promise<AgentUsageAnalytics> {
  try {
    const config = await loadApplicationConfig();

    const analyticsConfig = {
      enabled: config.agents?.global?.enableTelemetry ?? true,
      sampleRate: config.performance?.monitoring?.sampleRate ?? 1.0,
      maxEvents: 10000,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      batchSize: 100,
      persistentStorage: false,
    };

    return getAnalytics(analyticsConfig);
  } catch (error) {
    // Fallback to default analytics if config loading fails
    console.warn(
      "Failed to load analytics configuration, using defaults:",
      error
    );
    return getAnalytics();
  }
}

/**
 * Creates a scheduled analytics report generator.
 *
 * @param {number} intervalMs - intervalMs parameter.
 * @param {string} outputPath - outputPath parameter.
 * @returns {NodeJS.Timeout} - TODO: describe return value.
 */
export function scheduleAnalyticsReports(
  intervalMs: number = 24 * 60 * 60 * 1000, // Daily by default
  outputPath: string = "logs/analytics-report.md"
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const analytics = getAnalytics();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - intervalMs);

      const summary = analytics.generateSummary(startDate);
      const report = createStandardReport(summary, startDate, endDate);

      // Write report to file (placeholder implementation)
      console.log("Analytics report generated:", {
        period: { start: startDate, end: endDate },
        totalEvents: summary.totalEvents,
        outputPath,
        reportPreview:
          report.slice(0, 120) + (report.length > 120 ? "..." : ""),
      });

      // In a real implementation, you would write to file system here
      // await fs.promises.writeFile(outputPath, report, 'utf-8');
    } catch (error) {
      console.error("Failed to generate analytics report:", error);
    }
  }, intervalMs);
}

/**
 * Global performance monitor instance.
 */
export const performanceMonitor = new PerformanceMonitor();
