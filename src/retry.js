/**
 * Retry utilities with exponential backoff for transient failures.
 */

import { TimeoutError, NetworkError, DNSError, ConnectionRefusedError, ServerError } from './errors.js';

/**
 * Sleep for a specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay.
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelayMs - Base delay in milliseconds
 * @param {number} maxDelayMs - Maximum delay in milliseconds
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoff(attempt, baseDelayMs = 1000, maxDelayMs = 10000) {
  const delay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * (0.75 + Math.random() * 0.5);
  return Math.min(jitter, maxDelayMs);
}

/**
 * Check if an error is retryable.
 * @param {Error} error - Error to check
 * @returns {boolean} - True if retryable
 */
function isRetryableError(error) {
  // Timeout errors - retryable
  if (error instanceof TimeoutError) return true;

  // DNS errors - retryable (DNS might be temporarily down)
  if (error instanceof DNSError) return true;

  // Connection refused - retryable (server might be restarting)
  if (error instanceof ConnectionRefusedError) return true;

  // Network errors - retryable
  if (error instanceof NetworkError) return true;

  // 5xx server errors - retryable
  if (error instanceof ServerError && error.statusCode >= 500) return true;

  return false;
}

/**
 * Get retry configuration for a specific error type.
 * @param {Error} error - Error to get config for
 * @returns {{maxRetries: number, baseDelayMs: number}} - Retry config
 */
function getRetryConfig(error) {
  // Network timeouts: 3 retries with exponential backoff
  if (error instanceof TimeoutError) {
    return { maxRetries: 3, baseDelayMs: 1000 };
  }

  // DNS failures: 3 retries (DNS propagation can take time)
  if (error instanceof DNSError) {
    return { maxRetries: 3, baseDelayMs: 2000 };
  }

  // Connection refused: 2 retries (server might be restarting)
  if (error instanceof ConnectionRefusedError) {
    return { maxRetries: 2, baseDelayMs: 1500 };
  }

  // 5xx server errors: 2 retries
  if (error instanceof ServerError && error.statusCode >= 500) {
    return { maxRetries: 2, baseDelayMs: 1000 };
  }

  // Generic network errors: 2 retries
  if (error instanceof NetworkError) {
    return { maxRetries: 2, baseDelayMs: 1000 };
  }

  // Default: no retries
  return { maxRetries: 0, baseDelayMs: 0 };
}

/**
 * Retry an async operation with exponential backoff.
 * @template T
 * @param {() => Promise<T>} operation - Async operation to retry
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelayMs=1000] - Base delay between retries
 * @param {number} [options.maxDelayMs=10000] - Maximum delay between retries
 * @param {(error: Error) => boolean} [options.shouldRetry] - Custom retry predicate
 * @param {(error: Error, attempt: number) => void} [options.onRetry] - Callback on retry
 * @returns {Promise<T>} - Result of operation
 * @throws {Error} - Last error if all retries fail
 */
export async function withRetry(
  operation,
  { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 10000, shouldRetry = isRetryableError, onRetry = null } = {},
) {
  let lastError;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const canRetry = attempt < maxRetries && shouldRetry(error);

      if (!canRetry) {
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, baseDelayMs, maxDelayMs);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1);
      }

      // Wait before retrying
      await sleep(delay);

      attempt++;
    }
  }

  throw lastError;
}

/**
 * Retry with automatic configuration based on error type.
 * @template T
 * @param {() => Promise<T>} operation - Async operation to retry
 * @param {Object} options - Options
 * @param {(error: Error, attempt: number) => void} [options.onRetry] - Callback on retry
 * @returns {Promise<T>} - Result of operation
 */
export async function withAutoRetry(operation, { onRetry = null } = {}) {
  let config;

  try {
    return await operation();
  } catch (error) {
    config = getRetryConfig(error);

    // If not retryable, throw immediately
    if (config.maxRetries === 0) {
      throw error;
    }
  }

  // Retry with configured parameters
  return withRetry(operation, {
    maxRetries: config.maxRetries,
    baseDelayMs: config.baseDelayMs,
    shouldRetry: isRetryableError,
    onRetry,
  });
}

/**
 * Create a retryable version of an async function.
 * @template T
 * @param {(...args: any[]) => Promise<T>} fn - Function to wrap
 * @param {Object} options - Retry options
 * @returns {(...args: any[]) => Promise<T>} - Retryable function
 */
export function retryable(fn, options = {}) {
  return async (...args) => {
    return withRetry(() => fn(...args), options);
  };
}

/**
 * Execute multiple operations in parallel with retries.
 * @template T
 * @param {Array<() => Promise<T>>} operations - Operations to execute
 * @param {Object} options - Retry options
 * @returns {Promise<Array<T>>} - Results of all operations
 */
export async function retryAll(operations, options = {}) {
  return Promise.all(operations.map((op) => withRetry(op, options)));
}
