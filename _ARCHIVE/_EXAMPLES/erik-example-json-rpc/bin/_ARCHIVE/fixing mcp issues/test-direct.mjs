#!/usr/bin/env node

// Simple test to call stdio server directly
import { spawn } from "child_process";

console.log("Direct test of stdio server...");

// Let's try to call startStdioServer directly by executing as main
const server = spawn(
  "node",
  [
    "-e",
    `
import('./out/src/server/index.js').then(module => {
  // Extract startStdioServer if exported or simulate main execution
  console.error('[Test] Starting server manually...');
  
  // Simulate being the main module by setting process.argv
  const originalArgv = process.argv;
  process.argv = [...process.argv.slice(0, 2), '--stdio'];
  
  // The module should automatically start the stdio server when imported as main
  // But since we're importing, let's manually trigger
  console.error('[Test] Server should start now...');
  
  // Listen for stdin
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (line.trim()) {
        console.error('[Test] Received:', line);
        const msg = JSON.parse(line);
        if (msg.method === 'initialize') {
          const response = {
            jsonrpc: "2.0",
            id: msg.id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: { name: "test-server", version: "1.0.0" }
            }
          };
          console.log(JSON.stringify(response));
        }
      }
    }
  });
  
  console.error('[Test] Ready for input');
});
`,
    "--stdio",
  ],
  {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  }
);

server.stdout.setEncoding("utf8");
server.stderr.setEncoding("utf8");

server.stdout.on("data", (data) => {
  console.log("Response:", data.trim());
});

server.stderr.on("data", (data) => {
  console.log("Stderr:", data.trim());
});

server.on("close", (code) => {
  console.log(`Exited with code: ${code}`);
});

// Send test request after short delay
setTimeout(() => {
  console.log("Sending test...");
  server.stdin.write(
    '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}\\n'
  );

  setTimeout(() => {
    server.stdin.end();
  }, 2000);
}, 1000);
