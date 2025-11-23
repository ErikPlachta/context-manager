#!/usr/bin/env tsx
/**
 * Dev server script - Runs server in development mode with watch
 */

import { spawn } from 'child_process';

console.log('🚀 Starting development server with watch mode...\n');

const tsc = spawn('tsc', ['-p', 'tsconfig.server.json', '--watch'], {
  stdio: 'inherit',
  shell: true
});

tsc.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  tsc.kill('SIGINT');
  process.exit(0);
});
