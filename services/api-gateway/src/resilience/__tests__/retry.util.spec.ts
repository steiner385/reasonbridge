import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableHttpError } from '../retry.util.js';

describe('retry.util', () => {
  describe('isRetryableHttpError', () => {
    it('should return true for 5xx server errors', () => {
      const error = { response: { status: 500 } };
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      const error = { response: { status: 503 } };
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for 408 Request Timeout', () => {
      const error = { response: { status: 408 } };
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for 429 Too Many Requests', () => {
      const error = { response: { status: 429 } };
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return false for 4xx client errors', () => {
      const error = { response: { status: 400 } };
      expect(isRetryableHttpError(error)).toBe(false);
    });

    it('should return false for 404 Not Found', () => {
      const error = { response: { status: 404 } };
      expect(isRetryableHttpError(error)).toBe(false);
    });

    it('should return true for network errors', () => {
      const error = new Error('ECONNREFUSED');
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const error = new Error('ETIMEDOUT');
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for connection reset', () => {
      const error = new Error('ECONNRESET');
      expect(isRetryableHttpError(error)).toBe(true);
    });

    it('should return true for timeout message', () => {
      const error = new Error('Request timeout');
      expect(isRetryableHttpError(error)).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxAttempts: 3,
        isRetryable: isRetryableHttpError,
        initialDelay: 1, // Use minimal delay for tests
        jitter: false,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately for non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ response: { status: 404 } });

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          isRetryable: isRetryableHttpError,
        }),
      ).rejects.toEqual({ response: { status: 404 } });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust all retries and throw', async () => {
      const error = new Error('ETIMEDOUT');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          isRetryable: isRetryableHttpError,
          initialDelay: 1, // Use minimal delay for tests
          jitter: false,
        }),
      ).rejects.toThrow('ETIMEDOUT');

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use default config when none provided', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const startTime = Date.now();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce('success');

      await withRetry(fn, {
        maxAttempts: 3,
        isRetryable: isRetryableHttpError,
        initialDelay: 10, // 10ms
        backoffFactor: 2,
        jitter: false,
      });

      const duration = Date.now() - startTime;
      // First retry: 10ms, second retry: 20ms = 30ms minimum
      expect(duration).toBeGreaterThanOrEqual(25); // Allow some margin
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
