/**
 * OAuth E2E Mock Utilities
 *
 * Mock data generators for OAuth E2E tests.
 * These utilities create realistic mock data for testing OAuth flows
 * without requiring real OAuth provider credentials.
 */

import type {
  OAuthProvider,
  OAuthScenario,
  OAuthMockConfig,
  MockOAuthTokens,
  MockGoogleProfile,
  MockAppleProfile,
  OAuthStateEntry,
  DEFAULT_OAUTH_MOCK_CONFIG,
} from './oauth-types';

/**
 * Generate a unique mock email address for testing
 * Pattern: oauth-test-{timestamp}-{random}@example.com
 */
export function generateMockEmail(): string {
  const random = Math.random().toString(36).substring(2, 8);
  return `oauth-test-${Date.now()}-${random}@example.com`;
}

/**
 * Generate a CSRF state token for OAuth flow
 * Pattern: mock_state_{random}_{timestamp}
 */
export function generateMockStateToken(): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `mock_state_${random}_${Date.now()}`;
}

/**
 * Generate a mock authorization code
 * Pattern: mock_code_{provider}_{timestamp}
 */
export function generateMockAuthCode(provider: OAuthProvider): string {
  return `mock_code_${provider}_${Date.now()}`;
}

/**
 * Generate an Apple Private Relay email address
 * Pattern: {random}@privaterelay.appleid.com
 */
export function generateAppleRelayEmail(): string {
  const random = Math.random().toString(36).substring(2, 14);
  return `${random}@privaterelay.appleid.com`;
}

/**
 * Generate mock OAuth tokens for a provider
 */
export function generateMockOAuthTokens(
  provider: OAuthProvider,
  config: Partial<OAuthMockConfig> = {},
): MockOAuthTokens {
  const timestamp = Date.now();
  const scopes = provider === 'google' ? 'openid email profile' : 'openid email name';

  return {
    accessToken: `mock_access_${provider}_${timestamp}`,
    idToken: `mock_id_${provider}_${timestamp}`,
    refreshToken: `mock_refresh_${provider}_${timestamp}`,
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: scopes,
  };
}

/**
 * Generate a mock Google user profile
 */
export function generateMockGoogleProfile(
  config: Partial<OAuthMockConfig> = {},
): MockGoogleProfile {
  const email = config.email || generateMockEmail();
  const name = config.name || 'Test User';
  const nameParts = name.split(' ');
  const givenName = nameParts[0] || 'Test';
  const familyName = nameParts.slice(1).join(' ') || 'User';
  const timestamp = Date.now();

  return {
    email,
    emailVerified: config.emailVerified ?? true,
    name,
    givenName,
    familyName,
    picture: config.picture || `https://lh3.googleusercontent.com/mock/${timestamp}`,
    googleId: `google_${timestamp}_${Math.random().toString(36).substring(2, 10)}`,
  };
}

/**
 * Generate a mock Apple user profile
 */
export function generateMockAppleProfile(config: Partial<OAuthMockConfig> = {}): MockAppleProfile {
  const isPrivateRelay = config.isPrivateRelay ?? false;
  const email = isPrivateRelay ? generateAppleRelayEmail() : config.email || generateMockEmail();
  const name = config.name || 'Test User';
  const timestamp = Date.now();

  return {
    email,
    emailVerified: true, // Apple always verifies email
    name,
    appleId: `apple_${timestamp}_${Math.random().toString(36).substring(2, 10)}`,
    isPrivateEmail: isPrivateRelay,
    realUserStatus: 2, // 2 = likely real user
  };
}

/**
 * Create an OAuth state entry for CSRF protection
 */
export function createOAuthStateEntry(
  provider: OAuthProvider,
  options: {
    visitorSessionId?: string;
    redirectUrl?: string;
  } = {},
): OAuthStateEntry {
  return {
    stateToken: generateMockStateToken(),
    provider,
    createdAt: new Date(),
    visitorSessionId: options.visitorSessionId,
    redirectUrl: options.redirectUrl,
  };
}

/**
 * Build a mock OAuth callback URL for testing
 */
