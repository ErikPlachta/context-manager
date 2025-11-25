#!/usr/bin/env tsx
/**
 * Inspector script - Launches MCP inspector
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🔍 Launching MCP Inspector...\n');

const serverPath = 'dist/server/server/index.js';

if (!existsSync(serverPath)) {
  console.error('❌ Server not built. Run `pnpm build:server` first.');
  process.exit(1);
}

console.log(`Server: ${serverPath}\n`);

const inspector = spawn('npx', ['@modelcontextprotocol/inspector', serverPath], {
  stdio: 'inherit',
  shell: true
});

inspector.on('exit', (code) => {
  process.exit(code ?? 0);
});
