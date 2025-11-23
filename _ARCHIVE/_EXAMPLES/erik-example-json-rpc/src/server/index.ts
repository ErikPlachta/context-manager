/**
 * Minimal JSON-RPC server that exposes the mock business datasets through the
 * Model Context Protocol (MCP). It is intentionally lightweight so the VS Code
 * extension can connect to a local endpoint during development.
 */

/**
 * @packageDocumentation index implementation for server module
 */

// HTTP transport removed: stdio-only JSON-RPC server retained for MCP compliance
// HTTP transport fully removed; stdio-only JSON-RPC server retained.
// (No path-dependent logic required; dataset access migrated.)
import { MCPTool } from "@shared/mcpTypes";
import {
  describeCategoryBridge,
  searchCategoryRecordsBridge,
  listCategorySummariesBridge,
} from "@server/orchestratorBridge";

// ES module path variables no longer needed after data loader migration.

/**
 * JsonRpcRequest interface.
 *
 */
export interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JsonRpcResponse interface.
 *
 */
export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * InvokeParams interface.
 *
 */
// (InvokeParams removed with HTTP transport elimination)

// Data loading & category resolution removed – handled by agents (orchestratorBridge + UserContextAgent).

/**
 * Build dynamic MCP tool descriptors using live category metadata.
 * Falls back to minimal static descriptors if enumeration fails.
 *
 * @returns Promise resolving to array of MCPTool definitions.
 */
async function getTools(): Promise<MCPTool[]> {
  try {
    const summaries = await listCategorySummariesBridge();
    const categoryList = summaries.map((s) => s.id).join(", ");
    const describe: MCPTool = {
      name: "user-context.describeCategory",
      title: "Describe category",
      description:
        "Return configuration, schemas, relationships, examples & queries for a category. Available: " +
        categoryList,
      tags: ["metadata", "documentation"],
      input_schema: {
        required: ["categoryId"],
        properties: {
          categoryId: {
            name: "categoryId",
            type: "string",
            description:
              "Identifier, name, or alias of the category to describe.",
            required: true,
          },
        },
      },
    };
    const search: MCPTool = {
      name: "user-context.searchRecords",
      title: "Search category records",
      description:
        "Search records within a category (id/name/alias). Available: " +
        categoryList,
      tags: ["records", "query"],
      input_schema: {
        required: ["categoryId"],
        properties: {
          categoryId: {
            name: "categoryId",
            type: "string",
            description: "Identifier, name, or alias of the category to query.",
            required: true,
          },
          filters: {
            name: "filters",
            type: "object",
            description:
              "Map of field names to equality values used when filtering records.",
          },
        },
      },
    };
    return [describe, search];
  } catch {
    return [
      {
        name: "user-context.describeCategory",
        title: "Describe category",
        description:
          "Return configuration, schemas, relationships, examples & queries for a category.",
        tags: ["metadata", "documentation"],
        input_schema: {
          required: ["categoryId"],
          properties: {
            categoryId: {
              name: "categoryId",
              type: "string",
              description:
                "Identifier, name, or alias of the category to describe.",
              required: true,
            },
          },
        },
      },
      {
        name: "user-context.searchRecords",
        title: "Search category records",
        description:
          "Search records within a category using optional equality filters.",
        tags: ["records", "query"],
        input_schema: {
          required: ["categoryId"],
          properties: {
            categoryId: {
              name: "categoryId",
              type: "string",
              description:
                "Identifier, name, or alias of the category to query.",
              required: true,
            },
            filters: {
              name: "filters",
              type: "object",
              description:
                "Map of field names to equality values used when filtering records.",
            },
          },
        },
      },
    ];
  }
}

/**
 * Invoke a tool by name using data-driven resolution and bridge formatting.
 *
 * @param name - Tool name.
 * @param args - Tool arguments.
 * @returns Tool execution result (formatted message object).
 */
async function handleInvoke(
  name: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  switch (name) {
    case "user-context.describeCategory": {
      const topic = String(args.categoryId ?? "").trim();
      if (!topic) throw new Error("'categoryId' is required.");
      return await describeCategoryBridge(topic);
    }
    case "user-context.searchRecords": {
      const topic = String(args.categoryId ?? "").trim();
      if (!topic) throw new Error("'categoryId' is required.");
      const filters =
        (args.filters as Record<string, unknown> | undefined) ?? {};
      return await searchCategoryRecordsBridge(topic, filters);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Legacy HTTP comment blocks removed.

/**
 * Handle a single JSON-RPC request and produce a response.
 *
 * @param message - JSON-RPC request.
 * @returns JSON-RPC response.
 */
export async function handleJsonRpcMessage(
  message: JsonRpcRequest
): Promise<JsonRpcResponse> {
  try {
    // Validate basic message structure
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be '2.0'",
        },
      };
    }

    if (!message.method || typeof message.method !== "string") {
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        error: {
          code: -32600,
          message: "Invalid Request: method is required and must be a string",
        },
      };
    }

    if (message.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "usercontext-mcp-server",
            version: "1.0.0",
          },
        },
      };
    }

    if (message.method === "tools/list") {
      const tools = await getTools();
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        result: { tools },
      };
    }

    if (message.method === "tools/call") {
      const params = (message.params ?? {}) as {
        name: string;
        arguments?: Record<string, unknown>;
      };
      const toolName = params.name;

      if (!toolName) {
        return {
          jsonrpc: "2.0",
          id: message.id ?? null,
          error: {
            code: -32602,
            message: "Invalid params: tool name is required",
          },
        };
      }

      // Validate that the tool exists using dynamic registry
      const availableTools = (await getTools()).map((tool) => tool.name);
      if (!availableTools.includes(toolName)) {
        return {
          jsonrpc: "2.0",
          id: message.id ?? null,
          error: {
            code: -32602,
            message: `Invalid params: unknown tool '${toolName}'. Available tools: ${availableTools.join(
              ", "
            )}`,
          },
        };
      }

      try {
        const result = await handleInvoke(toolName, params.arguments ?? {});
        type ToolResult = { message?: string } & Record<string, unknown>;
        const r = result as ToolResult;
        const text =
          typeof r.message === "string"
            ? r.message
            : JSON.stringify(result, null, 2);
        return {
          jsonrpc: "2.0",
          id: message.id ?? null,
          result: {
            content: [
              {
                type: "text",
                text,
              },
            ],
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          jsonrpc: "2.0",
          id: message.id ?? null,
          error: {
            code: -32000,
            message: `Tool execution error: ${errorMessage}`,
            data: { tool: toolName, originalError: errorMessage },
          },
        };
      }
    }

    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: -32601,
        message: `Unknown method: ${message.method}. Supported methods: initialize, tools/list, tools/call`,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      jsonrpc: "2.0",
      id: message.id ?? null,
      error: {
        code: -32603,
        message: `Internal error: ${errorMessage}`,
      },
    };
  }
}

