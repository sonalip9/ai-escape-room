import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit, cleanupExpiredEntries, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';

describe('Rate limiter', () => {
  beforeEach(() => {
    // Clear the internal store by calling cleanup with expired entries
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
    cleanupExpiredEntries();
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('allows first request', () => {
      const result = checkRateLimit('test-ip');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_CONFIG.maxRequests - 1);
    });

    it('tracks multiple requests from same IP', () => {
      const ip = 'test-ip-2';
      
      // First request
      const result1 = checkRateLimit(ip);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      // Second request
      const result2 = checkRateLimit(ip);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      // Third request
      const result3 = checkRateLimit(ip);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);

      // Fourth request should be blocked
      const result4 = checkRateLimit(ip);
      expect(result4.allowed).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('handles different IPs independently', () => {
      // Use up all requests for first IP
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        checkRateLimit('ip1');
      }
      
      // First IP should be blocked
      const blockedResult = checkRateLimit('ip1');
      expect(blockedResult.allowed).toBe(false);

      // Second IP should still be allowed
      const allowedResult = checkRateLimit('ip2');
      expect(allowedResult.allowed).toBe(true);
    });

    it('resets after time window expires', () => {
      const ip = 'test-ip-reset';
      
      // Use up all requests
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        checkRateLimit(ip);
      }
      
      // Should be blocked
      const blockedResult = checkRateLimit(ip);
      expect(blockedResult.allowed).toBe(false);

      // Fast forward time past the window
      vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
      
      // Should be allowed again
      const allowedResult = checkRateLimit(ip);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBe(RATE_LIMIT_CONFIG.maxRequests - 1);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('removes expired entries', () => {
      const ip = 'cleanup-test';
      
      // Make a request
      checkRateLimit(ip);
      
      // Fast forward time
      vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
      
      // Clean up
      cleanupExpiredEntries();
      
      // Should be like a fresh request
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_CONFIG.maxRequests - 1);
    });
  });
});