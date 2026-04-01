/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BaseHttpClient,
  ServiceUnavailableError,
  type HttpClientLogger,
} from '../base-http-client.js';

/**
 * Concrete implementation for testing
 */
class TestHttpClient extends BaseHttpClient {
  // Expose protected methods for testing
  public testGet<T>(path: string) {
    return this.get<T>(path);
  }

  public testPost<T>(path: string, body?: unknown) {
    return this.post<T>(path, body);
  }

  public testFireAndForget(path: string, body?: unknown) {
    return this.fireAndForget(path, body);
  }

  public testRequestRequired<T>(method: 'GET' | 'POST', path: string, body?: unknown) {
    return this.requestRequired<T>(method, path, body);
  }
}

/**
 * Create a mock Response object
 */
function createMockResponse(data: unknown, ok = true, status = 200): Partial<Response> {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-length') {
          return data ? JSON.stringify(data).length.toString() : '0';
        }
        return null;
      },
    } as Headers,
    json: () => Promise.resolve(data),
  };
}

/**
 * Create a mock logger
 */
function createMockLogger(): HttpClientLogger {
  return {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('BaseHttpClient', () => {
  let client: TestHttpClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockLogger: HttpClientLogger;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockLogger = createMockLogger();

    client = new TestHttpClient({
      baseUrl: 'http://test-service:3000',
      timeoutMs: 5000,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET requests', () => {
    it('should make GET request and return data', async () => {
      const mockData = { id: '1', name: 'Test' };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await client.testGet<typeof mockData>('/items/1');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-service:3000/items/1',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should return null on non-ok response', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 404));

      const result = await client.testGet('/items/999');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.testGet('/items/1');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('POST requests', () => {
    it('should make POST request with body', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: '2', name: 'New Item' };
      mockFetch.mockResolvedValue(createMockResponse(responseData));

      const result = await client.testPost<typeof responseData>('/items', requestBody);

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-service:3000/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        }),
      );
    });
  });

  describe('timeout handling', () => {
    it('should handle timeout via AbortController', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const result = await client.testGet('/slow-endpoint');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('timed out'),
        expect.any(Object),
      );
    });
  });

  describe('retry logic', () => {
    it('should retry on 5xx errors', async () => {
      const clientWithRetry = new TestHttpClient({
        baseUrl: 'http://test-service:3000',
        retryAttempts: 2,
        retryDelayMs: 10, // Short delay for tests
        logger: mockLogger,
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(null, false, 503))
        .mockResolvedValueOnce(createMockResponse(null, false, 503))
        .mockResolvedValueOnce(createMockResponse({ success: true }));

      const result = await clientWithRetry.testGet<{ success: boolean }>('/flaky-endpoint');

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const clientWithRetry = new TestHttpClient({
        baseUrl: 'http://test-service:3000',
        retryAttempts: 2,
        retryDelayMs: 10,
        logger: mockLogger,
      });

      mockFetch.mockResolvedValue(createMockResponse(null, false, 400));

      const result = await clientWithRetry.testGet('/bad-request');

      expect(result).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('internal API key authentication', () => {
    it('should include Authorization header when API key is set', async () => {
      const clientWithApiKey = new TestHttpClient({
        baseUrl: 'http://test-service:3000',
        internalApiKey: 'test-api-key',
        logger: mockLogger,
      });

      mockFetch.mockResolvedValue(createMockResponse({ data: 'secret' }));

      await clientWithApiKey.testGet('/internal/data');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'ApiKey test-api-key',
          }),
        }),
      );
    });
  });

  describe('fireAndForget', () => {
    it('should log success on ok response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ queued: true }));

      await client.testFireAndForget('/queue', { task: 'process' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('succeeded'),
        undefined,
      );
    });

    it('should log warning on failure but not throw', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 500));

      // Should not throw
      await client.testFireAndForget('/queue', { task: 'process' });

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('failed'), undefined);
    });
  });

  describe('requestRequired', () => {
    it('should return data on success', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ id: '1' }));

      const result = await client.testRequestRequired<{ id: string }>('GET', '/items/1');

      expect(result).toEqual({ id: '1' });
    });

    it('should throw ServiceUnavailableError on failure', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 500));

      await expect(client.testRequestRequired('GET', '/items/1')).rejects.toThrow(
        ServiceUnavailableError,
      );
    });
  });

  describe('204 No Content handling', () => {
    it('should return null for 204 responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        headers: {
          get: () => '0',
        } as Headers,
        json: () => Promise.reject(new Error('No content')),
      });

      const result = await client.testGet('/items/1/delete');

      expect(result).toBeNull();
    });
  });
});
