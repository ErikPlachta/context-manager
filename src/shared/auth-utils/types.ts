/**
 * Authentication Types
 */

/**
 * Authentication method
 */
export type AuthMethod = 'apikey' | 'oauth' | 'none';

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  /** API key (for apikey method) */
  apiKey?: string;
  /** OAuth token (for oauth method) */
  token?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
  /** Refresh token */
  refreshToken?: string;
}

/**
 * Authentication config
 */
export interface AuthConfig {
  /** Authentication method */
  method: AuthMethod;
  /** Credentials */
  credentials?: AuthCredentials;
  /** Required scopes */
  scopes?: string[];
}

/**
 * Authentication result
 */
export interface AuthResult {
  /** Is authenticated */
  authenticated: boolean;
  /** Error message if not authenticated */
  error?: string;
  /** User info */
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}
