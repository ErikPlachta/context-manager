/**
 * Unit tests for Server Memory Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ServerMemoryManager,
  getServerMemoryManager,
  resetServerMemoryManager
} from './index.js';

describe('Server Memory Manager', () => {
  let manager: ServerMemoryManager;

  beforeEach(() => {
    manager = new ServerMemoryManager();
  });

  afterEach(() => {
    manager.destroy();
    resetServerMemoryManager();
  });

  describe('set and get', () => {
    it('should set and get a value', () => {
      manager.set('key1', 'value1');
      const value = manager.get('key1');

      expect(value).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const value = manager.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should handle complex objects', () => {
      const obj = { foo: 'bar', nested: { value: 123 } };
      manager.set('obj', obj);

      const retrieved = manager.get('obj');
      expect(retrieved).toEqual(obj);
    });
  });

  describe('TTL expiration', () => {
    it('should expire value after TTL', async () => {
      manager.set('temp', 'value', { ttl: 50 });

      // Should exist immediately
      expect(manager.get('temp')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should be expired
      expect(manager.get('temp')).toBeNull();
    });

    it('should not expire without TTL', async () => {
      manager.set('permanent', 'value');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(manager.get('permanent')).toBe('value');
    });
  });

  describe('getEntry', () => {
    it('should return entry with metadata', () => {
      manager.set('key1', 'value1', { metadata: { source: 'test' } });

      const entry = manager.getEntry('key1');

      expect(entry).toBeDefined();
      expect(entry?.value).toBe('value1');
      expect(entry?.metadata?.source).toBe('test');
      expect(entry?.createdAt).toBeDefined();
    });

    it('should return null for expired entry', async () => {
      manager.set('temp', 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(manager.getEntry('temp')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      manager.set('key1', 'value1');
      expect(manager.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(manager.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      manager.set('temp', 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(manager.has('temp')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a key', () => {
      manager.set('key1', 'value1');
      expect(manager.has('key1')).toBe(true);

      manager.delete('key1');
      expect(manager.has('key1')).toBe(false);
    });

    it('should return true if key existed', () => {
      manager.set('key1', 'value1');
      expect(manager.delete('key1')).toBe(true);
    });

    it('should return false if key did not exist', () => {
      expect(manager.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.set('key3', 'value3');

      manager.clear();

      expect(manager.has('key1')).toBe(false);
      expect(manager.has('key2')).toBe(false);
      expect(manager.has('key3')).toBe(false);
    });
  });

  describe('keys, values, entries', () => {
    beforeEach(() => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.set('key3', 'value3');
    });

    it('should return all keys', () => {
      const keys = manager.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return all values', () => {
      const values = manager.values();
      expect(values).toContain('value1');
      expect(values).toContain('value2');
      expect(values).toContain('value3');
    });

    it('should return all entries', () => {
      const entries = manager.entries();
      expect(entries).toHaveLength(3);
      expect(entries[0]).toHaveProperty('key');
      expect(entries[0]).toHaveProperty('value');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(0);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should count expired entries', async () => {
      manager.set('key1', 'value1');
      manager.set('temp', 'value', { ttl: 50 });

      await new Promise(resolve => setTimeout(resolve, 60));

      const stats = manager.getStats();
      expect(stats.expired).toBe(1);
      expect(stats.active).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should automatically cleanup expired entries', async () => {
      const fastCleanupManager = new ServerMemoryManager(50);

      fastCleanupManager.set('key1', 'value1');
      fastCleanupManager.set('temp', 'value', { ttl: 30 });

      // Wait for expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Expired entry should be cleaned up
      const keys = fastCleanupManager.keys();
      expect(keys).not.toContain('temp');
      expect(keys).toContain('key1');

      fastCleanupManager.destroy();
    });
  });

  describe('getServerMemoryManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getServerMemoryManager();
      const manager2 = getServerMemoryManager();

      expect(manager1).toBe(manager2);
    });
  });

  describe('destroy', () => {
    it('should stop cleanup and clear memory', () => {
      manager.set('key1', 'value1');
      manager.destroy();

      expect(manager.keys()).toHaveLength(0);
    });
  });
});
