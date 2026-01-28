/**
 * OAuth E2E Test Type Definitions
 *
 * Types for mocking OAuth flows in Playwright E2E tests.
 * These structures simulate real OAuth provider responses.
 */

/**
 * OAuth provider types supported by the mock system
 */
export type OAuthProvider = 'google' | 'apple';

/**
 * Test scenarios for OAuth mocking
 */
export type OAuthScenario =
  | 'success'
  | 'cancel'
  | 'invalid-state'
  | 'expired-code'
  | 'network-error'
  | 'server-error';

/**
 * Configuration for per-test OAuth mock behavior
 */
export interface OAuthMockConfig {
  /** OAuth provider to mock */
  provider: OAuthProvider;
  /** Test scenario (success, error, etc.) */
  scenario: OAuthScenario;
  /** Custom email for mock user (default: auto-generated) */
  email?: string;
  /** Custom display name (default: "Test User") */
  name?: string;
  /** Custom avatar URL */
  picture?: string;
  /** Whether email is verified (default: true) */
  emailVerified?: boolean;
  /** Apple "Hide My Email" mode (default: false) */
  isPrivateRelay?: boolean;
  /** Artificial delay in ms (default: 0) */
  delay?: number;
}

/**
 * Simulated OAuth token response
 */
export interface MockOAuthTokens {
  /** Mock bearer token */
  accessToken: string;
  /** Mock JWT with user claims */
  idToken: string;
  /** Mock refresh token */
  refreshToken: string;
  /** Token lifetime in seconds (default: 3600) */
  expiresIn: number;
  /** Always "Bearer" */
  tokenType: 'Bearer';
  /** OAuth scopes granted */
  scope: string;
}

/**
 * Simulated Google user profile
 */
export interface MockGoogleProfile {
  /** User's email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** Full name */
  name: string;
  /** First name */
  givenName: string;
  /** Last name */
  familyName: string;
  /** Avatar URL */
  picture: string;
  /** Unique Google user ID */
  googleId: string;
}

/**
 * Simulated Apple user profile
 */
export interface MockAppleProfile {
  /** User's email (real or privaterelay) */
  email: string;
  /** Always true for Apple */
  emailVerified: boolean;
  /** Full name (may be empty after first auth) */
  name: string;
  /** Unique Apple user ID */
  appleId: string;
  /** Whether using Hide My Email */
  isPrivateEmail: boolean;
  /** User authenticity indicator: 0=unsupported, 1=unknown, 2=likely real */
  realUserStatus: 0 | 1 | 2;
}

/**
 * OAuth state store entry for CSRF protection
 */
export interface OAuthStateEntry {
  /** Generated CSRF token */
  stateToken: string;
  /** OAuth provider */
  provider: OAuthProvider;
  /** When state was created */
  createdAt: Date;
  /** Optional visitor session to link */
  visitorSessionId?: string;
  /** Where to redirect after success */
  redirectUrl?: string;
}

/**
 * Default mock configuration
 */
export const DEFAULT_OAUTH_MOCK_CONFIG: OAuthMockConfig = {
  provider: 'google',
  scenario: 'success',
  emailVerified: true,
  isPrivateRelay: false,
  delay: 0,
};
