/**
 * Authentication Utilities
 *
 * Provides authentication and authorization helpers for the MCP server.
 * Supports API key and OAuth authentication methods.
 */

import type { AuthConfig, AuthCredentials, AuthResult, AuthMethod } from './types.js';

/**
 * Default auth configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  method: 'none',
  scopes: []
};

/**
 * Authentication Manager
 */
export class AuthManager {
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * Authenticate with credentials
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthResult> {
    if (this.config.method === 'none') {
      return {
        authenticated: true
      };
    }

    if (!credentials) {
      return {
        authenticated: false,
        error: 'No credentials provided'
      };
    }

    // Validate based on method
    if (this.config.method === 'apikey') {
      return this.authenticateApiKey(credentials.apiKey);
    }

    if (this.config.method === 'oauth') {
      return this.authenticateOAuth(credentials.token);
    }

    return {
      authenticated: false,
      error: `Unknown auth method: ${this.config.method}`
    };
  }

  /**
   * Authenticate with API key
   */
  private async authenticateApiKey(apiKey?: string): Promise<AuthResult> {
    if (apiKey === undefined) {
      return {
        authenticated: false,
        error: 'API key required'
      };
    }

    // In production, this would validate against a database or service
    // For now, just check if it's not empty
    if (apiKey.length > 0) {
      return {
        authenticated: true,
        user: {
          id: 'user_from_apikey',
          name: 'API Key User'
        }
      };
    }

    return {
      authenticated: false,
      error: 'Invalid API key'
    };
  }

  /**
   * Authenticate with OAuth token
   */
  private async authenticateOAuth(token?: string): Promise<AuthResult> {
    if (token === undefined) {
      return {
        authenticated: false,
        error: 'OAuth token required'
      };
    }

    // In production, this would validate token with OAuth provider
    // For now, just check if it's not empty
    if (token.length > 0) {
      return {
        authenticated: true,
        user: {
          id: 'user_from_oauth',
          email: 'user@example.com',
          name: 'OAuth User'
        }
      };
    }

    return {
      authenticated: false,
      error: 'Invalid OAuth token'
    };
  }

  /**
   * Validate credentials (check if still valid)
   */
  isValid(credentials: AuthCredentials): boolean {
    // Check expiration
    if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
      return false;
    }

    // Check token/key exists
    if (this.config.method === 'apikey') {
      return !!credentials.apiKey;
    }

    if (this.config.method === 'oauth') {
      return !!credentials.token;
    }

    return true;
  }

  /**
   * Refresh credentials (for OAuth)
   */
  async refresh(refreshToken: string): Promise<AuthCredentials | null> {
    if (this.config.method !== 'oauth') {
      return null;
    }

    // In production, this would call OAuth provider to refresh
    // For now, return mock credentials
    return {
      token: 'new_token_' + Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
      refreshToken
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }

  /**
   * Set authentication method
   */
  setMethod(method: AuthMethod): void {
    this.config.method = method;
  }

  /**
   * Set credentials
   */
  setCredentials(credentials: AuthCredentials): void {
    this.config.credentials = credentials;
  }
}

// Export singleton instance
let globalManager: AuthManager | null = null;

/**
 * Get global auth manager instance
 */
export function getAuthManager(config?: Partial<AuthConfig>): AuthManager {
  if (!globalManager) {
    globalManager = new AuthManager(config);
  }
  return globalManager;
}

/**
 * Reset global instance (useful for testing)
 */
export function resetAuthManager(): void {
  globalManager = null;
}

// Re-export types
export type { AuthConfig, AuthCredentials, AuthResult, AuthMethod } from './types.js';
