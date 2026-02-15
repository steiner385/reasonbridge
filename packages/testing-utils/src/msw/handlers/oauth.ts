/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * MSW Handlers for OAuth Providers
 *
 * T297: Mock handlers for OAuth authentication flows
 *
 * Mocks:
 * - Google OAuth: token exchange, user info, revocation
 * - Apple OAuth: token exchange, user info, revocation
 * - Support for success and error scenarios
 */
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Google OAuth endpoints
 */
export const GOOGLE_OAUTH_BASE_URL = 'https://oauth2.googleapis.com';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Apple OAuth endpoints
 */
export const APPLE_OAUTH_BASE_URL = 'https://appleid.apple.com';

/**
 * Mock OAuth tokens
 */
export const mockGoogleAccessToken = 'mock-google-access-token-12345';
export const mockGoogleRefreshToken = 'mock-google-refresh-token-67890';
export const mockAppleAccessToken = 'mock-apple-access-token-abcde';
export const mockAppleRefreshToken = 'mock-apple-refresh-token-fghij';

/**
 * Mock Google user profile
 */
export interface MockGoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Mock Apple user profile
 */
export interface MockAppleUser {
  sub: string;
  email: string;
  email_verified: string;
  name?: {
    firstName: string;
    lastName: string;
  };
}

/**
 * Predefined mock Google users
 */
export const mockGoogleUsers: Record<string, MockGoogleUser> = {
  standard: {
    id: 'google-user-123456789',
    email: 'googleuser@gmail.com',
    verified_email: true,
    name: 'Google Test User',
    given_name: 'Google',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/default-user',
    locale: 'en',
  },
  unverified: {
    id: 'google-user-unverified-111',
    email: 'unverified@gmail.com',
    verified_email: false,
    name: 'Unverified Google User',
    given_name: 'Unverified',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/default-user',
    locale: 'en',
  },
};

/**
 * Predefined mock Apple users
 */
export const mockAppleUsers: Record<string, MockAppleUser> = {
  standard: {
    sub: 'apple-user-000111.222333.444555',
    email: 'appleuser@privaterelay.appleid.com',
    email_verified: 'true',
    name: {
      firstName: 'Apple',
      lastName: 'User',
    },
  },
  hiddenEmail: {
    sub: 'apple-user-666777.888999.000111',
    email: 'hidden@privaterelay.appleid.com',
    email_verified: 'true',
    // Name may not be provided on subsequent logins
  },
};

/**
 * Track OAuth state for testing
 */
let mockGoogleTokenValid = true;
let mockAppleTokenValid = true;
let currentGoogleUser: MockGoogleUser = mockGoogleUsers['standard']!;
let currentAppleUser: MockAppleUser = mockAppleUsers['standard']!;

/**
 * OAuth handlers for Google and Apple
 */
