import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withRateLimit } from '@/lib/rate-limit-middleware';
import { cleanupExpiredEntries, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';

type TestResponse = { success: true; data: string } | { success: false; error: string };

// Mock handler that returns a simple response
const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true, data: 'test' }));

describe('Rate limit middleware', () => {
  beforeEach(() => {
    // Clear the internal store by calling cleanup with expired entries
    vi.setSystemTime(new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs + 1000));
    cleanupExpiredEntries();
    vi.useRealTimers();
    mockHandler.mockClear();
  });

  it('allows requests within rate limit', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler);

    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': 'test-ip' },
    });

    const response = await rateLimitedHandler(request);
    const data = (await response.json()) as TestResponse;

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: 'test' });
    expect(mockHandler).toHaveBeenCalledWith(request);

    // Check rate limit headers
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('blocks requests when rate limit exceeded', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler);
    const ip = 'test-ip-blocked';

    // Use up all allowed requests
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      const request = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      });
      await rateLimitedHandler(request);
    }

    // Next request should be blocked
    const blockedRequest = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    });

    const response = await rateLimitedHandler(blockedRequest);
    const data = (await response.json()) as TestResponse;

    expect(response.status).toBe(429);
    expect(data).toEqual({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
    });

    // Check rate limit headers
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();

    // Handler should not be called for blocked request
    expect(mockHandler).toHaveBeenCalledTimes(RATE_LIMIT_CONFIG.maxRequests);
  });

  it('handles different IP addresses independently', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler);

    // Use up all requests for first IP
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      const request = new Request('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': 'ip1' },
      });
      await rateLimitedHandler(request);
    }

    // First IP should be blocked
    const blockedRequest = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': 'ip1' },
    });
    const blockedResponse = await rateLimitedHandler(blockedRequest);
    expect(blockedResponse.status).toBe(429);

    // Second IP should still be allowed
    const allowedRequest = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': 'ip2' },
    });
    const allowedResponse = await rateLimitedHandler(allowedRequest);
    expect(allowedResponse.status).toBe(200);
  });

  it('uses different header sources for IP detection', async () => {
    const rateLimitedHandler = withRateLimit(mockHandler);

    // Test x-real-ip header
    const request1 = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-real-ip': 'real-ip-test' },
    });

    const response1 = await rateLimitedHandler(request1);
    expect(response1.status).toBe(200);

    // Test fallback to 'unknown' when no IP headers present
    const request2 = new Request('http://localhost:3000/api/test', {
      method: 'POST',
    });

    const response2 = await rateLimitedHandler(request2);
    expect(response2.status).toBe(200);
  });

  it('preserves existing response headers', async () => {
    const handlerWithHeaders = vi.fn(async (_req: Request) => {
      const response = NextResponse.json({ success: true });
      response.headers.set('Custom-Header', 'test-value');
      return Promise.resolve(response);
    });

    const rateLimitedHandler = withRateLimit(handlerWithHeaders);

    const request = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': 'test-ip' },
    });

    const response = await rateLimitedHandler(request);

    // Should have both custom and rate limit headers
    expect(response.headers.get('Custom-Header')).toBe('test-value');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
  });
});
