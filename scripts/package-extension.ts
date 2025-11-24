#!/usr/bin/env tsx
/**
 * Package extension - Create VSIX package for VS Code installation
 */

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync, rmSync, cpSync, readdirSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';
const EXTENSION_DIST = join(DIST_DIR, 'extension-package');

console.log('📦 Packaging VS Code Extension...');

try {
  // Step 1: Build extension
  console.log('1️⃣  Building extension...');
  execSync('pnpm build:extension', { stdio: 'inherit' });

  // Step 2: Create package directory
  console.log('2️⃣  Preparing package directory...');
  if (existsSync(EXTENSION_DIST)) {
    rmSync(EXTENSION_DIST, { recursive: true });
  }
  mkdirSync(EXTENSION_DIST, { recursive: true });

  // Step 3: Copy extension package.json
  console.log('3️⃣  Copying extension manifest...');
  copyFileSync('extension.package.json', join(EXTENSION_DIST, 'package.json'));

  // Step 4: Copy built files
  console.log('4️⃣  Copying built files...');

  // Ensure dist directory exists in package
  mkdirSync(join(EXTENSION_DIST, 'dist'), { recursive: true });

  // Copy dist folder contents to extension-package
  const distClient = join(DIST_DIR, 'client');
  const distShared = join(DIST_DIR, 'shared');
  const distTypes = join(DIST_DIR, 'types');
  const distServer = join(DIST_DIR, 'server');

  if (existsSync(distClient)) {
    cpSync(distClient, join(EXTENSION_DIST, 'dist', 'client'), { recursive: true });
  }

  if (existsSync(distShared)) {
    cpSync(distShared, join(EXTENSION_DIST, 'dist', 'shared'), { recursive: true });
  }

  if (existsSync(distTypes)) {
    cpSync(distTypes, join(EXTENSION_DIST, 'dist', 'types'), { recursive: true });
  }

  // Copy server build (needed by extension)
  if (existsSync(distServer)) {
    cpSync(distServer, join(EXTENSION_DIST, 'dist', 'server'), { recursive: true });
  }

  // Step 5: Copy README and LICENSE if they exist
  console.log('5️⃣  Copying documentation...');
  if (existsSync('README.md')) {
    copyFileSync('README.md', join(EXTENSION_DIST, 'README.md'));
  }
  if (existsSync('LICENSE')) {
    copyFileSync('LICENSE', join(EXTENSION_DIST, 'LICENSE'));
  }

  // Step 6: Install dependencies in package directory
  console.log('6️⃣  Installing dependencies...');
  execSync('npm install --production', {
    cwd: EXTENSION_DIST,
    stdio: 'inherit'
  });

  // Step 7: Package with vsce
  console.log('7️⃣  Creating VSIX package...');
  execSync('vsce package --allow-missing-repository --skip-license', {
    cwd: EXTENSION_DIST,
    stdio: 'inherit'
  });

  // Step 8: Move VSIX to root
  console.log('8️⃣  Moving VSIX to root...');
  const files = readdirSync(EXTENSION_DIST);
  const vsixFiles = files.filter(f => f.endsWith('.vsix'));

  if (vsixFiles.length > 0) {
    const vsixFile = vsixFiles[0];
    const src = join(EXTENSION_DIST, vsixFile);
    const dest = join('.', vsixFile);

    // Remove existing VSIX if present
    if (existsSync(dest)) {
      rmSync(dest);
    }

    copyFileSync(src, dest);
    console.log(`\n✅ Extension packaged: ${vsixFile}`);
    console.log(`\nInstall with: code --install-extension ${vsixFile}`);
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Extension packaging failed:', error);
  process.exit(1);
}
