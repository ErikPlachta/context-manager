#!/usr/bin/env tsx
/**
 * Test script - Runs all tests (unit + eval)
 */

import { execSync } from 'child_process';

console.log('🧪 Running all tests...\n');

try {
  console.log('📝 Running unit tests (Vitest)...');
  execSync('vitest run', { stdio: 'inherit' });

  console.log('\n📝 Running eval tests (Evalite)...');
  execSync('tsx scripts/test-eval.ts', { stdio: 'inherit' });

  console.log('\n✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Tests failed:', error);
  process.exit(1);
}
