/**
 * @packageDocumentation JSON-RPC 2.0 Reference (MCP)
 *
 * Summarizes the JSON-RPC 2.0 protocol as implemented by the MCP server in `src/` and provides
 * implementation guidance to ensure a single, unified request path across transports (stdio by default;
 * HTTP optional for local debugging).
 *
 * - Spec: https://www.jsonrpc.org/specification
 * - MCP overview in this repo: see `src/mcp/` and `src/server/`
 * - Governance links: Tools & Integrations → MCP Transport & Protocol; Core Principles – Scope Specific (src/**)
 *
 * ## Core Concepts
 *
 * - Request-response protocol: Each request has an `id`; responses echo the same `id`.
 * - Notifications: Messages without `id` (no response expected) — generally avoided for MCP tool calls;
 *   keep request-response for determinism.
 * - Error model: Standard JSON-RPC error object `{ code, message, data? }`.
 * - Versioning: Always include `"jsonrpc": "2.0"`.
 *
 * ## Message Shapes
 *
 * - Request:
 *
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "tools/list",
 *   "params": {},
 *   "id": 1
 * }
 * ```
 *
 * - Response (success):
 *
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "result": {},
 *   "id": 1
 * }
 * ```
 *
 * - Response (error):
 *
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "error": { "code": -32601, "message": "Method not found" },
 *   "id": 1
 * }
 * ```
 *
 * ## Methods (MCP mapping)
 *
 * The MCP server reuses a single handler path to dispatch the following logical methods:
 *
 * - `initialize`: Establishes session, capabilities, and negotiated options.
 * - `tools/list`: Returns tool descriptors derived from orchestrator/config (no hardcoded arrays).
 * - `tools/call`: Executes a tool by `name` with typed `arguments` and returns typed data (formatting is handled by
 *   CommunicationAgent, not here).
 *
 * Notes:
 *
 * - Keep handlers pure and typed; return data, not formatting.
 * - Derive tool metadata from orchestrator/config; avoid hardcoded business values.
 *
 * ## Error Codes
 *
 * Prefer standard JSON-RPC codes where applicable:
 *
 * - `-32600` Invalid Request
 * - `-32601` Method not found
 * - `-32602` Invalid params
 * - `-32603` Internal error
 *
 * Use domain-specific `data` for additional context, but keep `code`/`message` concise and stable.
 *
 * ## Transport
 *
 * - Default: stdio
 * - Optional (local debugging): HTTP when `MCP_HTTP_ENABLED=true`
 * - Rule: One JSON-RPC path reused across transports to prevent drift.
 *
 * ## Implementation Guidance (src/**)
 *
 * - Single handler: Unify `initialize`, `tools/list`, `tools/call` in one dispatcher.
 * - Typed results only: Agents return typed data; CommunicationAgent formats responses.
 * - Data-driven: Tools registry derived from config/orchestrator.
 * - Testing: Verify request/response shapes and error cases (method not found, invalid params).
 *
 * ## Examples
 *
 * - List tools (request):
 *
 * ```json
 * { "jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 2 }
 * ```
 *
 * - Call tool (request):
 *
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "tools/call",
 *   "params": {
 *     "name": "user-context.query",
 *     "arguments": { "categoryId": "people" }
 *   },
 *   "id": 3
 * }
 * ```
 *
 * ## References
 *
 * - JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
 * - VS Code Extension API (transport context): https://code.visualstudio.com/api
 * - This repo’s MCP server entry: `src/server/` and `src/mcp/`
 */
export {};
