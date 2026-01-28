# Data Model: OAuth2 E2E Test Infrastructure

**Feature**: 009-oauth-e2e-tests
**Date**: 2026-01-27

## Overview

This document defines the data structures used for mocking OAuth flows in E2E tests. These are **test-only** structures that simulate real OAuth provider responses.

---

## Mock Data Structures

### OAuthMockConfig

Configuration for per-test OAuth behavior.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | `'google' \| 'apple'` | Yes | OAuth provider to mock |
| scenario | `OAuthScenario` | Yes | Test scenario (success, error, etc.) |
| email | string | No | Custom email for mock user (default: auto-generated) |
| name | string | No | Custom display name (default: "Test User") |
| picture | string | No | Custom avatar URL |
| emailVerified | boolean | No | Whether email is verified (default: true) |
| isPrivateRelay | boolean | No | Apple "Hide My Email" mode (default: false) |
| delay | number | No | Artificial delay in ms (default: 0) |

### OAuthScenario

Enumeration of testable scenarios.

| Value | Description | Expected Frontend Behavior |
|-------|-------------|---------------------------|
| `success` | Successful OAuth authentication | Redirect to onboarding/topics |
| `cancel` | User cancelled OAuth flow | Show "cancelled" message, return to signup |
| `invalid-state` | CSRF token mismatch | Show security error |
| `expired-code` | Authorization code expired | Show "expired" error, prompt retry |
| `network-error` | Network failure during callback | Show network error with retry |
| `server-error` | Backend returned 500 | Show server error message |

### MockOAuthTokens

Simulated token response from OAuth provider.

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | Mock bearer token |
| idToken | string | Mock JWT with user claims |
| refreshToken | string | Mock refresh token |
| expiresIn | number | Token lifetime in seconds (default: 3600) |
| tokenType | `'Bearer'` | Always "Bearer" |
| scope | string | OAuth scopes granted |

### MockGoogleProfile

Simulated Google user profile.

| Field | Type | Description |
|-------|------|-------------|
| email | string | User's email address |
| emailVerified | boolean | Whether email is verified |
| name | string | Full name |
| givenName | string | First name |
| familyName | string | Last name |
| picture | string | Avatar URL |
| googleId | string | Unique Google user ID |

### MockAppleProfile

Simulated Apple user profile.

| Field | Type | Description |
|-------|------|-------------|
| email | string | User's email (real or privaterelay) |
| emailVerified | boolean | Always true for Apple |
| name | string | Full name (may be empty after first auth) |
| appleId | string | Unique Apple user ID |
| isPrivateEmail | boolean | Whether using Hide My Email |
| realUserStatus | `0 \| 1 \| 2` | User authenticity indicator |

---

## State Management

### OAuthStateStore

In-memory store for CSRF state tokens during tests.

| Field | Type | Description |
|-------|------|-------------|
| stateToken | string | Generated CSRF token |
| provider | `'google' \| 'apple'` | OAuth provider |
| createdAt | Date | When state was created |
| visitorSessionId | string? | Optional visitor session to link |
| redirectUrl | string? | Where to redirect after success |

**Lifecycle**:
1. Created when `initiateOAuth()` is called
2. Validated when `handleOAuthCallback()` is called
3. Deleted after validation (used only once)
4. Auto-expires after 10 minutes

---

## Validation Rules

### Email Validation
- Must be valid email format
- For Apple private relay: must match `*@privaterelay.appleid.com`
- Normalized to lowercase before storage

### State Token Validation
- Must be non-empty string
- Must match token stored during initiation
- Must not be older than 10 minutes

### Authorization Code Validation (Mock Mode)
- Must start with `mock_code_` prefix when `AUTH_MOCK=true`
- Real codes rejected in mock mode (security)

---

## Relationships

```
OAuthMockConfig
    │
    ├──> MockOAuthTokens (generated on success)
    │
    ├──> MockGoogleProfile (for Google provider)
    │
    └──> MockAppleProfile (for Apple provider)

OAuthStateStore
    │
    └──> Links to VisitorSession (optional)
```

---

## Test Data Generators

### generateMockEmail()
```
Pattern: `oauth-test-{timestamp}@example.com`
Example: `oauth-test-1706367600000@example.com`
```

### generateAppleRelayEmail()
```
Pattern: `{random}@privaterelay.appleid.com`
Example: `abc123def456@privaterelay.appleid.com`
```

### generateMockStateToken()
```
Pattern: `mock_state_{random}_{timestamp}`
Example: `mock_state_abc123_1706367600000`
```

### generateMockAuthCode()
```
Pattern: `mock_code_{provider}_{timestamp}`
Example: `mock_code_google_1706367600000`
```