export function buildMockCallbackUrl(
  provider: OAuthProvider,
  scenario: OAuthScenario,
  stateToken: string,
  baseUrl: string = 'http://localhost:3000',
): string {
  const url = new URL(`${baseUrl}/auth/callback/${provider}`);

  switch (scenario) {
    case 'success':
      url.searchParams.set('code', generateMockAuthCode(provider));
      url.searchParams.set('state', stateToken);
      break;

    case 'cancel':
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User cancelled the authorization');
      url.searchParams.set('state', stateToken);
      break;

    case 'invalid-state':
      url.searchParams.set('code', generateMockAuthCode(provider));
      url.searchParams.set('state', 'invalid_state_token');
      break;

    case 'expired-code':
      url.searchParams.set('code', 'expired_code_12345');
      url.searchParams.set('state', stateToken);
      break;

    case 'network-error':
      // Network errors are simulated via route.abort(), not URL
      // Return a valid URL that will be intercepted
      url.searchParams.set('code', generateMockAuthCode(provider));
      url.searchParams.set('state', stateToken);
      break;

    case 'server-error':
      url.searchParams.set('code', generateMockAuthCode(provider));
      url.searchParams.set('state', stateToken);
      url.searchParams.set('_mock_error', '500');
      break;
  }

  return url.toString();
}

/**
 * Build mock authentication success response (matches backend contract)
 */
export function buildMockAuthSuccessResponse(
  provider: OAuthProvider,
  config: Partial<OAuthMockConfig> = {},
): {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    authMethod: 'GOOGLE_OAUTH' | 'APPLE_OAUTH';
    emailVerified: boolean;
    accountStatus: string;
    createdAt: string;
    lastLoginAt: string;
  };
  onboardingProgress: {
    userId: string;
    currentStep: string;
    emailVerified: boolean;
    topicsSelected: boolean;
    orientationViewed: boolean;
    firstPostMade: boolean;
    completionPercentage: number;
    nextAction: {
      step: string;
      label: string;
      description: string;
      url: string;
    };
  };
  expiresIn: number;
} {
  const tokens = generateMockOAuthTokens(provider, config);
  const profile =
    provider === 'google' ? generateMockGoogleProfile(config) : generateMockAppleProfile(config);

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: userId,
      email: profile.email,
      displayName: profile.name,
      authMethod: provider === 'google' ? 'GOOGLE_OAUTH' : 'APPLE_OAUTH',
      emailVerified: profile.emailVerified,
      accountStatus: 'ACTIVE',
      createdAt: now,
      lastLoginAt: now,
    },
    onboardingProgress: {
      userId,
      currentStep: 'TOPICS',
      emailVerified: profile.emailVerified,
      topicsSelected: false,
      orientationViewed: false,
      firstPostMade: false,
      completionPercentage: 25,
      nextAction: {
        step: 'TOPICS',
        label: 'Select Topics',
        description: 'Choose topics you want to discuss',
        url: '/onboarding/topics',
      },
    },
    expiresIn: tokens.expiresIn,
  };
}

/**
 * Build mock OAuth error response
 */
export function buildMockOAuthErrorResponse(
  scenario: OAuthScenario,
  provider: OAuthProvider,
): {
  error: string;
  message: string;
  details?: {
    provider: string;
    hint?: string;
  };
} {
  const errorMap: Record<OAuthScenario, { error: string; message: string; hint?: string }> = {
    success: { error: 'UNEXPECTED', message: 'No error for success scenario' },
    cancel: {
      error: 'OAUTH_CANCELLED',
      message: 'You cancelled the sign-in process',
      hint: 'Click the OAuth button to try again',
    },
    'invalid-state': {
      error: 'INVALID_STATE',
      message: 'Security validation failed',
      hint: 'Please start the sign-in process again',
    },
    'expired-code': {
      error: 'EXPIRED_CODE',
      message: 'The authorization has expired',
      hint: 'Please try signing in again',
    },
    'network-error': {
      error: 'NETWORK_ERROR',
      message: 'Unable to connect to authentication server',
      hint: 'Check your internet connection and try again',
    },
    'server-error': {
      error: 'SERVER_ERROR',
      message: 'Authentication server error',
      hint: 'Please try again later',
    },
  };

  const errorInfo = errorMap[scenario];

  return {
    error: errorInfo.error,
    message: errorInfo.message,
    details: {
      provider,
      hint: errorInfo.hint,
    },
  };
}
