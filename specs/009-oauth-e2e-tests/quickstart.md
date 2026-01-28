# Quickstart: OAuth2 E2E Testing

**Feature**: 009-oauth-e2e-tests
**Date**: 2026-01-27

## Overview

This guide explains how to run and extend OAuth E2E tests using the mock OAuth infrastructure.

---

## Running OAuth E2E Tests

### Prerequisites

1. Docker and Docker Compose installed
2. Node.js 20 LTS
3. pnpm 9.x

### Run All OAuth Tests

```bash
# From repository root
pnpm test:e2e -- --grep "OAuth"
```

### Run Specific OAuth Test Suites

```bash
# Google OAuth tests only
pnpm test:e2e -- --grep "Google OAuth"

# Apple OAuth tests only
pnpm test:e2e -- --grep "Apple OAuth"

# Error handling tests
pnpm test:e2e -- --grep "OAuth Error"

# Account linking tests
pnpm test:e2e -- --grep "OAuth Account Linking"
```

### Run in Docker (CI Mode)

```bash
# Start E2E environment
docker compose -f docker-compose.e2e.yml up -d

# Wait for services
sleep 30

# Run tests
E2E_DOCKER=true pnpm test:e2e -- --grep "OAuth"

# Cleanup
docker compose -f docker-compose.e2e.yml down -v
```

---

## Writing OAuth Tests

### Using the OAuth Mock Fixture

```typescript
// Import the extended test with OAuth mock
import { test, expect } from '../fixtures/oauth-mock.fixture';

test.describe('My OAuth Feature', () => {
  // Test with default config (Google, success scenario)
  test('should complete Google OAuth signup', async ({ page }) => {
    await page.goto('/signup');
    await page.click('button:has-text("Google")');
    // OAuth is automatically mocked
    await expect(page).toHaveURL(/\/onboarding\/topics/);
  });

  // Test with custom config
  test.use({ oauthMock: { provider: 'apple', scenario: 'success' } });
  test('should complete Apple OAuth signup', async ({ page }) => {
    await page.goto('/signup');
    await page.click('button:has-text("Apple")');
    await expect(page).toHaveURL(/\/onboarding\/topics/);
  });

  // Test error scenarios
  test.use({ oauthMock: { provider: 'google', scenario: 'cancel' } });
  test('should handle OAuth cancellation', async ({ page }) => {
    await page.goto('/signup');
    await page.click('button:has-text("Google")');
    await expect(page.locator('text=cancelled')).toBeVisible();
  });
});
```

### Available Scenarios

| Scenario | Description | Use Case |
|----------|-------------|----------|
| `success` | OAuth completes successfully | Happy path testing |
| `cancel` | User cancels OAuth flow | Cancel button behavior |
| `invalid-state` | CSRF token mismatch | Security testing |
| `expired-code` | Authorization code expired | Error recovery |
| `network-error` | Network failure | Offline/retry behavior |
| `server-error` | Backend error | Error display |

### Custom User Data

```typescript
test.use({
  oauthMock: {
    provider: 'google',
    scenario: 'success',
    email: 'custom@example.com',
    name: 'Custom User',
    emailVerified: true,
  },
});
```

### Apple Private Relay Email

```typescript
test.use({
  oauthMock: {
    provider: 'apple',
    scenario: 'success',
    isPrivateRelay: true, // Generates @privaterelay.appleid.com email
  },
});
```

---

## Mock Architecture

### How It Works

1. **Test starts**: Playwright fixture intercepts OAuth routes
2. **User clicks OAuth button**: Frontend calls `/auth/oauth/initiate`
3. **Route intercepted**: Mock returns callback URL (not real Google/Apple)
4. **Frontend redirects**: To our mock callback URL
5. **Backend processes**: Mock callback handler creates user, returns tokens
6. **Test continues**: User is authenticated, can verify UI state

### Key Files

| File | Purpose |
|------|---------|
| `frontend/e2e/fixtures/oauth-mock.fixture.ts` | Playwright fixture for mocking |
| `frontend/e2e/utils/oauth-mock.ts` | Mock data generators |
| `frontend/e2e/oauth-flow.spec.ts` | OAuth test suite |
| `services/user-service/src/auth/auth.service.ts` | Backend OAuth handling |

---

## Debugging OAuth Tests

### Enable Verbose Logging

```bash
DEBUG=pw:api pnpm test:e2e -- --grep "OAuth"
```

### Check Network Requests

```typescript
test('debug oauth flow', async ({ page }) => {
  // Log all network requests
  page.on('request', (req) => console.log('Request:', req.url()));
  page.on('response', (res) => console.log('Response:', res.url(), res.status()));

  await page.goto('/signup');
  await page.click('button:has-text("Google")');
});
```

### Inspect Mock Data

```typescript
test('inspect mock tokens', async ({ page }) => {
  await page.goto('/signup');
  await page.click('button:has-text("Google")');

  // Check stored tokens
  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem('accessToken'),
    refresh: localStorage.getItem('refreshToken'),
  }));
  console.log('Stored tokens:', tokens);
});
```

### Run Single Test with Trace

```bash
pnpm test:e2e -- --grep "Google OAuth signup" --trace on
```

Then open the trace viewer:
```bash
npx playwright show-trace frontend/test-results/*/trace.zip
```

---

## Common Issues

### Tests Timeout Waiting for Google

**Symptom**: Test hangs at Google login page
**Cause**: Mock routes not set up correctly
**Fix**: Ensure using `oauth-mock.fixture.ts` test import

### Invalid State Token Error

**Symptom**: Backend rejects OAuth callback
**Cause**: State token mismatch
**Fix**: Verify mock returns same state token in callback

### User Not Created

**Symptom**: OAuth succeeds but user data missing
**Cause**: Backend not in mock mode
**Fix**: Verify `AUTH_MOCK=true` in E2E environment

### Apple Relay Email Rejected

**Symptom**: Apple OAuth fails with relay email
**Cause**: Email validation too strict
**Fix**: Check email validation accepts `@privaterelay.appleid.com`

---

## Best Practices

1. **Use fixtures**: Always import from `oauth-mock.fixture.ts`, not standard Playwright
2. **One scenario per test**: Don't combine success and error scenarios
3. **Reset state**: Each test should start from signup page
4. **Verify UI state**: Check visible elements, not just URL
5. **Test both providers**: Google and Apple may have different edge cases
6. **Include error scenarios**: Don't just test happy path
