import { Logger } from '@nestjs/common';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Exponential backoff factor */
  backoffFactor?: number;
  /** Add random jitter to prevent thundering herd */
  jitter?: boolean;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffFactor: 2,
  jitter: true,
  isRetryable: () => true,
};

const logger = new Logger('RetryUtil');

/**
 * Determine if an HTTP error is retryable
 * Only retry on transient failures (5xx, network errors)
 */
export function isRetryableHttpError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof Error) {
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'];
    if (networkErrors.some((code) => error.message.includes(code))) {
      return true;
    }
  }

  // Check for HTTP status codes
  const statusCode = getErrorStatusCode(error);
  if (statusCode !== null) {
    // 5xx errors are server errors - retryable
    // 408 Request Timeout - retryable
    // 429 Too Many Requests - retryable (with backoff)
    return statusCode >= 500 || statusCode === 408 || statusCode === 429;
  }

  // Timeout errors are retryable
  if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Extract HTTP status code from various error types
 */
function getErrorStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;

  // Axios error structure
  const axiosError = error as { response?: { status?: number } };
  if (axiosError.response?.status) {
    return axiosError.response.status;
  }

  // NestJS HttpException structure
  const httpException = error as { status?: number; getStatus?: () => number };
  if (httpException.status) return httpException.status;
  if (typeof httpException.getStatus === 'function') {
    return httpException.getStatus();
  }

  return null;
}

/**
 * Calculate delay for next retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
  const delay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter ±25%
    const jitterRange = delay * 0.25;
    return delay + (Math.random() * jitterRange * 2 - jitterRange);
  }

  return delay;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic and exponential backoff
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => httpService.get('/api/data'),
 *   {
 *     maxAttempts: 3,
 *     isRetryable: isRetryableHttpError,
 *   }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const resolvedConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= resolvedConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === resolvedConfig.maxAttempts) {
        logger.warn(`All ${resolvedConfig.maxAttempts} retry attempts exhausted`);
        throw error;
      }

      if (!resolvedConfig.isRetryable(error)) {
        logger.debug(`Error is not retryable, throwing immediately`);
        throw error;
      }

      const delay = calculateDelay(attempt, resolvedConfig);
      logger.warn(
        `Attempt ${attempt}/${resolvedConfig.maxAttempts} failed, retrying in ${Math.round(delay)}ms`,
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
