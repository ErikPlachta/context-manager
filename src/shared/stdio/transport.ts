/**
 * STDIO Transport Helpers
 *
 * Utilities for setting up STDIO communication for MCP servers.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

/**
 * Create and connect STDIO transport for MCP server
 *
 * Sets up bidirectional communication over stdin/stdout for the MCP protocol.
 *
 * @param server - MCP Server instance
 * @returns Connected transport
 */
export async function createStdioTransport(
  server: Server
): Promise<StdioServerTransport> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return transport;
}

/**
 * Setup graceful shutdown handlers
 *
 * Ensures proper cleanup when process receives termination signals.
 *
 * @param cleanup - Async cleanup function
 */
export function setupShutdownHandlers(cleanup: () => Promise<void>): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.on(signal, async () => {
      console.error(`Received ${signal}, shutting down gracefully...`);
      try {
        await cleanup();
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  }

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });
}
