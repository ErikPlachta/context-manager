/**
 * @packageDocumentation
 * Lightweight logging and debug helpers for repo-ops-next.
 */

import process from "node:process";

export interface DebugContext {
  argv: string[];
  positionals: string[];
  flags: Record<string, unknown>;
  derived?: Record<string, unknown>;
}

/** Print a line to stderr. */
export function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(message);
}

/** Print a debug payload when debug mode is enabled. */
export function logDebug(context: DebugContext): void {
  const payload = {
    argv: context.argv,
    positionals: context.positionals,
    flags: context.flags,
    derived: context.derived,
  };

  // eslint-disable-next-line no-console
  console.error("[repo-ops-next debug]", JSON.stringify(payload));
}

/**
 * Determine whether debug mode is enabled based on parsed flags.
 *
 * Supports:
 * - --debug-args
 * - --debug
 */
export function isDebugEnabled(flags: Record<string, unknown>): boolean {
  return Boolean(flags["debug-args"]) || Boolean(flags.debug);
}

/**
 * Ensure process.exitCode is set to a non-zero value on unexpected errors
 * when not already set by the caller.
 */
export function ensureErrorExitCode(defaultCode: number): void {
  if (process.exitCode === undefined || process.exitCode === 0) {
    process.exitCode = defaultCode;
  }
}
