/**
 * API Client Wrapper with Authentication
 *
 * Provides a centralized HTTP client for making authenticated requests
 * to the backend API Gateway.
 */

/**
 * API configuration
 */
const API_BASE_URL = import.meta.env['VITE_API_BASE_URL'] || '/api';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Token storage interface
 */
interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

/**
 * Default token storage using localStorage
 */
const defaultTokenStorage: TokenStorage = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => localStorage.setItem('auth_token', token),
  clearToken: () => localStorage.removeItem('auth_token'),
};

/**
 * API Client configuration options
 */
export interface ApiClientConfig {
  baseURL?: string;
  tokenStorage?: TokenStorage;
}

/**
 * Request options for API calls
 */
export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  skipAuth?: boolean;
}

/**
 * API Client class with authentication support
 */
export class ApiClient {
  private baseURL: string;
  private tokenStorage: TokenStorage;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || API_BASE_URL;
    this.tokenStorage = config.tokenStorage || defaultTokenStorage;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    // Build absolute URL from baseURL and endpoint
    // Handle both absolute baseURLs (http://...) and relative (/api)
    let fullUrl: string;

    if (this.baseURL.startsWith('http')) {
      // Absolute baseURL - concatenate paths properly
      // Remove trailing slash from base and leading slash from endpoint
      const base = this.baseURL.replace(/\/$/, '');
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      fullUrl = `${base}${path}`;
    } else {
      // Relative baseURL - prepend origin and concatenate paths
      // Remove trailing slash from baseURL and leading slash from endpoint to avoid double slashes
      const base = this.baseURL.replace(/\/$/, '');
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      fullUrl = `${window.location.origin}${base}${path}`;
    }

    // Use URL to add query parameters
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(options: ApiRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers);
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // Add auth token if available and not explicitly skipped
    if (!options.skipAuth) {
      const token = this.tokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Process response and handle errors
   */
  private async processResponse<T>(response: Response): Promise<T> {
    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: unknown;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.statusText}`, response.status, data);
    }

    return data as T;
  }

  /**
   * Make an HTTP request
   */
  async request<T = unknown>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { params, skipAuth, ...fetchOptions } = options;

    const url = this.buildURL(endpoint, params);
    const headers = this.buildHeaders(options);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      return await this.processResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network errors or other fetch failures
      throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.tokenStorage.setToken(token);
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    return this.tokenStorage.getToken();
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.tokenStorage.clearToken();
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();
