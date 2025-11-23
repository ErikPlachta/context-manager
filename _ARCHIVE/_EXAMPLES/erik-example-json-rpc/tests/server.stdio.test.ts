// Use dynamic import pattern instead of require to keep ESM alignment
import { describe, it, expect } from "@jest/globals";
import { spawn } from "child_process";

function jsonl(obj: unknown): string {
  return JSON.stringify(obj) + "\n";
}

// Guard integration test behind env var to keep default suite fast/stable
const shouldRun = process.env.MCP_STDIO_INTEGRATION === "1";

describe("STDIO JSON-RPC transport (compiled)", () => {
  (shouldRun ? it : it.skip)(
    "initialize and tools/list via out/server",
    async () => {
      // Ensure compiled artifacts exist (npm run compile before running with env var)
      const child = spawn(process.execPath, ["out/server/index.js"], {
        env: { ...process.env, MCP_HTTP_ENABLED: "false" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdoutBuf = "";
      const responses: Array<any> = [];

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string | Buffer) => {
        stdoutBuf += String(chunk);
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            responses.push(msg);
          } catch {
            // ignore non-JSON output
          }
        }
      });

      const waitFor = (pred: () => boolean, timeoutMs = 8000) =>
        new Promise<void>((resolve, reject) => {
          const start = Date.now();
          const t = setInterval(() => {
            if (pred()) {
              clearInterval(t);
              resolve();
            } else if (Date.now() - start > timeoutMs) {
              clearInterval(t);
              reject(new Error("timeout"));
            }
          }, 25);
        });

      // Send initialize
      child.stdin.write(
        jsonl({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
      );
      await waitFor(() => responses.some((r) => r.id === 1));
      const init = responses.find((r) => r.id === 1);
      expect(init.error).toBeUndefined();
      expect(init.result).toBeDefined();

      // List tools
      child.stdin.write(
        jsonl({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
      );
      await waitFor(() => responses.some((r) => r.id === 2));
      const list = responses.find((r) => r.id === 2);
      expect(list.error).toBeUndefined();
      expect(Array.isArray(list.result?.tools)).toBe(true);
      expect(list.result.tools.length).toBeGreaterThan(0);

      // Clean up
      child.stdin.end();
      child.kill();
    },
    15000
  );
});
