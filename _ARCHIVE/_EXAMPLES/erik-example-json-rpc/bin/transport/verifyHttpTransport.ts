/*
 Minimal HTTP transport verifier for the compiled MCP server.
 Starts the server with MCP_HTTP_ENABLED=true and ephemeral port (0),
 waits for the "HTTP server listening on <port>" log on stderr,
 then sends initialize and tools/list JSON-RPC requests over HTTP.
 Exits 0 on success, 1 on failure.
*/

import { spawn, type ChildProcess } from "child_process";
import http from "http";
import fs from "fs";

function fail(message: string, detail?: unknown): never {
  console.error("[HTTP-TRANSPORT] FAIL:", message);
  if (detail) console.error(detail);
  process.exit(1);
}

function postJson(port: number, payload: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload));
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(data.length),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const json: any = JSON.parse(body);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const serverPath = "out/src/server/index.js";
  if (!fs.existsSync(serverPath)) {
    fail(`Compiled server entry not found at ${serverPath}`);
  }

  const child = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      MCP_HTTP_ENABLED: "true",
      usercontextMCP_port: "0",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });

  let boundPort: number | null = null;
  let stderrBuf = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (d: string) => {
    const text = String(d);
    stderrBuf += text;
    const m = text.match(/HTTP server listening on (\d+)/);
    if (m && !boundPort) {
      boundPort = Number(m[1]);
      // Kick off verification once we have the port
      verify(boundPort, child).catch((err) => {
        console.error("[HTTP-TRANSPORT] STDERR so far:\n" + stderrBuf);
        fail("Verification failed", err);
      });
    }
  });

  child.on("error", (err) => fail("Child process error", err));

  // Failsafe timeout if port is never discovered
  setTimeout(() => {
    if (!boundPort) {
      console.error("[HTTP-TRANSPORT] STDERR so far:\n" + stderrBuf);
      fail("Timeout waiting for HTTP port");
    }
  }, 15000);
}

async function verify(port: number, child: ChildProcess): Promise<void> {
  const init: any = await postJson(port, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {},
  });
  if (init.error) fail("initialize returned error", init.error);
  if (init.jsonrpc !== "2.0") fail("initialize missing/invalid jsonrpc", init);
  if (!init.result || !init.result.serverInfo)
    fail("initialize missing result.serverInfo", init);

  const list: any = await postJson(port, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  if (list.error) fail("tools/list returned error", list.error);
  const tools: any[] | undefined = list.result && list.result.tools;
  if (!Array.isArray(tools) || tools.length === 0)
    fail("tools/list returned empty tools", list);

  const names = tools.map((t: any) => t && t.name).filter(Boolean);
  if (names.length === 0) fail("tools/list missing tool names", tools);

  try {
    child.kill();
  } catch {}
  console.log(
    "[HTTP-TRANSPORT] SUCCESS: initialize + tools/list validated on port",
    port
  );
  process.exit(0);
}

main().catch((err) => fail("Unhandled error in harness", err));
