/**
 * @packageDocumentation mcpTypes shared definitions for shared module.
 * Cross-cutting MCP JSON-RPC and tool schema types consumed by extension and agents.
 */
/**
 * Shared MCP type definitions consumed by both the VS Code extension client
 */
export interface MCPProperty {
  /** Argument identifier used when invoking the tool. */
  name: string;
  /** Primitive type such as `string`, `number`, `boolean`, or `array`. */
  type?: string | string[];
  /** Human readable description for prompts and docs. */
  description?: string;
  /** Static enumeration, if provided by the schema. */
  enum?: string[];
  /** Suggested default value supplied by the backend. */
  default?: unknown;
  /** Nested item type for array arguments. */
  items?: MCPProperty;
  /** Whether the parameter is required. */
  required?: boolean;
}

/**
 * Minimal JSON schema definition used by MCP tool payloads.
 *
 */
export interface MCPInputSchema {
  /** Map of argument names to property descriptors. */
  properties?: Record<string, MCPProperty & Record<string, unknown>>;
  /** List of keys that must be present. */
  required?: string[];
}

/**
 * Full MCP tool definition returned by `listTools`.
 *
 */
export interface MCPTool {
  /** Machine-readable tool identifier. */
  name: string;
  /** Title displayed to VS Code users. */
  title: string;
  /** Rich description detailing the tool purpose. */
  description: string;
  /** Optional extended summary for reference content. */
  summary?: string;
  /** Optional category or tags provided by the MCP server. */
  tags?: string[];
  /** JSON schema describing the tool arguments. */
  input_schema?: MCPInputSchema;
}

/**
 * JSON-RPC 2.0 payload returned by the MCP server.
 *
 */
export interface MCPListToolsResponse {
  jsonrpc: string;
  id: number | string;
  result?: { tools?: MCPTool[] };
  error?: { code?: number; message: string; data?: unknown };
}
