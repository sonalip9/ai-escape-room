/**
 * Utility for retrying operations with exponential backoff
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt using exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @returns Promise that resolves with the result or rejects after all retries
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      const delay = calculateDelay(attempt, config);
      console.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, error);
      
      await sleep(delay);
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}

/**
 * Retry configuration specifically for database operations
 */
export const DB_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};