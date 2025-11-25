/**
 * Unit tests for File System Tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeReadFile, safeWriteFile, fileExists, isPathAllowed } from './index.js';
import { unlink, mkdir, rmdir } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tmp-test-fs');
const TEST_FILE = join(TEST_DIR, 'test.txt');

describe('File System Tool', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await unlink(TEST_FILE);
    } catch {}
    try {
      await rmdir(TEST_DIR);
    } catch {}
  });

  describe('safeWriteFile', () => {
    it('should write file successfully', async () => {
      await safeWriteFile(TEST_FILE, 'Hello, World!');
      const exists = await fileExists(TEST_FILE);
      expect(exists).toBe(true);
    });

    it('should create parent directories', async () => {
      const nestedFile = join(TEST_DIR, 'nested', 'test.txt');
      await safeWriteFile(nestedFile, 'Nested content');
      const exists = await fileExists(nestedFile);
      expect(exists).toBe(true);

      // Cleanup
      await unlink(nestedFile);
      await rmdir(join(TEST_DIR, 'nested'));
    });
  });

  describe('safeReadFile', () => {
    it('should read file successfully', async () => {
      const content = 'Test content';
      await safeWriteFile(TEST_FILE, content);
      const result = await safeReadFile(TEST_FILE);
      expect(result).toBe(content);
    });

    it('should throw error if file not found and throwIfNotExists=true', async () => {
      await expect(safeReadFile(join(TEST_DIR, 'nonexistent.txt'))).rejects.toThrow('File not found');
    });

    it('should return null if file not found and throwIfNotExists=false', async () => {
      const result = await safeReadFile(join(TEST_DIR, 'nonexistent.txt'), { throwIfNotExists: false });
      expect(result).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await safeWriteFile(TEST_FILE, 'Content');
      const exists = await fileExists(TEST_FILE);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await fileExists(join(TEST_DIR, 'nonexistent.txt'));
      expect(exists).toBe(false);
    });
  });

  describe('isPathAllowed', () => {
    it('should allow path within allowed directory', () => {
      const allowed = isPathAllowed(TEST_FILE, TEST_DIR);
      expect(allowed).toBe(true);
    });

    it('should reject path outside allowed directory', () => {
      const allowed = isPathAllowed('/etc/passwd', TEST_DIR);
      expect(allowed).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const allowed = isPathAllowed(join(TEST_DIR, '../../../etc/passwd'), TEST_DIR);
      expect(allowed).toBe(false);
    });
  });
});
