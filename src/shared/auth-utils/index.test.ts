/**
 * Unit tests for Authentication Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AuthManager,
  getAuthManager,
  resetAuthManager,
  DEFAULT_AUTH_CONFIG
} from './index.js';

describe('Authentication Manager', () => {
  let manager: AuthManager;

  beforeEach(() => {
    manager = new AuthManager();
  });

  afterEach(() => {
    resetAuthManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig();

      expect(config.method).toBe('none');
      expect(config.scopes).toEqual([]);
    });

    it('should accept custom config', () => {
      const customManager = new AuthManager({
        method: 'apikey',
        scopes: ['read', 'write']
      });

      const config = customManager.getConfig();
      expect(config.method).toBe('apikey');
      expect(config.scopes).toEqual(['read', 'write']);
    });
  });

  describe('authenticate - none method', () => {
    it('should authenticate without credentials', async () => {
      const result = await manager.authenticate();

      expect(result.authenticated).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('authenticate - apikey method', () => {
    beforeEach(() => {
      manager.setMethod('apikey');
    });

    it('should authenticate with valid API key', async () => {
      const result = await manager.authenticate({ apiKey: 'test-key' });

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user_from_apikey');
    });

    it('should fail without API key', async () => {
      const result = await manager.authenticate();

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('No credentials provided');
    });

    it('should fail with empty API key', async () => {
      const result = await manager.authenticate({ apiKey: '' });

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });
  });

  describe('authenticate - oauth method', () => {
    beforeEach(() => {
      manager.setMethod('oauth');
    });

    it('should authenticate with valid token', async () => {
      const result = await manager.authenticate({ token: 'test-token' });

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('user@example.com');
    });

    it('should fail without token', async () => {
      const result = await manager.authenticate();

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('No credentials provided');
    });

    it('should fail with empty token', async () => {
      const result = await manager.authenticate({ token: '' });

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Invalid OAuth token');
    });
  });

  describe('isValid', () => {
    it('should return true for non-expired credentials', () => {
      const credentials = {
        apiKey: 'test-key',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      };

      expect(manager.isValid(credentials)).toBe(true);
    });

    it('should return false for expired credentials', () => {
      const credentials = {
        apiKey: 'test-key',
        expiresAt: Date.now() - 1000 // 1 second ago
      };

      expect(manager.isValid(credentials)).toBe(false);
    });

    it('should return true for credentials without expiration', () => {
      const credentials = { apiKey: 'test-key' };

      expect(manager.isValid(credentials)).toBe(true);
    });

    it('should validate API key presence', () => {
      manager.setMethod('apikey');

      expect(manager.isValid({ apiKey: 'test' })).toBe(true);
      expect(manager.isValid({})).toBe(false);
    });

    it('should validate OAuth token presence', () => {
      manager.setMethod('oauth');

      expect(manager.isValid({ token: 'test' })).toBe(true);
      expect(manager.isValid({})).toBe(false);
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      manager.setMethod('oauth');
    });

    it('should refresh OAuth credentials', async () => {
      const refreshed = await manager.refresh('refresh-token');

      expect(refreshed).toBeDefined();
      expect(refreshed?.token).toBeDefined();
      expect(refreshed?.expiresAt).toBeGreaterThan(Date.now());
      expect(refreshed?.refreshToken).toBe('refresh-token');
    });

    it('should return null for non-OAuth methods', async () => {
      manager.setMethod('apikey');

      const refreshed = await manager.refresh('refresh-token');

      expect(refreshed).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('should update configuration', () => {
      manager.setConfig({
        method: 'oauth',
        scopes: ['read']
      });

      const config = manager.getConfig();
      expect(config.method).toBe('oauth');
      expect(config.scopes).toEqual(['read']);
    });
  });

  describe('setMethod', () => {
    it('should set authentication method', () => {
      manager.setMethod('apikey');

      const config = manager.getConfig();
      expect(config.method).toBe('apikey');
    });
  });

  describe('setCredentials', () => {
    it('should set credentials', () => {
      manager.setCredentials({ apiKey: 'test-key' });

      const config = manager.getConfig();
      expect(config.credentials?.apiKey).toBe('test-key');
    });
  });

  describe('getAuthManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getAuthManager();
      const manager2 = getAuthManager();

      expect(manager1).toBe(manager2);
    });

    it('should use config on first call', () => {
      const manager = getAuthManager({ method: 'apikey' });

      expect(manager.getConfig().method).toBe('apikey');
    });
  });

  describe('DEFAULT_AUTH_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_AUTH_CONFIG.method).toBe('none');
      expect(DEFAULT_AUTH_CONFIG.scopes).toEqual([]);
    });
  });
});
