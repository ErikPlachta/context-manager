/**
 * MCP Protocol Type Definitions
 *
 * Core types for Model Context Protocol server implementation.
 */

import { z } from 'zod';

/**
 * MCP Tool Definition
 * Defines the schema and metadata for a tool that can be called by an LLM.
 */
export interface MCPToolDefinition {
  /** Unique tool identifier (snake_case) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Zod schema for input parameters */
  inputSchema: z.ZodType<any>;
}

/**
 * MCP Tool Handler
 * Function that executes when a tool is called.
 */
export type MCPToolHandler<TInput = any, TOutput = any> = (
  input: TInput
) => Promise<TOutput>;

/**
 * MCP Tool Registration
 * Combines definition with handler for tool registration.
 */
export interface MCPToolRegistration<TInput = any, TOutput = any> {
  definition: MCPToolDefinition;
  handler: MCPToolHandler<TInput, TOutput>;
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  /** Server name shown to clients */
  name: string;
  /** Server version (semver) */
  version: string;
  /** Optional server description */
  description?: string;
}

/**
 * MCP Tool Call Result
 */
export interface MCPToolResult {
  /** Text content of result */
  content: Array<{
    type: 'text';
    text: string;
  }>;
  /** Whether call succeeded */
  isError?: boolean;
}

/**
 * Re-export SDK types for convenience (when needed)
 */
// export type { Tool as SDKTool } from '@modelcontextprotocol/sdk/types.js';
