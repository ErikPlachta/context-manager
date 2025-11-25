#!/usr/bin/env tsx
/**
 * Build extension - Compiles VS Code extension
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔨 Building VS Code Extension...');

try {
  // Check if src/client exists
  if (!existsSync('src/client')) {
    console.log('⚠️  src/client not found - skipping extension build');
    process.exit(0);
  }

  // Compile TypeScript
  execSync('tsc -p tsconfig.extension.json', { stdio: 'inherit' });

  console.log('✅ Extension build completed');
  process.exit(0);
} catch (error) {
  console.error('❌ Extension build failed:', error);
  process.exit(1);
}
