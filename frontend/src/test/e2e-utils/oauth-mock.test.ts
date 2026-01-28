/**
 * Unit Tests for OAuth Mock Utilities
 *
 * Tests the mock data generators for OAuth E2E tests.
 */

import { describe, it, expect } from 'vitest';
import {
  generateMockEmail,
  generateMockStateToken,
  generateMockAuthCode,
  generateAppleRelayEmail,
  generateMockOAuthTokens,
  generateMockGoogleProfile,
  generateMockAppleProfile,
  createOAuthStateEntry,
  buildMockCallbackUrl,
  buildMockAuthSuccessResponse,
  buildMockOAuthErrorResponse,
} from '../../../e2e/utils/oauth-mock';

describe('OAuth Mock Utilities', () => {
  describe('generateMockEmail', () => {
    it('should generate email with correct pattern', () => {
      const email = generateMockEmail();
      expect(email).toMatch(/^oauth-test-\d+-[a-z0-9]+@example\.com$/);
    });

    it('should generate unique emails', () => {
      const email1 = generateMockEmail();
      // Add small delay to ensure different timestamp
      const email2 = generateMockEmail();
      // Emails should be unique (different timestamps)
      expect(email1).not.toBe(email2);
    });
  });

  describe('generateMockStateToken', () => {
    it('should generate state token with mock_state prefix', () => {
      const token = generateMockStateToken();
      expect(token).toMatch(/^mock_state_[a-z0-9]+_\d+$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateMockStateToken();
      const token2 = generateMockStateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateMockAuthCode', () => {
    it('should generate Google auth code with correct pattern', () => {
      const code = generateMockAuthCode('google');
      expect(code).toMatch(/^mock_code_google_\d+$/);
    });

    it('should generate Apple auth code with correct pattern', () => {
      const code = generateMockAuthCode('apple');
      expect(code).toMatch(/^mock_code_apple_\d+$/);
    });
  });

  describe('generateAppleRelayEmail', () => {
    it('should generate Apple private relay email', () => {
      const email = generateAppleRelayEmail();
      expect(email).toMatch(/^[a-z0-9]+@privaterelay\.appleid\.com$/);
    });

    it('should generate unique relay emails', () => {
      const email1 = generateAppleRelayEmail();
      const email2 = generateAppleRelayEmail();
      expect(email1).not.toBe(email2);
    });
  });

  describe('generateMockOAuthTokens', () => {
    it('should generate Google OAuth tokens', () => {
      const tokens = generateMockOAuthTokens('google');

      expect(tokens.accessToken).toMatch(/^mock_access_google_\d+$/);
      expect(tokens.idToken).toMatch(/^mock_id_google_\d+$/);
      expect(tokens.refreshToken).toMatch(/^mock_refresh_google_\d+$/);
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.scope).toBe('openid email profile');
    });

    it('should generate Apple OAuth tokens', () => {
      const tokens = generateMockOAuthTokens('apple');

      expect(tokens.accessToken).toMatch(/^mock_access_apple_\d+$/);
      expect(tokens.scope).toBe('openid email name');
    });
  });

  describe('generateMockGoogleProfile', () => {
    it('should generate profile with default values', () => {
      const profile = generateMockGoogleProfile();

      expect(profile.email).toMatch(/^oauth-test-\d+-[a-z0-9]+@example\.com$/);
      expect(profile.emailVerified).toBe(true);
      expect(profile.name).toBe('Test User');
      expect(profile.givenName).toBe('Test');
      expect(profile.familyName).toBe('User');
      expect(profile.picture).toMatch(/^https:\/\/lh3\.googleusercontent\.com\/mock\/\d+$/);
      expect(profile.googleId).toMatch(/^google_\d+_[a-z0-9]+$/);
    });

    it('should use custom email', () => {
      const profile = generateMockGoogleProfile({ email: 'custom@example.com' });
      expect(profile.email).toBe('custom@example.com');
    });

    it('should use custom name and split correctly', () => {
      const profile = generateMockGoogleProfile({ name: 'John Michael Smith' });
      expect(profile.name).toBe('John Michael Smith');
      expect(profile.givenName).toBe('John');
      expect(profile.familyName).toBe('Michael Smith');
    });

    it('should respect emailVerified setting', () => {
      const profile = generateMockGoogleProfile({ emailVerified: false });
      expect(profile.emailVerified).toBe(false);
    });
  });

  describe('generateMockAppleProfile', () => {
    it('should generate profile with default values', () => {
      const profile = generateMockAppleProfile();

      expect(profile.email).toMatch(/^oauth-test-\d+-[a-z0-9]+@example\.com$/);
      expect(profile.emailVerified).toBe(true);
      expect(profile.name).toBe('Test User');
      expect(profile.appleId).toMatch(/^apple_\d+_[a-z0-9]+$/);
      expect(profile.isPrivateEmail).toBe(false);
      expect(profile.realUserStatus).toBe(2);
    });

    it('should generate private relay email when isPrivateRelay is true', () => {
      const profile = generateMockAppleProfile({ isPrivateRelay: true });

      expect(profile.email).toMatch(/^[a-z0-9]+@privaterelay\.appleid\.com$/);
      expect(profile.isPrivateEmail).toBe(true);
    });

    it('should always have emailVerified as true for Apple', () => {
      const profile = generateMockAppleProfile({ emailVerified: false });
      // Apple always verifies emails, so this should still be true
      expect(profile.emailVerified).toBe(true);
    });
  });

  describe('createOAuthStateEntry', () => {
    it('should create state entry with required fields', () => {
      const entry = createOAuthStateEntry('google');

      expect(entry.stateToken).toMatch(/^mock_state_/);
      expect(entry.provider).toBe('google');
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.visitorSessionId).toBeUndefined();
      expect(entry.redirectUrl).toBeUndefined();
    });

    it('should include optional fields when provided', () => {
      const entry = createOAuthStateEntry('apple', {
        visitorSessionId: 'visitor-123',
        redirectUrl: '/dashboard',
      });

      expect(entry.provider).toBe('apple');
      expect(entry.visitorSessionId).toBe('visitor-123');
      expect(entry.redirectUrl).toBe('/dashboard');
    });
  });

  describe('buildMockCallbackUrl', () => {
    const stateToken = 'test_state_123';
    const baseUrl = 'http://localhost:3000';

    it('should build success callback URL', () => {
      const url = buildMockCallbackUrl('google', 'success', stateToken, baseUrl);
      const parsed = new URL(url);

      expect(parsed.pathname).toBe('/auth/callback/google');
      expect(parsed.searchParams.get('code')).toMatch(/^mock_code_google_\d+$/);
      expect(parsed.searchParams.get('state')).toBe(stateToken);
    });

    it('should build cancel callback URL', () => {
      const url = buildMockCallbackUrl('google', 'cancel', stateToken, baseUrl);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('error')).toBe('access_denied');
      expect(parsed.searchParams.get('error_description')).toBe('User cancelled the authorization');
      expect(parsed.searchParams.get('state')).toBe(stateToken);
    });

    it('should build invalid-state callback URL', () => {
      const url = buildMockCallbackUrl('google', 'invalid-state', stateToken, baseUrl);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('state')).toBe('invalid_state_token');
      expect(parsed.searchParams.get('code')).toBeTruthy();
    });

    it('should build expired-code callback URL', () => {
      const url = buildMockCallbackUrl('apple', 'expired-code', stateToken, baseUrl);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('code')).toBe('expired_code_12345');
      expect(parsed.searchParams.get('state')).toBe(stateToken);
    });

    it('should build server-error callback URL', () => {
      const url = buildMockCallbackUrl('google', 'server-error', stateToken, baseUrl);
      const parsed = new URL(url);

      expect(parsed.searchParams.get('_mock_error')).toBe('500');
    });
  });

  describe('buildMockAuthSuccessResponse', () => {
    it('should build Google auth success response', () => {
      const response = buildMockAuthSuccessResponse('google');

      expect(response.accessToken).toMatch(/^mock_access_google_\d+$/);
      expect(response.refreshToken).toMatch(/^mock_refresh_google_\d+$/);
      expect(response.user.authMethod).toBe('GOOGLE_OAUTH');
      expect(response.user.emailVerified).toBe(true);
      expect(response.user.accountStatus).toBe('ACTIVE');
      expect(response.onboardingProgress.currentStep).toBe('TOPICS');
      expect(response.onboardingProgress.completionPercentage).toBe(25);
      expect(response.expiresIn).toBe(3600);
    });

    it('should build Apple auth success response', () => {
      const response = buildMockAuthSuccessResponse('apple');

      expect(response.user.authMethod).toBe('APPLE_OAUTH');
    });

    it('should use custom email', () => {
      const response = buildMockAuthSuccessResponse('google', {
        email: 'custom@example.com',
      });

      expect(response.user.email).toBe('custom@example.com');
    });

    it('should use custom name', () => {
      const response = buildMockAuthSuccessResponse('google', {
        name: 'Custom Name',
      });

      expect(response.user.displayName).toBe('Custom Name');
    });
  });

  describe('buildMockOAuthErrorResponse', () => {
    it('should build cancel error response', () => {
      const response = buildMockOAuthErrorResponse('cancel', 'google');

      expect(response.error).toBe('OAUTH_CANCELLED');
      expect(response.message).toBe('You cancelled the sign-in process');
      expect(response.details?.provider).toBe('google');
      expect(response.details?.hint).toBeTruthy();
    });

    it('should build invalid-state error response', () => {
      const response = buildMockOAuthErrorResponse('invalid-state', 'apple');

      expect(response.error).toBe('INVALID_STATE');
      expect(response.message).toBe('Security validation failed');
    });

    it('should build expired-code error response', () => {
      const response = buildMockOAuthErrorResponse('expired-code', 'google');

      expect(response.error).toBe('EXPIRED_CODE');
    });

    it('should build network-error response', () => {
      const response = buildMockOAuthErrorResponse('network-error', 'google');

      expect(response.error).toBe('NETWORK_ERROR');
    });

    it('should build server-error response', () => {
      const response = buildMockOAuthErrorResponse('server-error', 'apple');

      expect(response.error).toBe('SERVER_ERROR');
    });
  });
});
