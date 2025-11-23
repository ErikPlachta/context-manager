/**
 * Unit tests for Server Authentication Utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeServerAuth,
  getServerAuth,
  authenticateRequest,
  requireAuth
} from './index.js';

describe('Server Authentication Utilities', () => {
  beforeEach(() => {
    // Reset by initializing with default config
    initializeServerAuth();
  });

  describe('initializeServerAuth', () => {
    it('should initialize auth manager', () => {
      initializeServerAuth({ method: 'apikey' });

      const manager = getServerAuth();
      expect(manager.getConfig().method).toBe('apikey');
    });
  });

  describe('getServerAuth', () => {
    it('should return auth manager', () => {
      const manager = getServerAuth();
      expect(manager).toBeDefined();
    });

    it('should create default manager if not initialized', () => {
      const manager = getServerAuth();
      expect(manager.getConfig().method).toBe('none');
    });
  });

  describe('authenticateRequest', () => {
    it('should authenticate with no auth required', async () => {
      initializeServerAuth({ method: 'none' });

      const result = await authenticateRequest({});

      expect(result.authenticated).toBe(true);
    });

    it('should authenticate with API key in x-api-key header', async () => {
      initializeServerAuth({ method: 'apikey' });

      const result = await authenticateRequest({
        'x-api-key': 'test-key'
      });

      expect(result.authenticated).toBe(true);
    });

    it('should authenticate with API key in authorization header', async () => {
      initializeServerAuth({ method: 'apikey' });

      const result = await authenticateRequest({
        'authorization': 'Bearer test-key'
      });

      expect(result.authenticated).toBe(true);
    });

    it('should authenticate with OAuth token', async () => {
      initializeServerAuth({ method: 'oauth' });

      const result = await authenticateRequest({
        'authorization': 'Bearer test-token'
      });

      expect(result.authenticated).toBe(true);
    });

    it('should fail without credentials', async () => {
      initializeServerAuth({ method: 'apikey' });

      const result = await authenticateRequest({});

      expect(result.authenticated).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should not throw for authenticated result', () => {
      expect(() => requireAuth({ authenticated: true })).not.toThrow();
    });

    it('should throw for unauthenticated result', () => {
      expect(() =>
        requireAuth({ authenticated: false, error: 'Invalid credentials' })
      ).toThrow('Invalid credentials');
    });

    it('should throw default message if no error', () => {
      expect(() => requireAuth({ authenticated: false })).toThrow(
        'Authentication required'
      );
    });
  });
});
