# Research: OAuth2 E2E Test Infrastructure

**Feature**: 009-oauth-e2e-tests
**Date**: 2026-01-27

## Research Summary

This document captures research findings for enabling OAuth E2E tests. All clarification items have been resolved.

---

## 1. Current OAuth Architecture

### Decision: Use Hybrid Approach (Frontend Route Interception + Backend Mock Mode)

### Findings

**Backend OAuth Flow** (`services/user-service/src/auth/auth.service.ts`):
- `initiateOAuth()` - Generates OAuth URL with state token (calls `GoogleOAuthService.generateAuthUrl()`)
- `handleOAuthCallback()` - Exchanges authorization code for tokens and user profile

**OAuth Provider Services**:
- `GoogleOAuthService` - Uses `google-auth-library` to call real Google OAuth APIs
- `AppleOAuthService` - Calls real Apple Sign-In APIs
- Both generate state tokens for CSRF protection

**Mock Auth Service** (`mock-auth.service.ts`):
- Mocks email/password authentication only
- Does NOT mock OAuth flows
- Uses `AUTH_MOCK=true` environment variable

### The Problem
When E2E tests click "Sign in with Google", the flow is:
1. Frontend calls `/auth/oauth/initiate?provider=google`
2. Backend returns real Google OAuth URL (`accounts.google.com/...`)
3. Playwright navigates to Google's real login page
4. Tests timeout waiting for interaction with real Google

### Solution
Mock at **two levels**:
1. **Playwright route interception**: Catch OAuth initiation and return mock auth URL pointing to our callback
2. **Backend mock OAuth callback**: Add mock endpoint that accepts mock authorization codes

---

## 2. Playwright Route Interception Patterns

### Decision: Use Page Fixture with Route Interception

### Rationale
- Playwright's `page.route()` can intercept requests matching patterns
- Can return mock responses without actual network calls
- Per-test configuration enables different scenarios (success, error, cancellation)

### Implementation Pattern

```typescript
// frontend/e2e/fixtures/oauth-mock.fixture.ts
import { test as base, Page } from '@playwright/test';

export interface OAuthMockConfig {
  provider: 'google' | 'apple';
  scenario: 'success' | 'cancel' | 'error' | 'invalid-state';
  email?: string;
  name?: string;
}

export const test = base.extend<{ oauthMock: OAuthMockConfig }>({
  oauthMock: [{ provider: 'google', scenario: 'success' }, { option: true }],

  page: async ({ page, oauthMock }, use) => {
    // Intercept OAuth initiation requests
    await page.route('**/auth/oauth/initiate**', async (route) => {
      const mockCallbackUrl = `/auth/callback/${oauthMock.provider}?code=mock_code_${Date.now()}&state=mock_state`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authUrl: mockCallbackUrl, // Redirect to our mock callback, not Google
          state: 'mock_state',
          provider: oauthMock.provider,
        }),
      });
    });

    await use(page);
  },
});
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|------------|------|------|------------------|
| Mock OAuth server container | Realistic simulation | +50MB image, complex setup | Overkill for test coverage needed |
| Real OAuth with test accounts | Most realistic | Requires credentials, rate limits, flaky | Security risk, maintenance burden |
| Skip OAuth tests entirely | No work required | No coverage | Defeats purpose of E2E testing |

---

## 3. Google OAuth Response Format

### Decision: Match Google's OpenID Connect token structure

### Token Structure

```typescript
interface GoogleOAuthTokens {
  access_token: string;      // Bearer token for API calls
  id_token: string;          // JWT with user info
  refresh_token: string;     // For token refresh
  expires_in: number;        // Typically 3600 (1 hour)
  token_type: 'Bearer';
  scope: string;             // 'openid email profile'
}

