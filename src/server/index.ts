#!/usr/bin/env node
/**
 * Context Manager MCP Server
 *
 * Orchestrator that manages skills and coordinates tool calls from LLM agents.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { setupShutdownHandlers } from '../shared/stdio/index.js';
import { SkillRegistry, loadSkills, getAllTools } from './core/index.js';
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
 * Global skill registry
 */
const skillRegistry = new SkillRegistry();

/**
 * Initialize MCP Server with skill system
 */
async function createServer(): Promise<Server> {
  const server = new Server(
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

  // Load all skills
  console.error('[Server] Loading skills...');
  const loadResult = await loadSkills();

  // Register loaded skills
  for (const skill of loadResult.loaded) {
    skillRegistry.register(skill);
  }

  // Report load results
  if (loadResult.failed.length > 0) {
    console.error(`[Server] Failed to load ${loadResult.failed.length} skill(s)`);
  }

  console.error(`[Server] Loaded ${skillRegistry.size} skill(s) with ${skillRegistry.toolCount} tool(s)`);

  // Register tools/list handler
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      const tools = getAllTools(skillRegistry);
      return { tools };
    }
  );

  // Register tools/call handler
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request) => {
      const { name, arguments: args } = request.params;

      console.error(`[Server] Tool call: ${name}`);

      try {
        // Find skill that provides this tool
        const skill = skillRegistry.findByTool(name);

        if (!skill) {
          throw new Error(`Unknown tool: ${name}`);
        }

        // Find tool registration
        const toolReg = skill.tools.find(t => t.definition.name === name);

        if (!toolReg) {
          throw new Error(`Tool handler not found: ${name}`);
        }

        // Validate input
        const validatedInput = toolReg.definition.inputSchema.parse(args);

        // Execute handler
        const result = await toolReg.handler(validatedInput);

        // Format result
        if (typeof result === 'string') {
          return {
            content: [{ type: 'text', text: result }]
          };
        }

        if (result && typeof result === 'object' && 'content' in result) {
          return result;
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Server] Error: ${errorMessage}`);

        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  return server;
}

/**
 * Get skill registry (for testing)
 */
function getSkillRegistry(): SkillRegistry {
  return skillRegistry;
}

/**
 * Main entry point
 */
async function main() {
  console.error('Starting Context Manager MCP Server...');
  console.error(`Version: ${config.version}`);

  try {
    // Create server
    const server = await createServer();

    // Setup STDIO transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Setup graceful shutdown
    setupShutdownHandlers(async () => {
      console.error('Shutting down server...');
      await server.close();
    });

    console.error('Server ready and listening on STDIO');

    // List loaded tools
    const skills = skillRegistry.getAll();
    for (const skill of skills) {
      const toolNames = skill.tools.map(t => t.definition.name).join(', ');
      console.error(`  [${skill.id}]: ${toolNames}`);
    }
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

export { createServer, getSkillRegistry, config };
