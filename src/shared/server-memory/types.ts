/**
 * Server Memory Types
 */

/**
 * Memory entry
 */
export interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

/**
 * Memory options
 */
export interface MemoryOptions {
  /** Time to live in milliseconds */
  ttl?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Memory stats
 */
export interface MemoryStats {
  /** Total entries */
  total: number;
  /** Expired entries */
  expired: number;
  /** Active entries */
  active: number;
  /** Memory size estimate (bytes) */
  size: number;
}