interface GoogleIdTokenPayload {
  iss: 'https://accounts.google.com';
  azp: string;               // Client ID
  aud: string;               // Client ID
  sub: string;               // Unique Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;               // Issued at timestamp
  exp: number;               // Expiration timestamp
}
```

### Mock Implementation

The backend `GoogleOAuthService.verifyAndGetProfile()` extracts:
- `email` from ID token
- `emailVerified` from `email_verified` claim
- `name` from `name` claim
- `picture` from `picture` claim
- `googleId` from `sub` claim

Mock must provide these fields to satisfy backend processing.

---

## 4. Apple OAuth Response Format

### Decision: Support both real email and private relay email

### Apple Callback Parameters

```typescript
interface AppleOAuthCallback {
  code: string;              // Authorization code
  id_token: string;          // JWT with user info
  state: string;             // CSRF token
  user?: string;             // JSON string with user info (first auth only)
}

interface AppleIdTokenPayload {
  iss: 'https://appleid.apple.com';
  aud: string;               // Client ID
  sub: string;               // Unique Apple user ID
  email: string;             // Real or private relay email
  email_verified: 'true';    // String, not boolean
  is_private_email?: 'true'; // Present if using Hide My Email
  real_user_status?: 0 | 1 | 2; // Likely real (2), unknown (1), unsupported (0)
  auth_time: number;
  nonce_supported: boolean;
}
```

### Private Relay Email Format
Apple's "Hide My Email" generates addresses like:
- `{random}@privaterelay.appleid.com`

The mock must test this scenario to ensure the backend accepts relay addresses.

---

## 5. Backend Mock OAuth Integration

### Decision: Add mock OAuth mode to user-service

### Current Behavior
`AUTH_MOCK=true` enables `MockAuthService` for email/password auth but OAuth still calls real providers.

### Required Changes
Add mock OAuth handling when `AUTH_MOCK=true`:

```typescript
// In auth.service.ts handleOAuthCallback()
if (this.configService.get('AUTH_MOCK') === 'true') {
  // Accept mock authorization codes
  if (query.code.startsWith('mock_code_')) {
    return this.handleMockOAuthCallback(provider, query);
  }
}
```

Mock callback generates:
- Synthetic user profile from mock data
- JWT tokens using `MockAuthService` token generation
- Proper onboarding progress

---

## 6. Error Scenario Mocking

### Decision: Support 6 error scenarios via configuration

| Scenario | How to Trigger | Expected Behavior |
|----------|---------------|-------------------|
| User cancellation | `?error=access_denied` | Show "cancelled" message |
| Invalid state (CSRF) | Mismatched state token | Show security error |
| Expired code | Backend rejects stale code | Prompt to retry |
| Network error | Route returns network failure | Show retry option |
| Server error | Route returns 500 | Show server error message |
| Rate limited | Route returns 429 | Show rate limit message |

### Implementation

```typescript
await page.route('**/auth/callback/**', async (route) => {
  switch (oauthMock.scenario) {
    case 'cancel':
      await route.fulfill({
        status: 302,
        headers: { location: '/signup?error=access_denied' },
      });
      break;
    case 'invalid-state':
      await route.continue(); // Let backend reject mismatched state
      break;
    // ... other scenarios
  }
});
```

---

## Key Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Mock approach | Playwright route interception | Lowest complexity, sufficient coverage |
| Backend changes | Add mock OAuth callback handler | Enables realistic callback testing |
| Token format | Match real provider structure | Ensures frontend handles real tokens |
| Error scenarios | 6 configurable scenarios | Comprehensive error coverage |
| Apple relay email | Explicitly test | Critical UX scenario for iOS users |

---

## Dependencies

- **Playwright 1.57+**: Required for route interception
- **@playwright/test**: Test framework with fixtures
- **jsonwebtoken**: For mock JWT generation (already in user-service)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Mock diverges from real OAuth | Periodically validate mock against real provider responses |
| Tests pass but real OAuth broken | Keep one manual OAuth test in staging environment |
| State token validation bypassed | Ensure mock validates state matches what frontend sent |
