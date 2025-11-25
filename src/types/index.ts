/**
 * Type definitions for Context Manager MCP Server
 *
 * This is the main barrel export for all types used across the application.
 */

// MCP Protocol types
export type {
  MCPToolDefinition,
  MCPToolHandler,
  MCPToolRegistration,
  MCPServerConfig,
  MCPToolResult
} from './mcp.types.js';

// Skill System types
export type {
  Skill,
  SkillLoadResult,
  SkillRegistry
} from './skill.types.js';
