/**
 * Deprecated HTTP embedded server stub.
 *
 * The project migrated to stdio-only JSON-RPC transport. This file remains as a
 * no-op placeholder to avoid breaking historical imports during refactor stages.
 * Remove after all references are cleaned.
 *
 * @packageDocumentation
 */

/**
 * Starts the (deprecated) embedded HTTP MCP server stub.
 *
 * @returns Informational string indicating stdio-only transport.
 * @deprecated HTTP transport disabled; use stdio startup in `src/server/index.ts`.
 * @example
 * ```ts
 * const msg = await startMCPServer();
 * console.log(msg); // "stdio-only: no HTTP server"
 * ```
 */
export async function startMCPServer(): Promise<string> {
  return "stdio-only: no HTTP server";
}

/**
 * Stops the (deprecated) embedded HTTP MCP server stub (no-op).
 *
 * @returns Resolves immediately; no resources are allocated.
 * @deprecated HTTP transport disabled; use stdio lifecycle in `src/server/index.ts`.
 */
export async function stopMCPServer(): Promise<void> {
  return Promise.resolve();
}
