import { NextResponse } from 'next/server';

import { checkRateLimit, RATE_LIMIT_CONFIG } from './rate-limiter';

/**
 * Rate limiting middleware for API endpoints
 * Extracts client IP and applies rate limiting using the existing rate limiter
 */
export function withRateLimit<T>(
  handler: (req: Request) => Promise<NextResponse<T>>,
): (req: Request) => Promise<NextResponse<T>> {
  return async (req: Request): Promise<NextResponse<T>> => {
    // Get client IP for rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          },
        },
      ) as NextResponse<T>;
    }

    // Add rate limit headers to successful responses
    const response = await handler(req);
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    return response;
  };
}
