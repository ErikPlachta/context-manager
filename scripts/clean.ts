#!/usr/bin/env tsx
/**
 * Clean script - Removes build outputs
 */

import { rmSync, existsSync } from 'fs';

console.log('🧹 Cleaning build outputs...');

const paths = ['dist', '.tsbuildinfo', 'coverage', '.vitest'];

for (const path of paths) {
  if (existsSync(path)) {
    console.log(`  Removing ${path}...`);
    rmSync(path, { recursive: true, force: true });
  }
}

console.log('✅ Clean completed');
