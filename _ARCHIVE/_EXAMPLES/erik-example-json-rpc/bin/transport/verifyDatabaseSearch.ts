#!/usr/bin/env node
/**
 * End-to-end HTTP transport verification for DatabaseAgent searchRecords tool.
 *
 * Spawns the compiled MCP server with HTTP enabled (ephemeral port), performs:
 *  1. initialize
 *  2. tools/list
 *  3. tools/call (user-context.searchRecords)
 *
 * Prints concise PASS/FAIL output; exits non-zero on failure.
 */
import { spawn } from "node:child_process";
import { request } from "node:http";
import path from "node:path";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

interface JsonRpcSuccess<T = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  result: T;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcError;

function postJson<T = unknown>(
  port: number,
  body: JsonRpcRequest
): Promise<JsonRpcResponse<T>> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        method: "POST",
        hostname: "127.0.0.1",
        port,
        path: "/",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function run(): Promise<void> {
  // Spawn compiled server (ensure build has run; uses out/ emit)
  const server = spawn(process.execPath, ["out/src/server/index.js"], {
    env: {
      ...process.env,
      MCP_HTTP_ENABLED: "true",
      usercontextMCP_port: "0",
      // Ensure dataset root resolves to source during headless harness (compiled path lacks data files)
      VSCODE_TEMPLATE_DATA_ROOT: path.resolve("src", "userContext"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let port: number | undefined;
  let stderr = "";

  server.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    stderr += text;
    const match = text.match(/HTTP server listening on (\d+)/);
    if (match) port = Number(match[1]);
  });

  const waitPort = (): Promise<number> =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        if (port) return resolve(port);
        if (Date.now() - start > 8000)
          return reject(new Error("Timeout waiting for server port"));
        setTimeout(poll, 50);
      })();
    });

  try {
    const boundPort = await waitPort();
    const initialize = await postJson(boundPort, {
      jsonrpc: "2.0",
      method: "initialize",
      params: {},
      id: 1,
    });
    if ("error" in initialize)
      throw new Error("Initialize failed: " + JSON.stringify(initialize.error));

    const list = await postJson<{ tools: { name: string }[] }>(boundPort, {
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 2,
    });
    if ("error" in list)
      throw new Error("tools/list failed: " + JSON.stringify(list.error));
    const tools = list.result.tools;
    const searchTool = tools.find(
      (t) => t.name === "user-context.searchRecords"
    );
    if (!searchTool)
      throw new Error("user-context.searchRecords tool not found");

    const call = await postJson(boundPort, {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "user-context.searchRecords",
        arguments: { categoryId: "people", filters: { skill: "python" } },
      },
      id: 3,
    });
    if ("error" in call)
      throw new Error("tools/call failed: " + JSON.stringify(call.error));
    const message: string =
      (call.result as any)?.content?.[0]?.text || "(no text)";

    console.log("[verifyDatabaseSearch] SUCCESS");
    console.log("initialize keys:", Object.keys((initialize as any).result));
    console.log("tools count:", tools.length);
    console.log("searchRecords sample (truncated):", message.slice(0, 200));
    process.exit(0);
  } catch (err) {
    console.error("[verifyDatabaseSearch] FAIL", err);
    console.error("STDERR (truncated):\n", stderr.slice(0, 1000));
    process.exit(1);
  } finally {
    server.kill();
  }
}

void run();
