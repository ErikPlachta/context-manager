/**
 * Server Authentication Utilities
 *
 * Server-side authentication helpers for MCP server.
 */

import { AuthManager } from '../../../shared/auth-utils/index.js';
import type { AuthConfig, AuthResult } from '../../../shared/auth-utils/index.js';

/**
 * Server auth manager singleton
 */
let serverAuthManager: AuthManager | null = null;

/**
 * Initialize server authentication
 */
export function initializeServerAuth(config?: Partial<AuthConfig>): void {
  serverAuthManager = new AuthManager(config);
}

/**
 * Get server auth manager
 */
export function getServerAuth(): AuthManager {
  if (!serverAuthManager) {
    serverAuthManager = new AuthManager();
  }
  return serverAuthManager;
}

/**
 * Authenticate request middleware
 */
export async function authenticateRequest(
  headers: Record<string, string>
): Promise<AuthResult> {
  const manager = getServerAuth();
  const config = manager.getConfig();

  if (config.method === 'none') {
    return { authenticated: true };
  }

  // Extract credentials from headers
  const credentials = extractCredentials(headers, config.method);

  return await manager.authenticate(credentials);
}

/**
 * Extract credentials from headers
 */
function extractCredentials(
  headers: Record<string, string>,
  method: 'apikey' | 'oauth' | 'none'
) {
  if (method === 'apikey') {
    const apiKey = headers['x-api-key'] || headers['authorization']?.replace('Bearer ', '');
    return apiKey ? { apiKey } : undefined;
  }

  if (method === 'oauth') {
    const token = headers['authorization']?.replace('Bearer ', '');
    return token ? { token } : undefined;
  }

  return undefined;
}

/**
 * Require authentication
 */
export function requireAuth(result: AuthResult): void {
  if (!result.authenticated) {
    throw new Error(result.error || 'Authentication required');
  }
}

// Re-export shared types
export type { AuthConfig, AuthResult, AuthCredentials } from '../../../shared/auth-utils/index.js';
