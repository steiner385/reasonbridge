# Feature Specification: OAuth2 E2E Test Infrastructure

**Feature Branch**: `009-oauth-e2e-tests`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "Implement comprehensive OAuth2 end-to-end tests for the authentication system"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enable OAuth E2E Tests in CI (Priority: P1)

As a **developer**, I want OAuth E2E tests to run reliably in the CI pipeline so that OAuth authentication flows are validated automatically on every pull request.

**Why this priority**: Currently, 650+ lines of OAuth E2E tests exist (`frontend/e2e/oauth-flow.spec.ts`) but are **completely skipped** due to inability to interact with real OAuth providers in CI. Enabling these tests is the highest priority because it provides immediate value without writing new tests.

**Independent Test**: Can be fully tested by running `pnpm test:e2e --grep "OAuth"` in CI and verifying all tests pass. Delivers immediate regression protection for OAuth flows.

**Acceptance Scenarios**:

1. **Given** the CI pipeline runs E2E tests, **When** OAuth tests execute, **Then** all OAuth test suites complete without timeouts or skips
2. **Given** a PR modifies OAuth-related code, **When** CI runs, **Then** OAuth E2E tests catch regressions before merge
3. **Given** mock OAuth providers are configured, **When** tests simulate OAuth flows, **Then** the full authentication journey completes within 30 seconds per test

---

### User Story 2 - Mock Google OAuth Provider (Priority: P1)

As a **developer**, I want a mock Google OAuth provider that simulates the complete OAuth flow so that E2E tests can verify Google sign-in without requiring real Google credentials.

**Why this priority**: Google OAuth is the primary OAuth provider. Without a mock, all Google-related tests remain disabled, leaving a critical authentication path untested.

**Independent Test**: Can be tested by running Google OAuth test suite and verifying sign-in, token exchange, and user profile retrieval work with mock responses.

**Acceptance Scenarios**:

1. **Given** a user clicks "Sign in with Google", **When** the OAuth flow initiates, **Then** the mock provider returns a valid authorization URL with state token
2. **Given** a valid authorization code, **When** the callback handler processes it, **Then** mock tokens (access, refresh, ID token) are returned
3. **Given** a mock ID token, **When** the backend verifies it, **Then** user profile data (email, name, picture) is extracted correctly
4. **Given** the user cancels Google OAuth, **When** the callback receives an error, **Then** an appropriate error message is displayed

---

### User Story 3 - Mock Apple OAuth Provider (Priority: P2)

As a **developer**, I want a mock Apple OAuth provider that simulates Apple Sign-In so that E2E tests can verify Apple authentication including the "Hide My Email" feature.

**Why this priority**: Apple OAuth is a secondary provider but important for iOS users. Testing the "Hide My Email" relay address handling requires specific mock behavior.

**Independent Test**: Can be tested by running Apple OAuth test suite and verifying sign-in works with both real and relay email addresses.

**Acceptance Scenarios**:

1. **Given** a user clicks "Sign in with Apple", **When** the OAuth flow initiates, **Then** the mock provider returns a valid authorization URL
2. **Given** Apple returns a relay email (privaterelay.appleid.com), **When** the user is created, **Then** the relay email is accepted as a valid verified email
3. **Given** Apple OAuth succeeds, **When** user data is stored, **Then** the Apple user ID is correctly associated with the account

---

### User Story 4 - OAuth Error Scenario Testing (Priority: P2)

As a **developer**, I want to test OAuth error scenarios (network failures, expired tokens, CSRF attacks) so that error handling is verified and users see appropriate messages.

**Why this priority**: Error handling is critical for security and user experience. Mock providers must simulate failure modes.

**Independent Test**: Can be tested by triggering each error scenario and verifying the UI displays correct error messages and maintains secure state.

**Acceptance Scenarios**:

1. **Given** a network error during OAuth, **When** the error is caught, **Then** a user-friendly "network error" message appears with retry option
2. **Given** an invalid/expired state token (CSRF attack), **When** the callback processes it, **Then** the request is rejected with a security error
3. **Given** an expired authorization code, **When** token exchange fails, **Then** the user is prompted to restart the OAuth flow
4. **Given** the OAuth server returns a 500 error, **When** the callback handles it, **Then** a "server error" message appears

---

### User Story 5 - OAuth Account Linking (Priority: P3)

As a **developer**, I want to test OAuth account linking scenarios so that users signing in with OAuth using an existing email address are handled correctly.

**Why this priority**: Account linking is an edge case but important for users who create an account with email/password then later try OAuth with the same email.

**Independent Test**: Can be tested by creating an email/password account, then attempting OAuth with the same email and verifying appropriate handling.

**Acceptance Scenarios**:

1. **Given** a user has an existing email/password account, **When** they attempt OAuth with the same email, **Then** they are prompted to link accounts or shown an "account exists" message
2. **Given** account linking is successful, **When** the user logs in again, **Then** both OAuth and email/password methods work for the same account

---

### Edge Cases

- What happens when OAuth state token expires between initiation and callback (typically 10 minutes)?
- How does the system handle OAuth callback with missing required parameters (code, state)?
- What happens if the same authorization code is used twice (replay attack)?
- How does the system behave when localStorage is unavailable (private browsing)?
- What happens during OAuth flow if the user's session expires on the backend?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a mock OAuth server that responds to OAuth initiation requests with valid authorization URLs
- **FR-002**: System MUST return mock tokens (access token, refresh token, ID token) when processing valid authorization codes
- **FR-003**: Mock OAuth server MUST support configurable responses for testing success and error scenarios
- **FR-004**: Mock OAuth server MUST validate state tokens to test CSRF protection
- **FR-005**: Mock Google OAuth MUST return user profiles with email, name, picture, and Google ID
- **FR-006**: Mock Apple OAuth MUST support both real email and privaterelay.appleid.com addresses
- **FR-007**: System MUST allow tests to configure mock responses per-test for isolated testing
- **FR-008**: Mock OAuth server MUST simulate realistic timing (configurable delays) to test loading states
- **FR-009**: System MUST support running mock OAuth server alongside the E2E test environment
- **FR-010**: All previously skipped OAuth tests (650+ lines in oauth-flow.spec.ts) MUST be enabled and passing

### Key Entities

- **Mock OAuth Server**: A test-time HTTP server that simulates Google/Apple OAuth endpoints
- **OAuth State Store**: Temporary storage for state tokens during the OAuth flow (validates CSRF protection)
- **Mock User Profile**: Configurable user data returned by mock OAuth providers (email, name, picture, provider ID)
- **Mock Token Set**: Access token, refresh token, and ID token with configurable expiration

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 29 OAuth E2E tests in `oauth-flow.spec.ts` pass in CI (currently 0 passing due to skip)
- **SC-002**: OAuth E2E test suite completes within 5 minutes total in CI
- **SC-003**: Individual OAuth test cases complete within 30 seconds each
- **SC-004**: 100% of OAuth error scenarios have corresponding passing tests
- **SC-005**: OAuth tests run reliably without flakiness (>99% pass rate across 100 consecutive runs)
- **SC-006**: No real OAuth provider credentials are required to run E2E tests
- **SC-007**: Mock OAuth infrastructure adds less than 50MB to Docker E2E environment

## Assumptions

- The existing `oauth-flow.spec.ts` tests are well-designed and don't need rewriting, only enabling
- Mock OAuth server can run as a separate container in the E2E Docker Compose environment
- The frontend OAuth callback handlers will work correctly with mock provider URLs
- State token validation logic already exists and just needs a mock server to test against
- The existing test helpers (`simulateOAuthCallback`, `generateMockOAuthTokens`) provide a good foundation
