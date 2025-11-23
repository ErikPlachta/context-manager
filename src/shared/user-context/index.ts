/**
 * User Context Management
 *
 * Provides user-specific context and preferences for personalized experiences.
 */

import { join } from 'path';
import { safeReadFile, safeWriteFile, fileExists } from '../file-system-tool/index.js';
import { UserContextSchema, type UserContext } from './schema.js';
import { createDefaultUserContext } from './defaults.js';

const CONTEXT_FILE_NAME = '.context-manager.json';

/**
 * User Context Manager
 */
export class UserContextManager {
  private context: UserContext | null = null;
  private contextPath: string;

  constructor(rootDir: string = process.cwd()) {
    this.contextPath = join(rootDir, CONTEXT_FILE_NAME);
  }

  /**
   * Load user context from file
   */
  async load(): Promise<UserContext> {
    try {
      const content = await safeReadFile(this.contextPath, { throwIfNotExists: false });

      if (!content) {
        // No context file, create default
        this.context = createDefaultUserContext(process.cwd());
        await this.save();
        return this.context;
      }

      // Parse and validate
      const parsed = JSON.parse(content);
      this.context = UserContextSchema.parse(parsed);

      return this.context;
    } catch (error) {
      console.error('[UserContext] Failed to load context:', error);
      // Fallback to default
      this.context = createDefaultUserContext(process.cwd());
      return this.context;
    }
  }

  /**
   * Save user context to file
   */
  async save(): Promise<void> {
    if (!this.context) {
      throw new Error('No context to save. Call load() first.');
    }

    try {
      // Update timestamp
      this.context.updatedAt = new Date().toISOString();

      // Validate before saving
      const validated = UserContextSchema.parse(this.context);

      // Save to file
      await safeWriteFile(this.contextPath, JSON.stringify(validated, null, 2));
    } catch (error) {
      throw new Error(`Failed to save user context: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current context (load if not loaded)
   */
  async get(): Promise<UserContext> {
    if (!this.context) {
      return await this.load();
    }
    return this.context;
  }

  /**
   * Update context with partial data
   */
  async update(partial: Partial<UserContext>): Promise<UserContext> {
    const current = await this.get();
    this.context = { ...current, ...partial };
    await this.save();
    return this.context;
  }

  /**
   * Check if context file exists
   */
  async exists(): Promise<boolean> {
    return await fileExists(this.contextPath);
  }

  /**
   * Reset to default context
   */
  async reset(): Promise<UserContext> {
    this.context = createDefaultUserContext(process.cwd());
    await this.save();
    return this.context;
  }

  /**
   * Get context file path
   */
  getPath(): string {
    return this.contextPath;
  }
}

// Export singleton instance
let globalManager: UserContextManager | null = null;

/**
 * Get global user context manager instance
 */
export function getUserContextManager(rootDir?: string): UserContextManager {
  if (!globalManager || (rootDir && rootDir !== process.cwd())) {
    globalManager = new UserContextManager(rootDir);
  }
  return globalManager;
}

// Re-export types and schemas
export type { UserContext, UserPreferences, ProjectContext, SessionContext } from './schema.js';
export { UserContextSchema, UserPreferencesSchema, ProjectContextSchema, SessionContextSchema } from './schema.js';
export { createDefaultUserContext, createDefaultProjectContext, DEFAULT_PREFERENCES } from './defaults.js';
