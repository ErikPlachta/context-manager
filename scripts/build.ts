#!/usr/bin/env tsx
/**
 * Build script - Builds both server and extension
 */

import { execSync } from 'child_process';

console.log('🔨 Building Context Manager...\n');

try {
  console.log('📦 Building server...');
  execSync('tsx scripts/build-server.ts', { stdio: 'inherit' });

  console.log('\n📦 Building extension...');
  execSync('tsx scripts/build-extension.ts', { stdio: 'inherit' });

  console.log('\n✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
}
