/**
 * Server Memory Wrapper
 *
 * Provides in-memory caching and session management for the MCP server.
 * Supports TTL-based expiration and automatic cleanup.
 */

import type { MemoryEntry, MemoryOptions, MemoryStats } from './types.js';

/**
 * Server Memory Manager
 */
export class ServerMemoryManager {
  private memory = new Map<string, MemoryEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number;

  constructor(cleanupIntervalMs: number = 60000) {
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.startCleanup();
  }

  /**
   * Set a value in memory
   */
  set(key: string, value: any, options?: MemoryOptions): void {
    const now = Date.now();
    const entry: MemoryEntry = {
      id: this.generateId(),
      key,
      value,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: options?.ttl ? now + options.ttl : undefined
    };

    this.memory.set(key, entry);
  }

  /**
   * Get a value from memory
   */
  get<T = any>(key: string): T | null {
    const entry = this.memory.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Get entry with metadata
   */
  getEntry(key: string): MemoryEntry | null {
    const entry = this.memory.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.memory.get(key);

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a value from memory
   */
  delete(key: string): boolean {
    return this.memory.delete(key);
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.memory.clear();
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    this.cleanupExpired(); // Clean before returning keys
    return Array.from(this.memory.keys());
  }

  /**
   * Get all values
   */
  values<T = any>(): T[] {
    this.cleanupExpired(); // Clean before returning values
    return Array.from(this.memory.values()).map(entry => entry.value as T);
  }

  /**
   * Get all entries
   */
  entries(): MemoryEntry[] {
    this.cleanupExpired(); // Clean before returning entries
    return Array.from(this.memory.values());
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const now = Date.now();
    const entries = Array.from(this.memory.values());

    const expired = entries.filter(
      entry => entry.expiresAt && now > entry.expiresAt
    ).length;

    const active = entries.length - expired;

    // Estimate size (rough calculation)
    const size = entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length;
    }, 0);

    return {
      total: entries.length,
      expired,
      active,
      size
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.memory.delete(key);
      }
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);

    // Don't keep process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// Export singleton instance
let globalManager: ServerMemoryManager | null = null;

/**
 * Get global server memory manager instance
 */
export function getServerMemoryManager(
  cleanupIntervalMs?: number
): ServerMemoryManager {
  if (!globalManager) {
    globalManager = new ServerMemoryManager(cleanupIntervalMs);
  }
  return globalManager;
}

/**
 * Reset global instance (useful for testing)
 */
export function resetServerMemoryManager(): void {
  if (globalManager) {
    globalManager.destroy();
    globalManager = null;
  }
}

// Re-export types
export type { MemoryEntry, MemoryOptions, MemoryStats } from './types.js';