export const oauthHandlers: RequestHandler[] = [
  // ==================== Google OAuth ====================

  /**
   * POST /token - Google OAuth token exchange
   */
  http.post(`${GOOGLE_OAUTH_BASE_URL}/token`, async ({ request }) => {
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const refreshToken = formData.get('refresh_token');

    // Handle authorization code exchange
    if (grantType === 'authorization_code') {
      if (!code) {
        return HttpResponse.json(
          { error: 'invalid_request', error_description: 'Missing authorization code' },
          { status: 400 },
        );
      }

      // Simulate invalid code
      if (code === 'invalid_code') {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid authorization code' },
          { status: 400 },
        );
      }

      return HttpResponse.json({
        access_token: mockGoogleAccessToken,
        refresh_token: mockGoogleRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
        id_token: 'mock-google-id-token',
      });
    }

    // Handle refresh token
    if (grantType === 'refresh_token') {
      if (refreshToken !== mockGoogleRefreshToken) {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid refresh token' },
          { status: 400 },
        );
      }

      return HttpResponse.json({
        access_token: mockGoogleAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
      });
    }

    return HttpResponse.json(
      { error: 'unsupported_grant_type', error_description: 'Unsupported grant type' },
      { status: 400 },
    );
  }),

  /**
   * GET /userinfo - Google user info
   */
  http.get(GOOGLE_USERINFO_URL, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.includes(mockGoogleAccessToken) || !mockGoogleTokenValid) {
      return HttpResponse.json(
        { error: 'invalid_token', error_description: 'Token is invalid or expired' },
        { status: 401 },
      );
    }

    return HttpResponse.json(currentGoogleUser);
  }),

  /**
   * POST /revoke - Google token revocation
   */
  http.post(`${GOOGLE_OAUTH_BASE_URL}/revoke`, async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('token');

    if (!token) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'Missing token' },
        { status: 400 },
      );
    }

    // Always return success for revocation
    return new HttpResponse(null, { status: 200 });
  }),

  // ==================== Apple OAuth ====================

  /**
   * POST /auth/token - Apple OAuth token exchange
   */
  http.post(`${APPLE_OAUTH_BASE_URL}/auth/token`, async ({ request }) => {
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const refreshToken = formData.get('refresh_token');

    // Handle authorization code exchange
    if (grantType === 'authorization_code') {
      if (!code) {
        return HttpResponse.json(
          { error: 'invalid_request', error_description: 'Missing authorization code' },
          { status: 400 },
        );
      }

      // Simulate invalid code
      if (code === 'invalid_code') {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid authorization code' },
          { status: 400 },
        );
      }

      return HttpResponse.json({
        access_token: mockAppleAccessToken,
        refresh_token: mockAppleRefreshToken,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: createMockAppleIdToken(currentAppleUser),
      });
    }

    // Handle refresh token
    if (grantType === 'refresh_token') {
      if (refreshToken !== mockAppleRefreshToken) {
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid refresh token' },
          { status: 400 },
        );
      }

      return HttpResponse.json({
        access_token: mockAppleAccessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: createMockAppleIdToken(currentAppleUser),
      });
    }

    return HttpResponse.json(
      { error: 'unsupported_grant_type', error_description: 'Unsupported grant type' },
      { status: 400 },
    );
  }),

  /**
   * POST /auth/revoke - Apple token revocation
   */
  http.post(`${APPLE_OAUTH_BASE_URL}/auth/revoke`, async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('token');

    if (!token) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'Missing token' },
        { status: 400 },
      );
    }

    // Always return success for revocation
    return new HttpResponse(null, { status: 200 });
  }),

  /**
   * GET /auth/keys - Apple public keys (JWKS)
   */
  http.get(`${APPLE_OAUTH_BASE_URL}/auth/keys`, () => {
    // Return mock JWKS for JWT validation
    return HttpResponse.json({
      keys: [
        {
          kty: 'RSA',
          kid: 'mock-key-id',
          use: 'sig',
          alg: 'RS256',
          n: 'mock-modulus-value',
          e: 'AQAB',
        },
      ],
    });
  }),
];

/**
 * Create a mock Apple ID token (simplified JWT structure)
 */
function createMockAppleIdToken(user: MockAppleUser): string {
  const header = { alg: 'RS256', kid: 'mock-key-id' };
  const payload = {
    iss: 'https://appleid.apple.com',
    aud: 'com.reasonbridge.app',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub: user.sub,
    email: user.email,
    email_verified: user.email_verified,
    auth_time: Math.floor(Date.now() / 1000),
    nonce_supported: true,
  };

  // Create a mock JWT (not cryptographically valid, but structurally correct)
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mockSignature = 'mock-signature';

  return `${base64Header}.${base64Payload}.${mockSignature}`;
}

/**
 * Set the current Google user for testing
 */
export function setMockGoogleUser(user: MockGoogleUser): void {
  currentGoogleUser = user;
}

/**
 * Set the current Apple user for testing
 */
export function setMockAppleUser(user: MockAppleUser): void {
  currentAppleUser = user;
}

/**
 * Set Google token validity (for testing expired tokens)
 */
export function setMockGoogleTokenValid(valid: boolean): void {
  mockGoogleTokenValid = valid;
}

/**
 * Set Apple token validity (for testing expired tokens)
 */
export function setMockAppleTokenValid(valid: boolean): void {
  mockAppleTokenValid = valid;
}

/**
 * Reset OAuth mock state
 */
export function resetOAuthMocks(): void {
  mockGoogleTokenValid = true;
  mockAppleTokenValid = true;
  currentGoogleUser = mockGoogleUsers['standard']!;
  currentAppleUser = mockAppleUsers['standard']!;
}

export default oauthHandlers;
