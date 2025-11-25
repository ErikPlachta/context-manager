#!/usr/bin/env tsx
/**
 * Build server - Compiles MCP server
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔨 Building MCP Server...');

try {
  // Check if src/server exists
  if (!existsSync('src/server')) {
    console.log('⚠️  src/server not found - skipping server build');
    process.exit(0);
  }

  // Compile TypeScript
  execSync('tsc -p tsconfig.server.json', { stdio: 'inherit' });

  console.log('✅ Server build completed');
  process.exit(0);
} catch (error) {
  console.error('❌ Server build failed:', error);
  process.exit(1);
}
