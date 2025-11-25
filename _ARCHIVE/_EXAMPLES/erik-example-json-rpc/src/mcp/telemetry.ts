/**
 * @packageDocumentation telemetry implementation for mcp module.
 * Captures timing, success/error status, and lightweight metadata for
 * agent and tool invocations to aid debugging and performance analysis.
 *
 * These utilities are lightweight and safe to use in production flows.
 * Use the {@link createInvocationLogger} helper to wrap async operations and
 * automatically emit {@link InvocationEvent | telemetry events}.
 */
/** Invocation event envelope emitted for each wrapped operation. */
export interface InvocationEvent {
  agent: string;
  operation: string;
  status: "success" | "error";
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
  error?: { name: string; message: string };
}

/** Logger abstraction used by {@link createInvocationLogger} to emit events. */
export interface InvocationLogger {
  log(event: InvocationEvent): void;
}

/**
 * Console-based {@link InvocationLogger} implementation.
 */
class ConsoleInvocationLogger implements InvocationLogger {
  /** @inheritDoc */
  log(event: InvocationEvent): void {
    if (process.env.JEST_WORKER_ID) {
      return;
    }
    const label = `[telemetry] ${event.agent}:${event.operation}`;
    if (event.status === "error") {
      console.error(label, { ...event, error: event.error });
    } else {
      console.info(label, event);
    }
  }
}

/** Function signature returned by {@link createInvocationLogger}. */
export interface InvocationWrapper {
  <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T>;
}

/**
 * Create a helper that wraps asynchronous operations and emits telemetry events.
 *
 * @param {string} agent - Identifier of the calling agent/tool.
 * @param {InvocationLogger} logger - Destination for emitted events (defaults to console logger).
 * @returns {InvocationWrapper} Function that wraps async operations and records timing + status.
 * @throws {Error} Propagates any error thrown by the wrapped function after logging it.
 * @see InvocationLogger
 */
export function createInvocationLogger(
  agent: string,
  logger: InvocationLogger = new ConsoleInvocationLogger()
): InvocationWrapper {
  return async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> => {
    const startedAt = Date.now();
    try {
      const result = await fn();
      const finishedAt = Date.now();
      logger.log({
        agent,
        operation,
        status: "success",
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        metadata,
      });
      return result;
    } catch (error) {
      const finishedAt = Date.now();
      const NormalizedError =
        error instanceof Error ? error : new Error(String(error));
      logger.log({
        agent,
        operation,
        status: "error",
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        metadata,
        error: {
          name: NormalizedError.name,
          message: NormalizedError.message,
        },
      });
      throw NormalizedError;
    }
  };
}
