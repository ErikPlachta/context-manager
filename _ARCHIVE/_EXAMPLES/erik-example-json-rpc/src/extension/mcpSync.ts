/**
 * @packageDocumentation Fetches and Normalizes Model Context Protocol (MCP) tool
 * definitions.
 *
 * @module mcpSync
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";
import { MCPListToolsResponse, MCPProperty, MCPTool } from "@shared/mcpTypes";

/**
 * Error wrapper that provides additional context for MCP failures.
 *
 * @example
 * ```ts
 * throw new MCPDiscoveryError("Unable to list tools");
 * ```
 */
export class MCPDiscoveryError extends Error {
  /**
   * constructor function.
   *
   * @param {string} message - message parameter.
   * @param {unknown} cause - cause parameter.
   * @returns {unknown} - TODO: describe return value.
   */
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MCPDiscoveryError";
  }
}

/**
 * Normalize the tool properties by merging schema metadata so prompts can
 *
 * @param {MCPTool} tool - tool parameter.
 * @returns {MCPTool} - TODO: describe return value.
 */
function NormalizeTool(tool: MCPTool): MCPTool {
  if (!tool.input_schema?.properties) {
    return tool;
  }
  const required = new Set(tool.input_schema.required ?? []);
  const properties: Record<string, MCPProperty & Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(tool.input_schema.properties)) {
    properties[key] = {
      ...(value as MCPProperty),
      name: key,
      required: required.has(key),
    };
  }
  return {
    ...tool,
    input_schema: {
      ...tool.input_schema,
      properties,
    },
  };
}

/**
 * Fetch all available MCP tools from the configured server.
 *
 * @param {string} serverUrl - serverUrl parameter.
 * @param {string} token - token parameter.
 * @returns {Promise<MCPTool[]>} - TODO: describe return value.
 * @throws {Error} - May throw an error.
 */
export async function fetchTools(
  serverUrl: string,
  token?: string
): Promise<MCPTool[]> {
  if (!serverUrl) {
    throw new MCPDiscoveryError("The MCP server URL is not configured.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "listTools",
    params: {},
  };

  try {
    const url = new URL(serverUrl);
    const isHttps = url.protocol === "https:";
    const httpModule = isHttps ? https : http;
    const payloadData = JSON.stringify(payload);

    const response = await new Promise<{
      statusCode: number;
      data: string;
    }>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(payloadData),
        },
        timeout: 15000,
      };

      const req = httpModule.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            data,
          });
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.write(payloadData);
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new MCPDiscoveryError(
        `MCP server responded with status ${response.statusCode}.`
      );
    }

    const parsedData = JSON.parse(response.data) as MCPListToolsResponse;

    if (parsedData?.error) {
      throw new MCPDiscoveryError(
        `MCP server responded with an error: ${parsedData.error.message}`,
        parsedData.error
      );
    }
    const tools = parsedData?.result?.tools ?? [];
    return tools.map(NormalizeTool);
  } catch (error) {
    if (error instanceof MCPDiscoveryError) {
      throw error;
    }
    const message =
      error instanceof Error
        ? `Unable to reach MCP server at ${serverUrl}: ${error.message}`
        : `Unable to reach MCP server at ${serverUrl}.`;
    throw new MCPDiscoveryError(message, error);
  }
}

/**
 * Fetch tools from the locally embedded server module when running in stdio mode.
 * This avoids HTTP and reads the exported tool catalogue directly.
 *
 * @returns {Promise<MCPTool[]>} Normalized tool list from the embedded server.
 */
export async function fetchLocalTools(): Promise<MCPTool[]> {
  // Dynamic import to avoid bundling order issues; alias will be rewritten in out/ to a relative .js path
  const mod = (await import("@server/index")) as unknown as {
    tools?: MCPTool[];
  };
  const serverTools = Array.isArray(mod.tools) ? mod.tools : [];
  return serverTools.map(NormalizeTool);
}

export type {
  MCPInputSchema,
  MCPListToolsResponse,
  MCPProperty,
  MCPTool,
} from "@shared/mcpTypes";
