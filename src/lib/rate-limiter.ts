/**
 * Simple in-memory rate limiter for leaderboard submissions
 * In production, consider using Redis or similar persistent storage
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Rate limiter configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Maximum submissions per window
  maxRequests: 3,
  // Time window in milliseconds (5 minutes)
  windowMs: 5 * 60 * 1000,
} as const;

/**
 * Check if a request should be rate limited
 * @param identifier - Usually IP address or user identifier
 * @returns Object with allowed status and remaining attempts
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window has expired
    store.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    };
  }

  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  store.set(identifier, entry);

  return {
    allowed: true,
    remaining: RATE_LIMIT_CONFIG.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Clean up expired entries (optional cleanup function)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}
