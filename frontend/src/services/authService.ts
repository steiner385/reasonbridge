/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication service for user signup, login, and OAuth flows
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface SignupRequest {
  email: string;
  password: string;
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

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const result: AuthResponse = await response.json();
    this.storeTokens(result.accessToken, result.refreshToken);
    return result;
  }

  /**
   * Log in an existing user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const result: AuthResponse = await response.json();
    this.storeTokens(result.accessToken, result.refreshToken);
    return result;
  }

  /**
   * Verify email with 6-digit code
   */
  async verifyEmail(code: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Email verification failed');
    }

    return response.json();
  }

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to resend verification email');
    }

    return response.json();
  }

  /**
   * Initiate OAuth flow
   */
  async initiateOAuth(provider: 'google' | 'apple'): Promise<{ authUrl: string; state: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/oauth/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to initiate OAuth');
    }

    return response.json();
  }

  /**
   * Log out the current user
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Get the current auth token
   */
  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Store access and refresh tokens in localStorage
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Get the refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
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
      const refreshed = await this.refreshAccessToken();
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
   */
  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const result: AuthResponse = await response.json();
      this.storeTokens(result.accessToken, result.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
