/**
 * Unit tests for User Context Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserContextManager, createDefaultUserContext } from './index.js';
import { unlink } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tmp-test-user-context');
const CONTEXT_FILE = join(TEST_DIR, '.context-manager.json');

describe('User Context Manager', () => {
  let manager: UserContextManager;

  beforeEach(() => {
    manager = new UserContextManager(TEST_DIR);
  });

  afterEach(async () => {
    try {
      await unlink(CONTEXT_FILE);
    } catch {}
  });

  describe('load', () => {
    it('should create default context if file does not exist', async () => {
      const context = await manager.load();

      expect(context).toBeDefined();
      expect(context.preferences).toBeDefined();
      expect(context.project).toBeDefined();
      expect(context.version).toBe('1.0.0');
    });

    it('should load existing context from file', async () => {
      // Create initial context
      await manager.load();
      await manager.update({ preferences: { ...manager['context']!.preferences, language: 'es' } });

      // Create new manager and load
      const newManager = new UserContextManager(TEST_DIR);
      const context = await newManager.load();

      expect(context.preferences.language).toBe('es');
    });
  });

  describe('save', () => {
    it('should save context to file', async () => {
      await manager.load();
      await manager.save();

      const exists = await manager.exists();
      expect(exists).toBe(true);
    });

    it('should update timestamp on save', async () => {
      await manager.load();
      const initialTimestamp = manager['context']!.updatedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await manager.save();
      const newTimestamp = manager['context']!.updatedAt;

      expect(newTimestamp).not.toBe(initialTimestamp);
    });
  });

  describe('get', () => {
    it('should load context if not already loaded', async () => {
      const context = await manager.get();

      expect(context).toBeDefined();
      expect(context.preferences).toBeDefined();
    });

    it('should return cached context if already loaded', async () => {
      const context1 = await manager.get();
      const context2 = await manager.get();

      expect(context1).toBe(context2);
    });
  });

  describe('update', () => {
    it('should update context with partial data', async () => {
      await manager.load();
      const updated = await manager.update({
        preferences: {
          language: 'fr',
          timezone: 'Europe/Paris',
          dateFormat: 'DD/MM/YYYY',
          verboseLogging: true
        }
      });

      expect(updated.preferences.language).toBe('fr');
      expect(updated.preferences.timezone).toBe('Europe/Paris');
    });

    it('should save after update', async () => {
      await manager.load();
      await manager.update({ preferences: { ...manager['context']!.preferences, language: 'de' } });

      // Load in new manager
      const newManager = new UserContextManager(TEST_DIR);
      const context = await newManager.load();

      expect(context.preferences.language).toBe('de');
    });
  });

  describe('reset', () => {
    it('should reset to default context', async () => {
      await manager.load();
      await manager.update({ preferences: { ...manager['context']!.preferences, language: 'ja' } });

      const reset = await manager.reset();

      expect(reset.preferences.language).toBe('en');
    });
  });

  describe('createDefaultUserContext', () => {
    it('should create valid default context', () => {
      const context = createDefaultUserContext('/test/path');

      expect(context.preferences.language).toBe('en');
      expect(context.project.rootDir).toBe('/test/path');
      expect(context.version).toBe('1.0.0');
    });
  });
});