/**
 * Start a stdio MCP server that communicates via stdin/stdout.
 *
 */
function startStdioServer(): void {
  let buffer = "";
  let isInitialized = false;

  // Log to stderr to avoid interfering with stdout JSON-RPC communication
  /**
   * Log helper writing to stderr.
   *
   * @param message - Text to emit.
   */
  const log = (message: string): void => {
    console.error(`[MCP Server ${new Date().toISOString()}] ${message}`);
  };

  log("MCP stdio server starting...");

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (chunk) => {
    try {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line) as JsonRpcRequest;

            // Log incoming requests for debugging (but not on every message to avoid spam)
            if (message.method === "initialize") {
              log(`Received initialize request`);
            } else if (!isInitialized) {
              log(`Received ${message.method} before initialization`);
            }

            const response = await handleJsonRpcMessage(message);

            // Mark as initialized after successful initialize
            if (message.method === "initialize" && !response.error) {
              isInitialized = true;
              log("Server successfully initialized");
            }

            console.log(JSON.stringify(response));
          } catch (parseError) {
            log(`Parse error for line: ${line}`);
            log(`Error: ${(parseError as Error).message}`);

            const errorResponse: JsonRpcResponse = {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error",
                data: (parseError as Error).message,
              },
            };
            console.log(JSON.stringify(errorResponse));
          }
        }
      }
    } catch (error) {
      log(
        `Unexpected error processing stdin data: ${(error as Error).message}`
      );
    }
  });

  process.stdin.on("end", () => {
    log("stdin closed, shutting down server");
    process.exit(0);
  });

  process.stdin.on("error", (error) => {
    log(`stdin error: ${error.message}`);
    process.exit(1);
  });

  // Handle process termination gracefully
  process.on("SIGINT", () => {
    log("Received SIGINT, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    log(`Uncaught exception: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    log(`Unhandled rejection: ${reason}`);
    process.exit(1);
  });

  log("MCP stdio server ready for requests");
}

/**
 * Start an HTTP JSON-RPC server that reuses the same dispatcher as stdio.
 * Enabled only when MCP_HTTP_ENABLED=true. Intended for local debugging.
 *
 * @param port - Port to listen on (0 uses an ephemeral port for tests).
 * @returns The created Node HTTP server instance and the bound port.
 */
export async function startHttpServer(
  port: number = Number(process.env.usercontextMCP_port ?? 39200)
): Promise<{ server: import("http").Server; port: number }> {
  const http = await import("http");
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 404;
      res.end();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(Buffer.from(c)));
      req.on("end", async () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          const msg = JSON.parse(body) as JsonRpcRequest;
          const response = await handleJsonRpcMessage(msg);
          const payload = Buffer.from(JSON.stringify(response));
          res.setHeader("content-type", "application/json");
          res.setHeader("content-length", String(payload.length));
          res.statusCode = 200;
          res.end(payload);
        } catch (e) {
          const payload = Buffer.from(
            JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: { code: -32700, message: "Parse error" },
            })
          );
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.setHeader("content-length", String(payload.length));
          res.end(payload);
        }
      });
    } catch {
      res.statusCode = 500;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const info = server.address();
  let boundPort = port;
  if (info && typeof info === "object" && "port" in info) {
    boundPort = Number((info as unknown as { port: number }).port);
  }
  return { server, port: boundPort };
}

// Support both CJS and ESM entry detection
const __isMain = ((): boolean => {
  // CJS path: require/module available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any = typeof require !== "undefined" ? require : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = typeof module !== "undefined" ? module : undefined;
  if (req && mod) return req.main === mod;
  // ESM path: simplified check for running directly
  // If we're here and not in a require() context, assume we're main
  return true;
})();

// Only auto-start the server if running as main module AND not in test environment
if (__isMain && process.env.NODE_ENV !== "test") {
  if (String(process.env.MCP_HTTP_ENABLED).toLowerCase() === "true") {
    // Start HTTP for local debugging (optional)
    void startHttpServer().then(({ port }) => {
      console.error(
        `[MCP Server ${new Date().toISOString()}] HTTP server listening on ${port}`
      );
    });
  } else {
    // Default stdio transport
    startStdioServer();
  }
}

export { getTools, startStdioServer };
