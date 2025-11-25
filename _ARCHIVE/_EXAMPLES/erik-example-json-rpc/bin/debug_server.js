console.log("DEBUG: Main check:", import.meta.url);
console.log("DEBUG: Process argv:", process.argv);
/**
 * Minimal JSON-RPC server that exposes the mock business datasets through the
 * Model Context Protocol (MCP). It is intentionally lightweight so the VS Code
 * extension can connect to a local endpoint during development.
 */
/**
 * @packageDocumentation index implementation for server module
 */
import { createServer } from "http";
import { readFile, readdir } from "fs/promises";
import * as path from "path";
import { pathToFileURL, fileURLToPath } from "url";
// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = process.env.VSCODE_TEMPLATE_DATA_ROOT
  ? path.resolve(process.env.VSCODE_TEMPLATE_DATA_ROOT)
  : path.join(__dirname, "userContext");
/**
 * loadJson function.
 *
 * @template T
 *
 * @param {string[]} segments - segments parameter.
 * @returns {Promise<T>} - TODO: describe return value.
 */
async function loadJson(...segments) {
  const filePath = path.join(DATA_ROOT, ...segments);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}
/**
 * loadOptionalJson function.
 *
 * @template T
 *
 * @param {string[]} segments - segments parameter.
 * @returns {Promise<T | undefined>} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
async function loadOptionalJson(...segments) {
  try {
    return await loadJson(...segments);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
/**
 * loadJsonCollection function.
 *
 * @param {string} categoryId - categoryId parameter.
 * @param {string} folder - folder parameter.
 * @returns {Promise<unknown[]>} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
async function loadJsonCollection(categoryId, folder) {
  try {
    const directory = path.join(DATA_ROOT, categoryId, folder);
    const entries = await readdir(directory);
    const jsonFiles = entries.filter((file) => file.endsWith(".json"));
    const results = [];
    for (const file of jsonFiles) {
      results.push(await loadJson(categoryId, folder, file));
    }
    return results;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
/**
 * describeCategory function.
 *
 * @param {string} categoryId - categoryId parameter.
 * @returns {Promise<unknown>} - TODO: describe return value.
 */
async function describeCategory(categoryId) {
  const [category, relationships, schemas, examples, queries] =
    await Promise.all([
      loadJson(categoryId, "category.json"),
      loadOptionalJson(categoryId, "relationships.json"),
      loadJsonCollection(categoryId, "schemas"),
      loadJsonCollection(categoryId, "examples"),
      loadJsonCollection(categoryId, "queries"),
    ]);
  return {
    category,
    relationships: relationships ?? [],
    schemas,
    examples,
    queries,
  };
}
/**
 * searchRecords function.
 *
 * @param {string} categoryId - categoryId parameter.
 * @param {Record<string, unknown>} filters - filters parameter.
 * @returns {Promise<unknown[]>} - TODO: describe return value.
 */
