/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication service for user signup, login, and OAuth flows
 *
 * All auth requests are routed through the shared {@link apiClient}, so they use
 * the same single base-URL env var (VITE_API_BASE_URL, default '/api') and typed
 * ApiError semantics as the rest of the app. Previously this service used a
 * second client driven by VITE_API_URL with a hardcoded http://localhost:3000
 * default, which silently broke login/signup/verify/reset in any deployment
 * configured only from .env.example (see issue #1334).
 */

import { apiClient, ApiError } from '../lib/api';

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
  referralSource?: string;
  visitorSessionId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    authMethod: string;
    createdAt: string;
  };
  onboardingProgress: {
    currentStep: string;
    emailVerified: boolean;
    topicsSelected: boolean;
    orientationViewed: boolean;
    firstPostMade: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/** Build an Error that carries an HTTP status and preserves the original cause. */
function makeAuthError(message: string, cause: unknown, status?: number): Error {
  const error = new Error(message) as Error & { status?: number; cause?: unknown };
  if (status !== undefined) {
    error.status = status;
  }
  error.cause = cause;
  return error;
}

/**
 * Normalize an apiClient failure into a plain Error that preserves the backend's
 * message and (where available) HTTP status, keeping the previous throwing
 * behaviour for existing callers while using the shared client under the hood.
 */
function toAuthError(err: unknown, fallback: string): Error {
  if (err instanceof ApiError) {
    const data = err.data as Partial<ErrorResponse> | null | undefined;
    const message = data && typeof data === 'object' ? data.message : undefined;
    return makeAuthError(message || err.message || fallback, err, err.status);
  }
  return err instanceof Error ? err : new Error(fallback);
}

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const result = await apiClient.post<AuthResponse>('/auth/signup', data, { skipAuth: true });
      this.storeTokens(result.accessToken, result.refreshToken);
      return result;
    } catch (err) {
      throw toAuthError(err, 'Signup failed');
    }
  }

  /**
   * Log in an existing user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const result = await apiClient.post<AuthResponse>('/auth/login', data, { skipAuth: true });
      this.storeTokens(result.accessToken, result.refreshToken);
      return result;
    } catch (err) {
      throw toAuthError(err, 'Login failed');
    }
  }

  /**
   * Request a password reset code
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      return await apiClient.post<{ message: string }>(
        '/auth/forgot-password',
        { email },
        { skipAuth: true },
      );
    } catch (err) {
      throw toAuthError(err, 'Failed to request password reset');
    }
  }

  /**
   * Reset password with verification code
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      return await apiClient.post<{ message: string }>(
        '/auth/reset-password',
        { email, code, newPassword },
        { skipAuth: true },
      );
    } catch (err) {
      throw toAuthError(err, 'Failed to reset password');
    }
  }

  /**
   * Get the pending verification email from localStorage
   */
  getPendingVerificationEmail(): string | null {
    return localStorage.getItem('pendingVerificationEmail');
  }

  /**
   * Clear the pending verification email from localStorage
   */
  clearPendingVerificationEmail(): void {
    localStorage.removeItem('pendingVerificationEmail');
  }

  /**
   * Verify email with 6-digit code
   */
  async verifyEmail(code: string): Promise<AuthResponse> {
    const email = this.getPendingVerificationEmail();
    if (!email) {
      throw new Error('No pending verification email found. Please sign up again.');
    }

    try {
      const result = await apiClient.post<AuthResponse>('/auth/verify-email', { email, code });

      // Clear pending email on success
      this.clearPendingVerificationEmail();

      return result;
    } catch (err) {
      throw toAuthError(err, 'Email verification failed');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<{ message: string }> {
    const email = this.getPendingVerificationEmail();
    if (!email) {
      throw new Error('No pending verification email found. Please sign up again.');
    }

    try {
      return await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
    } catch (err) {
      // Handle rate limiting specifically (force a friendly message regardless
      // of the backend body, while still preserving the original error as cause)
      if (err instanceof ApiError && err.status === 429) {
        throw makeAuthError('Too many requests. Please try again later.', err, err.status);
      }
      throw toAuthError(err, 'Failed to resend verification email');
    }
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(provider: 'google' | 'apple'): Promise<{ authUrl: string; state: string }> {
    try {
      return await apiClient.post<{ authUrl: string; state: string }>(
        '/auth/oauth/initiate',
        { provider },
        { skipAuth: true },
      );
    } catch (err) {
      throw toAuthError(err, 'Failed to initiate OAuth');
    }
  }

  /**
   * Log out the current user
   * Clears tokens from both localStorage and sessionStorage
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
  }

  /**
   * Get the current auth token
   * Checks both localStorage (remember me) and sessionStorage (current session only)
   */
  getAuthToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Store access and refresh tokens
   * Uses localStorage by default (for backward compatibility)
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Move tokens from localStorage to sessionStorage
   * Used when user logs in without "Remember Me"
   */
  moveTokensToSessionStorage(): void {
    const authToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (authToken && refreshToken) {
      sessionStorage.setItem('authToken', authToken);
      sessionStorage.setItem('refreshToken', refreshToken);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  }

  /**
   * Enforce session-only storage for minor users (COPPA/GDPR-K compliance)
   *
   * Moves any tokens from localStorage to sessionStorage to ensure:
   * - Tokens don't persist across browser sessions
   * - Minor users must re-authenticate on each session
   * - No persistent tracking data is stored
   *
   * @param isMinor - Whether the user is a minor
   */
  enforceSessionOnlyForMinor(isMinor: boolean): void {
    if (!isMinor) {
      return; // Adult users can use persistent storage
    }

    // Check if tokens are in localStorage (persistent) and move to sessionStorage
    const authToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (authToken || refreshToken) {
      // Move to session-only storage
      if (authToken) {
        sessionStorage.setItem('authToken', authToken);
        localStorage.removeItem('authToken');
      }
      if (refreshToken) {
        sessionStorage.setItem('refreshToken', refreshToken);
        localStorage.removeItem('refreshToken');
      }
    }
  }

  /**
   * Get the refresh token
   * Checks both localStorage and sessionStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }

  /**
   * Get authorization header for API calls
   */
  getAuthHeader(): { Authorization: string } | Record<string, never> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Make an authenticated API request with automatic token inclusion
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Attempt to refresh token
      const refreshed = await this.refreshAccessTokenInternal();
      if (refreshed) {
        // Retry request with new token
        const newHeaders = {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        };

        return fetch(url, {
          ...options,
          headers: newHeaders,
        });
      } else {
        // Refresh failed, logout user
        this.logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  }

  /**
   * Refresh the access token using the refresh token
   * Public method for explicit token refresh (e.g., session continuation)
   * @returns true if refresh succeeded, false otherwise
   */
  async refreshToken(): Promise<boolean> {
    return this.refreshAccessTokenInternal();
  }

  /**
   * Internal method to refresh the access token using the refresh token
   */
  private async refreshAccessTokenInternal(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const result = await apiClient.post<AuthResponse>(
        '/auth/refresh',
        { refreshToken },
        { skipAuth: true },
      );
      this.storeTokens(result.accessToken, result.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
