/**
 * Workload Manager
 *
 * Manages and prioritizes requests to ensure efficient handling.
 * Provides request queuing, rate limiting, and priority-based execution.
 */

/**
 * Request priority levels
 */
export enum Priority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Queued request
 */
interface QueuedRequest<T = any, R = any> {
  id: string;
  task: () => Promise<R>;
  priority: Priority;
  timestamp: number;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

/**
 * Workload Manager Configuration
 */
export interface WorkloadManagerConfig {
  /** Maximum concurrent requests */
  maxConcurrent?: number;
  /** Rate limit: max requests per window */
  maxRequestsPerWindow?: number;
  /** Rate limit window in milliseconds */
  rateLimitWindow?: number;
}

/**
 * Workload Manager
 */
export class WorkloadManager {
  private queue: QueuedRequest[] = [];
  private running = 0;
  private maxConcurrent: number;
  private requestCounts: number[] = [];
  private maxRequestsPerWindow: number;
  private rateLimitWindow: number;

  constructor(config: WorkloadManagerConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 5;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 100;
    this.rateLimitWindow = config.rateLimitWindow ?? 60000; // 1 minute
  }

  /**
   * Enqueue a request with priority
   */
  async enqueue<T, R>(
    task: () => Promise<R>,
    priority: Priority = Priority.NORMAL
  ): Promise<R> {
    // Check rate limit
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T, R> = {
        id: this.generateId(),
        task,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      // Insert based on priority (higher priority first)
      this.insertByPriority(request);

      // Try to process
      this.process();
    });
  }

  /**
   * Insert request by priority
   */
  private insertByPriority(request: QueuedRequest): void {
    let inserted = false;

    for (let i = 0; i < this.queue.length; i++) {
      if (request.priority > this.queue[i].priority) {
        this.queue.splice(i, 0, request);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.queue.push(request);
    }
  }

  /**
   * Process queued requests
   */
  private async process(): Promise<void> {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.running++;
      this.recordRequest();

      this.executeRequest(request).finally(() => {
        this.running--;
        this.process(); // Try to process next
      });
    }
  }

  /**
   * Execute a request
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    try {
      const result = await request.task();
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Record request for rate limiting
   */
  private recordRequest(): void {
    const now = Date.now();
    this.requestCounts.push(now);

    // Clean up old entries
    this.requestCounts = this.requestCounts.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    const recentRequests = this.requestCounts.filter(
      timestamp => now - timestamp < this.rateLimitWindow
    );

    return recentRequests.length >= this.maxRequestsPerWindow;
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queued: this.queue.length,
      running: this.running,
      rateLimitRemaining: Math.max(
        0,
        this.maxRequestsPerWindow - this.requestCounts.length
      ),
      maxConcurrent: this.maxConcurrent
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    for (const request of this.queue) {
      request.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// Export singleton instance
let globalManager: WorkloadManager | null = null;

/**
 * Get global workload manager instance
 */
export function getWorkloadManager(config?: WorkloadManagerConfig): WorkloadManager {
  if (!globalManager) {
    globalManager = new WorkloadManager(config);
  }
  return globalManager;
}
