/**
 * Unit tests for AI Model Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AIModelManager,
  getAIModelManager,
  resetAIModelManager,
  DEFAULT_MODEL_CONFIG
} from './index.js';

describe('AI Model Manager', () => {
  let manager: AIModelManager;

  beforeEach(() => {
    manager = new AIModelManager();
  });

  afterEach(() => {
    resetAIModelManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig();

      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-3-5-sonnet-20241022');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
    });

    it('should accept custom config', () => {
      const customManager = new AIModelManager({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.5
      });

      const config = customManager.getConfig();
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
      expect(config.temperature).toBe(0.5);
    });
  });

  describe('generate', () => {
    it('should generate a response', async () => {
      const response = await manager.generate({
        prompt: 'Test prompt'
      });

      expect(response.text).toBeDefined();
      expect(response.finishReason).toBe('stop');
      expect(response.usage).toBeDefined();
      expect(response.usage?.totalTokens).toBeGreaterThan(0);
    });

    it('should include system prompt in options', async () => {
      const response = await manager.generate({
        system: 'You are a helpful assistant',
        prompt: 'Test prompt'
      });

      expect(response.text).toBeDefined();
    });

    it('should throw error for streaming in generate', async () => {
      await expect(
        manager.generate({
          prompt: 'Test',
          stream: true
        })
      ).rejects.toThrow('Use generateStream()');
    });
  });

  describe('generateStream', () => {
    it('should generate streaming response', async () => {
      const chunks: string[] = [];

      for await (const chunk of manager.generateStream({
        prompt: 'Test prompt'
      })) {
        chunks.push(chunk.text);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeDefined();
    });

    it('should mark final chunk', async () => {
      let lastChunk;

      for await (const chunk of manager.generateStream({
        prompt: 'Test'
      })) {
        lastChunk = chunk;
      }

      expect(lastChunk?.final).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      manager.setConfig({
        temperature: 0.9,
        maxTokens: 2048
      });

      const config = manager.getConfig();
      expect(config.temperature).toBe(0.9);
      expect(config.maxTokens).toBe(2048);
      expect(config.provider).toBe('anthropic'); // Unchanged
    });
  });

  describe('setApiKey', () => {
    it('should set API key', () => {
      manager.setApiKey('test-key');

      const config = manager.getConfig();
      expect(config.apiKey).toBe('test-key');
    });
  });

  describe('setModel', () => {
    it('should set model', () => {
      manager.setModel('claude-3-opus-20240229');

      const config = manager.getConfig();
      expect(config.model).toBe('claude-3-opus-20240229');
    });
  });

  describe('setProvider', () => {
    it('should set provider', () => {
      manager.setProvider('openai');

      const config = manager.getConfig();
      expect(config.provider).toBe('openai');
    });
  });

  describe('getAIModelManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getAIModelManager();
      const manager2 = getAIModelManager();

      expect(manager1).toBe(manager2);
    });

    it('should use config on first call', () => {
      const manager = getAIModelManager({ temperature: 0.3 });

      expect(manager.getConfig().temperature).toBe(0.3);
    });
  });

  describe('DEFAULT_MODEL_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_MODEL_CONFIG.provider).toBe('anthropic');
      expect(DEFAULT_MODEL_CONFIG.model).toBe('claude-3-5-sonnet-20241022');
      expect(DEFAULT_MODEL_CONFIG.temperature).toBe(0.7);
      expect(DEFAULT_MODEL_CONFIG.maxTokens).toBe(4096);
    });
  });
});
