/**
 * Unit tests for Workload Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkloadManager, Priority } from './index.js';

describe('Workload Manager', () => {
  let manager: WorkloadManager;

  beforeEach(() => {
    manager = new WorkloadManager({ maxConcurrent: 2, maxRequestsPerWindow: 10 });
  });

  describe('enqueue', () => {
    it('should execute task successfully', async () => {
      const result = await manager.enqueue(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should handle task errors', async () => {
      await expect(
        manager.enqueue(() => Promise.reject(new Error('task failed')))
      ).rejects.toThrow('task failed');
    });
  });

  describe('priority handling', () => {
    it('should execute high priority tasks first', async () => {
      const results: number[] = [];

      // Enqueue low priority
      manager.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(1);
        return 1;
      }, Priority.LOW);

      // Enqueue high priority
      manager.enqueue(async () => {
        results.push(2);
        return 2;
      }, Priority.HIGH);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      // High priority (2) should execute before low priority (1) completes
      expect(results[0]).toBe(2);
    });
  });

  describe('concurrency control', () => {
    it('should limit concurrent executions', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return 'done';
      };

      // Enqueue 5 tasks
      const promises = Array.from({ length: 5 }, () => manager.enqueue(task));

      await Promise.all(promises);

      // Should not exceed max concurrent (2)
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      const limitedManager = new WorkloadManager({
        maxRequestsPerWindow: 3,
        rateLimitWindow: 1000
      });

      // Execute 3 requests (should succeed)
      await limitedManager.enqueue(() => Promise.resolve(1));
      await limitedManager.enqueue(() => Promise.resolve(2));
      await limitedManager.enqueue(() => Promise.resolve(3));

      // 4th request should be rate limited
      await expect(
        limitedManager.enqueue(() => Promise.resolve(4))
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = manager.getStats();

      expect(stats).toHaveProperty('queued');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('rateLimitRemaining');
      expect(stats).toHaveProperty('maxConcurrent');
      expect(stats.maxConcurrent).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear queue and reject pending requests', async () => {
      // Fill up concurrent slots
      manager.enqueue(() => new Promise(resolve => setTimeout(resolve, 1000)));
      manager.enqueue(() => new Promise(resolve => setTimeout(resolve, 1000)));

      // This task will be queued (since maxConcurrent is 2)
      const promise = manager.enqueue(() => Promise.resolve('should fail'));

      // Give time for queue to fill
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear queue
      manager.clear();

      // Queued task should be rejected
      await expect(promise).rejects.toThrow('Queue cleared');
    });
  });
});
