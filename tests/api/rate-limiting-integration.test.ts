import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetLeaderboardResponse } from '@/app/api/leaderboard/route';
import type { PostPuzzleResponse } from '@/app/api/puzzle/route';
import type { PostValidateResponse } from '@/app/api/validate/route';
import { cleanupExpiredEntries, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';

// Mock dependencies
vi.mock('@/services/leaderboard', () => ({
  addLeaderboardEntry: vi.fn().mockResolvedValue(true),
  loadLeaderboard: vi.fn().mockResolvedValue({ total: 0, data: [] }),
}));

vi.mock('@/services/puzzles', () => ({
  getPuzzleFromId: vi.fn().mockResolvedValue(null),
  getRandomPuzzleFromDB: vi.fn().mockResolvedValue(null),
  saveAIPuzzle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/puzzles', () => ({
  fallbackPuzzles: [
    { id: 'test', type: 'riddle', question: 'Test puzzle', normalized_answers: ['answer'] },
  ],
  localValidate: vi.fn().mockReturnValue(true),
  getRandomPuzzleType: vi.fn().mockReturnValue('riddle'),
  pickRandom: vi.fn().mockReturnValue([{ id: 'test', type: 'riddle', question: 'Test puzzle' }]),
}));

describe('Rate limiting integration across all API endpoints', () => {
  beforeEach(() => {
    // Clear rate limiter state
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
    cleanupExpiredEntries();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('/api/leaderboard', () => {
    it('applies rate limiting to GET endpoint', async () => {
      const { GET } = await import('@/app/api/leaderboard/route');
      const ip = 'test-leaderboard-get';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        const request = new Request('http://localhost:3000/api/leaderboard', {
          method: 'GET',
          headers: { 'x-forwarded-for': ip },
        });
        const response = await GET(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(
          (RATE_LIMIT_CONFIG.maxRequests - i - 1).toString(),
        );
      }

      // Next request should be rate limited
      const limitedRequest = new Request('http://localhost:3000/api/leaderboard', {
        method: 'GET',
        headers: { 'x-forwarded-for': ip },
      });
      const limitedResponse = await GET(limitedRequest);
      expect(limitedResponse.status).toBe(429);

      const data = (await limitedResponse.json()) as GetLeaderboardResponse;
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });
    });

    it('applies rate limiting to POST endpoint', async () => {
      const { POST } = await import('@/app/api/leaderboard/route');
      const ip = 'test-leaderboard-post';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        const request = new Request('http://localhost:3000/api/leaderboard', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
          body: JSON.stringify({ name: 'Test', time_seconds: 10 }),
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(
          (RATE_LIMIT_CONFIG.maxRequests - i - 1).toString(),
        );
      }

      // Next request should be rate limited
      const limitedRequest = new Request('http://localhost:3000/api/leaderboard', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify({ name: 'Test', time_seconds: 10 }),
      });
      const limitedResponse = await POST(limitedRequest);
      expect(limitedResponse.status).toBe(429);
    });
  });

  describe('/api/validate', () => {
    it('applies rate limiting to POST endpoint', async () => {
      const { POST } = await import('@/app/api/validate/route');
      const ip = 'test-validate';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        const request = new Request('http://localhost:3000/api/validate', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
          body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(
          (RATE_LIMIT_CONFIG.maxRequests - i - 1).toString(),
        );
      }

      // Next request should be rate limited
      const limitedRequest = new Request('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
      });
      const limitedResponse = await POST(limitedRequest);
      expect(limitedResponse.status).toBe(429);

      const data = (await limitedResponse.json()) as PostValidateResponse;
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });
    });
  });

  describe('/api/puzzle', () => {
    it('applies rate limiting to POST endpoint', async () => {
      const { POST } = await import('@/app/api/puzzle/route');
      const ip = 'test-puzzle';

      // Make requests up to the limit
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        const request = new Request('http://localhost:3000/api/puzzle', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
          body: JSON.stringify({ count: 1 }),
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(
          (RATE_LIMIT_CONFIG.maxRequests - i - 1).toString(),
        );
      }

      // Next request should be rate limited
      const limitedRequest = new Request('http://localhost:3000/api/puzzle', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
        body: JSON.stringify({ count: 1 }),
      });
      const limitedResponse = await POST(limitedRequest);
      expect(limitedResponse.status).toBe(429);

      const data = (await limitedResponse.json()) as PostPuzzleResponse;
      expect(data).toEqual({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });
    });
  });

  describe('Per-IP isolation', () => {
    it('rate limits different IPs independently', async () => {
      const { POST: validatePOST } = await import('@/app/api/validate/route');

      // Use up all requests for first IP
      for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
        const request = new Request('http://localhost:3000/api/validate', {
          method: 'POST',
          headers: { 'x-forwarded-for': 'ip1' },
          body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
        });
        await validatePOST(request);
      }

      // First IP should be blocked
      const blockedRequest = new Request('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: { 'x-forwarded-for': 'ip1' },
        body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
      });
      const blockedResponse = await validatePOST(blockedRequest);
      expect(blockedResponse.status).toBe(429);

      // Second IP should still be allowed
      const allowedRequest = new Request('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: { 'x-forwarded-for': 'ip2' },
        body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
      });
      const allowedResponse = await validatePOST(allowedRequest);
      expect(allowedResponse.status).toBe(200);
    });
  });

  describe('Rate limit headers', () => {
    it('includes proper rate limit headers in all responses', async () => {
      const { POST } = await import('@/app/api/validate/route');

      const request = new Request('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: { 'x-forwarded-for': 'test-headers' },
        body: JSON.stringify({ puzzleId: 'test', answer: 'answer' }),
      });

      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Limit')).toBe(
        RATE_LIMIT_CONFIG.maxRequests.toString(),
      );
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('2'); // First request, 2 remaining
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();

      // Verify reset time is a valid ISO date
      const resetTime = response.headers.get('X-RateLimit-Reset');
      expect(resetTime).toBeTypeOf('string');
      if (resetTime !== null) expect(() => new Date(resetTime)).not.toThrow();
    });
  });
});
