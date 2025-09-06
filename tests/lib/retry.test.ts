import { describe, expect, it, vi } from 'vitest';

import { withRetry, DEFAULT_RETRY_CONFIG, DB_RETRY_CONFIG } from '@/lib/retry';

describe('Retry utility', () => {
  describe('withRetry', () => {
    it('returns result on successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('throws last error after all retries exhausted', async () => {
      const lastError = new Error('final failure');
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockRejectedValue(lastError);
      
      await expect(withRetry(operation)).rejects.toThrow('final failure');
      expect(operation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
    });

    it('respects custom retry configuration', async () => {
      const customConfig = {
        maxAttempts: 2,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };
      
      const operation = vi.fn().mockRejectedValue(new Error('always fails'));
      
      await expect(withRetry(operation, customConfig)).rejects.toThrow('always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('handles synchronous errors', async () => {
      const operation = vi.fn(() => {
        throw new Error('sync error');
      });
      
      await expect(withRetry(operation)).rejects.toThrow('sync error');
      expect(operation).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
    });

    it('waits between retries', async () => {
      const startTime = Date.now();
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const config = {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };
      
      await withRetry(operation, config);
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should have waited at least the base delay
      expect(elapsed).toBeGreaterThanOrEqual(config.baseDelayMs);
    });
  });

  describe('DB_RETRY_CONFIG', () => {
    it('has appropriate database-specific settings', () => {
      expect(DB_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DB_RETRY_CONFIG.baseDelayMs).toBe(500);
      expect(DB_RETRY_CONFIG.maxDelayMs).toBe(5000);
      expect(DB_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });
  });
});