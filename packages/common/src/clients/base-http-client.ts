/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logger interface compatible with NestJS Logger
 */
export interface HttpClientLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  log(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Configuration options for BaseHttpClient
 */
export interface HttpClientOptions {
  /** Base URL for the service */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Internal API key for service-to-service authentication */
  internalApiKey?: string;
  /** Number of retry attempts (default: 0 = no retries) */
  retryAttempts?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Logger instance */
  logger?: HttpClientLogger;
}

/**
 * Default timeout for HTTP requests in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Default retry delay in milliseconds
 */
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * No-op fallback logger.
 *
 * Concrete implementations should always provide a real logger (e.g., NestJS Logger).
 * This fallback silently discards messages to avoid unexpected console output.
 */
const noopLogger: HttpClientLogger = {
  debug: () => {},
  log: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Base HTTP client for service-to-service communication.
 *
 * @remarks
 * Provides common patterns for HTTP requests between microservices:
 * - Timeout handling with AbortController
 * - Fire-and-forget error handling (returns null/default instead of throwing)
 * - Internal API key authentication
 * - Optional retry logic with configurable attempts and delays
 * - Consistent logging patterns
 *
 * @example
 * ```typescript
 * class UserServiceClient extends BaseHttpClient {
 *   constructor(configService: ConfigService) {
 *     super({
 *       baseUrl: getServiceUrl('USER_SERVICE'),
 *       timeoutMs: 5000,
 *       internalApiKey: configService.get('INTERNAL_API_KEY'),
 *       retryAttempts: 2,
 *       logger: new Logger(UserServiceClient.name),
 *     });
 *   }
 *
 *   async getUser(id: string): Promise<User | null> {
 *     return this.get<User>(`/users/${id}`);
 *   }
 *
 *   async createUser(data: CreateUserDto): Promise<User | null> {
 *     return this.post<User>('/users', data);
 *   }
 * }
 * ```
 */
export abstract class BaseHttpClient {
  protected readonly baseUrl: string;
  protected readonly timeoutMs: number;
  protected readonly internalApiKey?: string;
  protected readonly retryAttempts: number;
  protected readonly retryDelayMs: number;
  protected readonly logger: HttpClientLogger;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.internalApiKey = options.internalApiKey;
    this.retryAttempts = options.retryAttempts ?? 0;
    this.retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.logger = options.logger ?? noopLogger;
  }

  /**
   * Build headers for HTTP requests.
   *
   * @param additionalHeaders - Additional headers to include
   * @returns Headers object with Content-Type and optional Authorization
   */
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    if (this.internalApiKey) {
      headers['Authorization'] = `ApiKey ${this.internalApiKey}`;
    }

    return headers;
  }

  /**
   * Execute fetch with timeout using AbortController.
   *
   * @param url - Full URL to fetch
   * @param options - Fetch options
   * @returns Response object
   * @throws Error if request times out or fails
   */
  protected async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep for the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute a request with optional retry logic.
   *
   * @param method - HTTP method
   * @param path - URL path (appended to baseUrl)
   * @param body - Optional request body
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.buildHeaders(additionalHeaders),
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;
    const maxAttempts = this.retryAttempts + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);

        if (!response.ok) {
          this.logger.warn(`${method} ${path} failed: ${response.status} ${response.statusText}`, {
            attempt,
            maxAttempts,
          });

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return null;
          }

          // Retry server errors (5xx) if attempts remain
          if (attempt < maxAttempts) {
            await this.sleep(this.retryDelayMs);
            continue;
          }

          return null;
        }

        // Handle empty responses (204 No Content)
        const contentLength = response.headers.get('content-length');
        if (response.status === 204 || contentLength === '0') {
          return null;
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;

        if (lastError.name === 'AbortError') {
          this.logger.warn(`${method} ${path} timed out`, { attempt, maxAttempts });
        } else {
          this.logger.warn(`${method} ${path} error: ${lastError.message}`, {
            attempt,
            maxAttempts,
          });
        }

        // Retry if attempts remain
        if (attempt < maxAttempts) {
          await this.sleep(this.retryDelayMs);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Execute a GET request.
   *
   * @param path - URL path (appended to baseUrl)
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async get<T>(
    path: string,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    return this.request<T>('GET', path, undefined, additionalHeaders);
  }

  /**
   * Execute a POST request.
   *
   * @param path - URL path (appended to baseUrl)
   * @param body - Request body
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async post<T>(
    path: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    return this.request<T>('POST', path, body, additionalHeaders);
  }

  /**
   * Execute a PUT request.
   *
   * @param path - URL path (appended to baseUrl)
   * @param body - Request body
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async put<T>(
    path: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    return this.request<T>('PUT', path, body, additionalHeaders);
  }

  /**
   * Execute a PATCH request.
   *
   * @param path - URL path (appended to baseUrl)
   * @param body - Request body
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async patch<T>(
    path: string,
    body?: unknown,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    return this.request<T>('PATCH', path, body, additionalHeaders);
  }

  /**
   * Execute a DELETE request.
   *
   * @param path - URL path (appended to baseUrl)
   * @param additionalHeaders - Optional additional headers
   * @returns Parsed JSON response or null on error
   */
  protected async delete<T>(
    path: string,
    additionalHeaders?: Record<string, string>,
  ): Promise<T | null> {
    return this.request<T>('DELETE', path, undefined, additionalHeaders);
  }

  /**
   * Execute a fire-and-forget POST request.
   *
   * Logs result but never throws. Use for non-critical operations
   * where failure shouldn't block the calling operation.
   *
   * @param path - URL path (appended to baseUrl)
   * @param body - Request body
   * @param context - Optional context for logging
   */
  protected async fireAndForget(
    path: string,
    body?: unknown,
    context?: Record<string, unknown>,
  ): Promise<void> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        this.logger.warn(`Fire-and-forget POST ${path} failed: ${response.status}`, context);
      } else {
        this.logger.debug(`Fire-and-forget POST ${path} succeeded`, context);
      }
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        this.logger.warn(`Fire-and-forget POST ${path} timed out`, context);
      } else {
        this.logger.warn(`Fire-and-forget POST ${path} error: ${err.message}`, context);
      }
    }
  }

  /**
   * Execute a required request that throws on failure.
   *
   * Use when the downstream service response is critical and the caller
   * should handle the error explicitly.
   *
   * @param method - HTTP method
   * @param path - URL path (appended to baseUrl)
   * @param body - Optional request body
   * @returns Parsed JSON response
   * @throws ServiceUnavailableError if request fails
   */
  protected async requestRequired<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const result = await this.request<T>(method, path, body);
    if (result === null) {
      throw new ServiceUnavailableError(`${method} ${path} failed`);
    }
    return result;
  }
}

/**
 * Error thrown when a required downstream service is unavailable.
 */
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
