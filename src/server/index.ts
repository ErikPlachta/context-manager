#!/usr/bin/env node
/**
 * Context Manager MCP Server
 *
 * Orchestrator that manages skills and coordinates tool calls from LLM agents.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { setupShutdownHandlers } from '../shared/stdio/index.js';
import type { MCPServerConfig } from '../types/index.js';

/**
 * Server configuration
 */
const config: MCPServerConfig = {
  name: 'context-manager',
  version: '0.0.1',
  description: 'Skill-driven MCP Server for intelligent context management'
};

/**
 * Echo Tool Schema
 */
const EchoInputSchema = z.object({
  message: z.string().describe('Message to echo back')
});

type EchoInput = z.infer<typeof EchoInputSchema>;

/**
 * Initialize MCP Server
 */
function createServer(): McpServer {
  const server = new McpServer(
    {
      name: config.name,
      version: config.version
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register echo tool
  server.tool(
    'echo',
    'Echoes back the provided message. Useful for testing the MCP connection.',
    {
      message: z.string().describe('Message to echo back')
    },
    async ({ message }: { message: string }) => {
      console.error(`[Echo Tool] Received: "${message}"`);
      const result = `Echo: ${message}`;

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    }
  );

  return server;
}

/**
 * Echo Tool Handler (legacy, for backwards compatibility)
 */
async function handleEchoTool(input: EchoInput): Promise<string> {
  console.error(`[Echo Tool] Received: "${input.message}"`);
  return `Echo: ${input.message}`;
}

/**
 * Main entry point
 */
async function main() {
  console.error('Starting Context Manager MCP Server...');
  console.error(`Version: ${config.version}`);

  try {
    // Create server
    const server = createServer();

    // Setup STDIO transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Setup graceful shutdown
    setupShutdownHandlers(async () => {
      console.error('Shutting down server...');
      await server.close();
    });

    console.error('Server ready and listening on STDIO');
    console.error('Tools available: echo');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { createServer, handleEchoTool, config };
