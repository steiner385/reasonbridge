# Plan: Systematically Re-enable OAuth E2E Tests

## Background

**Build #22** failed with OOM kill (exit code 137) due to OAuth E2E tests timing out while trying to interact with real OAuth providers.

**Tests Skipped** (10 tests in `frontend/e2e/oauth-flow.spec.ts`):
1. `should complete Google OAuth signup flow`
2. `should handle Google OAuth cancellation`
3. `should handle Google OAuth with invalid state token`
4. `should auto-verify email for Google OAuth users`
5. `should complete Apple OAuth signup flow`
6. `should handle Apple OAuth cancellation`
7. `should handle Apple "Hide My Email" feature`
8. `should handle OAuth network errors gracefully`
9. `should handle OAuth server errors`
10. `should handle expired OAuth state token`

## Root Cause

The tests attempt to:
1. Navigate to `/signup`
2. Click Google/Apple OAuth buttons
3. Wait for navigation to `accounts.google.com` or `appleid.apple.com`
4. These real OAuth providers don't respond in CI, causing 30+ second timeouts per test
5. Memory accumulates, eventually triggering Linux OOM killer

## Solution Approach

### Phase 1: Mock OAuth Callback Routes (Priority: High)

Instead of interacting with real OAuth providers, mock the callback behavior:

```typescript
// Mock OAuth response before clicking OAuth button
await page.route('**/auth/callback/google**', async (route) => {
  await route.fulfill({
    status: 302,
    headers: {
      'Location': '/onboarding/topics?auth=success&provider=google'
    }
  });
});

// Set mock auth tokens in localStorage before test
await page.evaluate(() => {
  localStorage.setItem('auth_token', 'mock_jwt_token');
  localStorage.setItem('user', JSON.stringify({
    id: 'mock-user-id',
    email: 'test@example.com',
    authMethod: 'GOOGLE'
  }));
});
```

### Phase 2: Re-enable Tests One at a Time

| Order | Test | Approach |
|-------|------|----------|
| 1 | `should handle OAuth network errors gracefully` | Easiest - just mock error response |
| 2 | `should handle OAuth server errors` | Mock 500 response |
| 3 | `should handle expired OAuth state token` | Mock invalid state response |
| 4 | `should handle Google OAuth cancellation` | Mock `error=access_denied` callback |
| 5 | `should handle Apple OAuth cancellation` | Same as above |
| 6 | `should complete Google OAuth signup flow` | Mock full success flow |
| 7 | `should auto-verify email for Google OAuth users` | Verify email flag in mock response |
| 8 | `should complete Apple OAuth signup flow` | Mock full success flow |
| 9 | `should handle Apple "Hide My Email" feature` | Mock relay email in response |
| 10 | `should handle Google OAuth with invalid state token` | Mock state mismatch |

### Phase 3: Add Backend OAuth Mock Service (Optional)

For more realistic testing, create a mock OAuth service:

```yaml
# docker-compose.e2e.yml
services:
  mock-oauth:
    image: node:20-alpine
    command: node /app/scripts/mock-oauth-server.js
    ports:
      - "9090:9090"
    environment:
      - MOCK_GOOGLE_CLIENT_ID=test-client-id
      - MOCK_APPLE_CLIENT_ID=test-client-id
```

## Implementation Steps

### Step 1: Create OAuth Test Utilities

Create `frontend/e2e/utils/oauth-mocks.ts`:

```typescript
import { Page } from '@playwright/test';

export const mockGoogleOAuthSuccess = async (page: Page, email: string) => {
  // Intercept OAuth button click to skip real OAuth
  await page.route('**/api/auth/google**', async (route) => {
    // Return mock authorization URL that points to our mock callback
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authUrl: `${page.url().split('/').slice(0, 3).join('/')}/auth/callback/google?code=mock_code&state=mock_state`
      })
    });
  });

  // Mock the callback endpoint
  await page.route('**/auth/callback/google**', async (route) => {
    // Simulate successful OAuth completion
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `
        <html>
          <script>
            localStorage.setItem('auth_token', 'mock_jwt_${Date.now()}');
            localStorage.setItem('user', JSON.stringify({
              id: 'mock-user-id',
              email: '${email}',
              authMethod: 'GOOGLE',
              emailVerified: true
            }));
            window.location.href = '/onboarding/topics';
          </script>
        </html>
      `
    });
  });
};

export const mockGoogleOAuthCancel = async (page: Page) => {
  await page.route('**/auth/callback/google**', async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set('error', 'access_denied');
    url.searchParams.set('error_description', 'User cancelled');
    await route.fulfill({
      status: 302,
      headers: { 'Location': `/signup?error=oauth_cancelled` }
    });
  });
};
```

### Step 2: Update Tests to Use Mocks

```typescript
// oauth-flow.spec.ts
import { mockGoogleOAuthSuccess, mockGoogleOAuthCancel } from './utils/oauth-mocks';

test.describe('OAuth Signup Flow', () => {
  test.describe('Google OAuth', () => {
    test('should complete Google OAuth signup flow', async ({ page }) => {
      const testEmail = `oauth-test-${Date.now()}@example.com`;

      // Setup mocks BEFORE navigating
      await mockGoogleOAuthSuccess(page, testEmail);

      // Navigate to signup
      await page.goto('/signup');

      // Click OAuth button (will use mocked routes)
      await page.getByRole('button', { name: /google/i }).click();

      // Verify redirect to onboarding
      await expect(page).toHaveURL(/\/onboarding\/topics/);
    });
  });
});
```

### Step 3: Re-enable Tests Incrementally

1. Uncomment one test at a time
2. Run locally: `npx playwright test oauth-flow.spec.ts`
3. Verify passes locally
4. Push and verify CI passes
5. Repeat for next test

## Timeline

| Week | Tasks |
|------|-------|
| 1 | Create `oauth-mocks.ts` utility, re-enable error handling tests (3 tests) |
| 2 | Re-enable cancellation tests (2 tests) |
| 3 | Re-enable success flow tests (3 tests) |
| 4 | Re-enable edge case tests (2 tests), cleanup |

## Success Criteria

- [ ] All 10 OAuth E2E tests pass in CI
- [ ] No individual test takes >5 seconds
- [ ] Total OAuth test suite completes in <30 seconds
- [ ] No OOM kills in E2E stage
- [ ] Tests are deterministic (no flaky failures)

## References

- Playwright Route Interception: https://playwright.dev/docs/network#modify-requests
- OAuth 2.0 Error Responses: https://www.oauth.com/oauth2-servers/authorization/the-authorization-response/
- PR #693: User Onboarding Implementation
