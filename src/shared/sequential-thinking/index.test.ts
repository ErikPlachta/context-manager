/**
 * Unit tests for Sequential Thinking Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SequentialThinkingManager,
  getSequentialThinkingManager,
  DEFAULT_THINKING_CONFIG
} from './index.js';

describe('Sequential Thinking Manager', () => {
  let manager: SequentialThinkingManager;

  beforeEach(() => {
    manager = new SequentialThinkingManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.budgetTokens).toBe(10000);
      expect(config.maxDepth).toBe(3);
    });

    it('should accept custom config', () => {
      const customManager = new SequentialThinkingManager({
        enabled: true,
        budgetTokens: 5000
      });

      const config = customManager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.budgetTokens).toBe(5000);
    });
  });

  describe('generate', () => {
    it('should generate response without thinking when disabled', async () => {
      const result = await manager.generate({
        prompt: 'Test prompt'
      });

      expect(result.response).toBeDefined();
      expect(result.thinking).toBeUndefined();
      expect(result.thinkingTokens).toBe(0);
    });

    it('should generate response with thinking when enabled', async () => {
      manager.enable();

      const result = await manager.generate({
        prompt: 'Test prompt with thinking'
      });

      expect(result.response).toBeDefined();
      expect(result.thinking).toBeDefined();
      expect(result.thinkingTokens).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should respect custom thinking config in options', async () => {
      const result = await manager.generate({
        prompt: 'Test prompt',
        thinking: {
          enabled: true,
          maxDepth: 2
        }
      });

      expect(result.thinking).toBeDefined();
      // Should have 2 steps based on maxDepth
      const steps = result.thinking?.split('\n').length;
      expect(steps).toBeLessThanOrEqual(2);
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      manager.setConfig({ enabled: true, budgetTokens: 8000 });

      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.budgetTokens).toBe(8000);
      expect(config.maxDepth).toBe(3); // Unchanged
    });
  });

  describe('enable/disable', () => {
    it('should enable thinking', () => {
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });

    it('should enable thinking with custom budget', () => {
      manager.enable(15000);

      const config = manager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.budgetTokens).toBe(15000);
    });

    it('should disable thinking', () => {
      manager.enable();
      manager.disable();
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return false by default', () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      manager.enable();
      expect(manager.isEnabled()).toBe(true);
    });
  });

  describe('getSequentialThinkingManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getSequentialThinkingManager();
      const manager2 = getSequentialThinkingManager();

      expect(manager1).toBe(manager2);
    });

    it('should use existing singleton instance', () => {
      // Get existing singleton
      const manager = getSequentialThinkingManager();

      // Singleton should already be initialized
      expect(manager).toBeDefined();
      expect(manager.getConfig()).toBeDefined();
    });
  });

  describe('DEFAULT_THINKING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_THINKING_CONFIG.enabled).toBe(false);
      expect(DEFAULT_THINKING_CONFIG.budgetTokens).toBe(10000);
      expect(DEFAULT_THINKING_CONFIG.maxDepth).toBe(3);
    });
  });
});
