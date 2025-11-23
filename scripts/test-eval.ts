#!/usr/bin/env tsx
/**
 * Eval test script - Runs Evalite tests
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🧪 Running Evalite tests...');

try {
  if (!existsSync('tests/eval')) {
    console.log('⚠️  No eval tests found - skipping');
    process.exit(0);
  }

  execSync('evalite run', { stdio: 'inherit' });

  console.log('✅ Evalite tests completed');
  process.exit(0);
} catch (error) {
  console.error('❌ Evalite tests failed:', error);
  process.exit(1);
}
