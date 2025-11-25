#!/usr/bin/env node

import { spawn } from "child_process";

console.log("Testing MCP stdio server...");

const server = spawn("node", ["out/src/server/index.js", "--stdio"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr - capture all
});

server.stdout.setEncoding("utf8");
server.stderr.setEncoding("utf8");

// Listen for responses
server.stdout.on("data", (data) => {
  console.log("Server response:", data.trim());
});

// Listen for stderr logs
server.stderr.on("data", (data) => {
  console.log("Server stderr:", data.trim());
});

server.on("close", (code) => {
  console.log(`Server exited with code: ${code}`);
  process.exit(code || 0);
});

server.on("error", (error) => {
  console.error("Server error:", error);
  process.exit(1);
});

// Send initialize request
const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "1.0",
    capabilities: {},
  },
};

console.log("Sending initialize request...");
server.stdin.write(JSON.stringify(initRequest) + "\n");

// Send tools/list request after a brief delay
setTimeout(() => {
  const listRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  };

  console.log("Sending tools/list request...");
  server.stdin.write(JSON.stringify(listRequest) + "\n");

  // Close after another delay
  setTimeout(() => {
    console.log("Closing server...");
    server.stdin.end();
  }, 1000);
}, 1000);