async function searchRecords(categoryId, filters = {}) {
  const records = await loadJson(categoryId, "records.json");
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== ""
  );
  if (activeFilters.length === 0) {
    return records;
  }
  return records.filter((record) =>
    activeFilters.every(([key, value]) => {
      const recordValue = record[key];
      if (Array.isArray(recordValue)) {
        return value !== undefined && recordValue.includes(value);
      }
      return recordValue === value;
    })
  );
}
const tools = [
  {
    name: "user-context.describeCategory",
    title: "Describe category",
    description:
      "Return the configuration, schema catalogue, and relationship metadata for a business category.",
    tags: ["metadata", "documentation"],
    input_schema: {
      required: ["categoryId"],
      properties: {
        categoryId: {
          name: "categoryId",
          type: "string",
          description: "Identifier of the category to describe.",
          required: true,
        },
      },
    },
  },
  {
    name: "user-context.searchRecords",
    title: "Search category records",
    description:
      "Search the mock dataset for a category using optional equality filters over structured fields.",
    tags: ["records", "query"],
    input_schema: {
      required: ["categoryId"],
      properties: {
        categoryId: {
          name: "categoryId",
          type: "string",
          description: "Identifier of the category to query.",
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
/**
 * handleInvoke function.
 *
 * @param {string} name - name parameter.
 * @param {Record<string, unknown>} args - args parameter.
 * @returns {Promise<unknown>} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
async function handleInvoke(name, args = {}) {
  switch (name) {
    case "user-context.describeCategory": {
      const categoryId = String(args.categoryId ?? "");
      if (!categoryId) {
        throw new Error("'categoryId' is required.");
      }
      return describeCategory(categoryId);
    }
    case "user-context.searchRecords": {
      const categoryId = String(args.categoryId ?? "");
      if (!categoryId) {
        throw new Error("'categoryId' is required.");
      }
      const filters = args.filters ?? {};
      return searchRecords(categoryId, filters);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
/**
 * sendJson function.
 *
 * @param {ServerResponse} res - res parameter.
 * @param {JsonRpcResponse} response - response parameter.
 */
function sendJson(res, response) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(response));
}
/**
 * handleRequest function.
 *
 * @param {IncomingMessage} req - req parameter.
 * @param {ServerResponse} res - res parameter.
 * @returns {Promise<void>} - TODO: describe return value.
 */
async function handleRequest(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end();
    return;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    sendJson(res, {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Invalid JSON",
        data: error.message,
      },
    });
    return;
  }
  if (payload.method === "initialize") {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "usercontext-mcp-server", // TODO: Update this to be an arg from a config in the bin folder or something.
          version: "1.0.0",
        },
      },
    });
    return;
  }
  if (payload.method === "listTools") {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: { tools },
    });
    return;
  }
  if (payload.method === "tools/call") {
    const params = payload.params ?? {};
    const toolName = params.name;
    if (!toolName) {
      sendJson(res, {
        jsonrpc: "2.0",
        id: payload.id ?? null,
        error: { code: -32602, message: "Tool name is required" },
      });
      return;
    }
    try {
      const result = await handleInvoke(toolName, params.arguments ?? {});
      sendJson(res, {
        jsonrpc: "2.0",
        id: payload.id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    } catch (error) {
      sendJson(res, {
        jsonrpc: "2.0",
        id: payload.id ?? null,
        error: { code: -32000, message: error.message },
      });
    }
    return;
  }
  if (payload.method === "listTools") {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: { tools },
    });
    return;
  }
  if (payload.method !== "invokeTool") {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      error: { code: -32601, message: `Unknown method: ${payload.method}` },
    });
    return;
  }
  const params = payload.params ?? {};
  const toolName = params.name;
  if (!toolName) {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      error: { code: -32602, message: "Tool name is required" },
    });
    return;
  }
  try {
    const result = await handleInvoke(toolName, params.arguments ?? {});
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      result: { content: result },
    });
  } catch (error) {
    sendJson(res, {
      jsonrpc: "2.0",
      id: payload.id ?? null,
      error: { code: -32000, message: error.message },
    });
  }
}
/**
 * createMcpServer function.
 *
 * @param {unknown} port - port parameter.
 * @returns {Server} - TODO: describe return value.
 */
export function createMcpServer(port = Number(process.env.MCP_PORT ?? 3030)) {
  const server = createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      sendJson(res, {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: "Internal error",
          data: error.message,
        },
      });
    });
  });
  server.listen(port, () => {
    console.log(`MCP mock server listening on http://localhost:${port}`);
  });
  return server;
}
/**
 * Handle JSON-RPC message processing for MCP protocol.
 *
 * @param {JsonRpcRequest} message - message parameter.
 * @returns {Promise<JsonRpcResponse>} - TODO: describe return value.
 */
async function handleJsonRpcMessage(message) {
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
      return {
        jsonrpc: "2.0",
        id: message.id ?? null,
        result: { tools },
      };
    }
    if (message.method === "tools/call") {
      const params = message.params ?? {};
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
      // Validate that the tool exists
      const availableTools = tools.map((tool) => tool.name);
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
        return {
          jsonrpc: "2.0",
          id: message.id ?? null,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
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
function startStdioServer() {
  let buffer = "";
  let isInitialized = false;
  // Log to stderr to avoid interfering with stdout JSON-RPC communication
  const log =
    /**
     * log function.
     *
     * @param {string} message - message parameter.
     */
    (message) => {
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
            const message = JSON.parse(line);
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
            log(`Error: ${parseError.message}`);
            const errorResponse = {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error",
                data: parseError.message,
              },
            };
            console.log(JSON.stringify(errorResponse));
          }
        }
      }
    } catch (error) {
      log(`Unexpected error processing stdin data: ${error.message}`);
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
// Support both CJS and ESM entry detection
const __isMain = (() => {
  // CJS path: require/module available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = typeof require !== "undefined" ? require : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = typeof module !== "undefined" ? module : undefined;
  if (req && mod) return req.main === mod;
  // ESM path: compare import.meta.url to argv[1]
  try {
    const argv1 = process.argv?.[1];
    if (!argv1) return false;
    let moduleUrl;
    try {
      moduleUrl = Function("return import.meta.url")();
    } catch {
      moduleUrl = undefined;
    }
    if (!moduleUrl) return false;
    return pathToFileURL(argv1).href === moduleUrl;
  } catch {
    return false;
  }
})();
if (__isMain) {
  // Check if we should run in stdio mode
  const args = process.argv.slice(2);
  if (args.includes("--stdio")) {
    startStdioServer();
  } else {
    createMcpServer();
  }
}
export { tools, handleRequest };
