/**
 * User Context Defaults
 */

import type { UserContext, UserPreferences, ProjectContext } from './schema.js';

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  verboseLogging: false
};

/**
 * Create default project context
 */
export function createDefaultProjectContext(rootDir: string): ProjectContext {
  return {
    rootDir,
    metadata: {}
  };
}

/**
 * Create default user context
 */
export function createDefaultUserContext(rootDir: string = process.cwd()): UserContext {
  return {
    preferences: DEFAULT_PREFERENCES,
    project: createDefaultProjectContext(rootDir),
    updatedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}
