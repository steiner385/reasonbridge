import { test, expect } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/demo-auth';

/**
 * E2E tests for parental consent flows.
 *
 * Covers the three routes identified as missing functional coverage:
 *   - /parental-consent/pending   (minor user waiting for parent to consent)
 *   - /parental-consent/verify/:token (parent verifies consent via emailed link)
 *   - /parental-dashboard/:token  (parent views child activity, can withdraw consent)
 *
 * Most paths can be exercised with invalid/fake tokens to verify error states.
 * The happy-path consent verification requires a real token produced by the
 * backend; that path is gated behind E2E_TEST_HOOKS=true.
 */

const FAKE_TOKEN = 'invalid-token-xyz-000';

// ---------------------------------------------------------------------------
// /parental-consent/pending
// ---------------------------------------------------------------------------

test.describe('/parental-consent/pending', () => {
  test('unauthenticated user is redirected away from the pending page', async ({ page }) => {
    await page.goto('/parental-consent/pending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Page redirects unauthenticated visitors to home
    await expect(page).toHaveURL(/^\/$|\/login/, { timeout: 8000 });
  });

  test('authenticated user sees the consent-pending screen', async ({ page }) => {
    // Log in as a demo user (any regular user is acceptable — the page shows
    // consent status for the logged-in account)
    await loginWithDemoAccount(page, 'Alice Anderson');
    await page.goto('/parental-consent/pending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // The page should either show the consent-pending card OR redirect to home
    // if Alice already has verified consent (seeded data may vary).
    const currentUrl = page.url();
    const isOnPendingPage = /parental-consent\/pending/.test(currentUrl);

    if (isOnPendingPage) {
      // Page loaded — verify key elements
      const heading = page.getByRole('heading', { name: /parental consent required/i });
      const homeButton = page.getByRole('button', { name: /back to home/i });
      await expect(heading).toBeVisible({ timeout: 8000 });
      await expect(homeButton).toBeVisible();
    } else {
      // Redirect happened (consent already satisfied or not required) — that is
      // also a valid outcome; the page behaves correctly either way.
      await expect(page).toHaveURL(/^\/$|\/topics/, { timeout: 8000 });
    }
  });
});

// ---------------------------------------------------------------------------
// /parental-consent/verify/:token  — parent-facing consent verification
// ---------------------------------------------------------------------------

test.describe('/parental-consent/verify/:token', () => {
  test('accessing the page with a missing token shows an error', async ({ page }) => {
    // Route requires a :token param; accessing the parent path without one
    // should fall through to a not-found or error state.
    await page.goto('/parental-consent/verify/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Acceptable outcomes: 404 page, error message, or redirect to home.
    const pageText = (await page.textContent('body')) ?? '';
    const hasErrorIndicator =
      /not found|verification failed|invalid|expired|error|go to homepage/i.test(pageText);
    expect(hasErrorIndicator).toBeTruthy();
  });

  test('accessing the page with an invalid token shows a verification-failed error', async ({
    page,
  }) => {
    await page.goto(`/parental-consent/verify/${FAKE_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // The page fetches consent details for the token on mount; an invalid token
    // should transition to the error state.
    await expect(
      page.getByRole('heading', { name: /verification failed/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/invalid or expired|could not verify/i)).toBeVisible();
    await expect(page.getByText(/consent link may have expired/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /go to homepage/i })).toBeVisible();
  });

  test('"Go to Homepage" button on error state navigates to /', async ({ page }) => {
    await page.goto(`/parental-consent/verify/${FAKE_TOKEN}`);
    await expect(page.getByRole('heading', { name: /verification failed/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /go to homepage/i }).click();
    await expect(page).toHaveURL(/^\/$/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// /parental-dashboard/:token  — parent's management dashboard
// ---------------------------------------------------------------------------

test.describe('/parental-dashboard/:token', () => {
  test('accessing the page with an invalid token shows an error card', async ({ page }) => {
    await page.goto(`/parental-dashboard/${FAKE_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // Page fetches child summary; an invalid token yields a 404 → error state.
    await expect(page.getByRole('heading', { name: /error/i })).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/invalid or expired dashboard link/i),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /go to home/i })).toBeVisible();
  });

  test('"Go to Home" button on error state navigates to /', async ({ page }) => {
    await page.goto(`/parental-dashboard/${FAKE_TOKEN}`);
    await expect(page.getByRole('heading', { name: /error/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /go to home/i }).click();
    await expect(page).toHaveURL(/^\/$/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Happy-path consent verification (requires test hooks)
// ---------------------------------------------------------------------------

test.describe('Happy-path parental consent verification (requires test hooks)', () => {
  test.skip(
    process.env['E2E_TEST_HOOKS'] !== 'true',
    'Skipped: E2E_TEST_HOOKS not enabled — needs backend hook to generate a valid consent token',
  );

  test('parent can verify consent via real token and see the success screen', async ({ page }) => {
    // Step 1: Obtain a real consent token from the test hook
    const hookResponse = await page.request.post('/auth/test/parental-consent-token', {
      data: { childEmail: 'demo-new@reasonbridge.demo' },
    });
    expect(hookResponse.ok()).toBeTruthy();
    const { token } = await hookResponse.json();
    expect(typeof token).toBe('string');

    // Step 2: Navigate to the verify page as the parent
    await page.goto(`/parental-consent/verify/${token}`);
    await page.waitForLoadState('domcontentloaded');

    // Step 3: Review state — should show privacy policy summary and consent checkbox
    await expect(
      page.getByRole('heading', { name: /parental consent request/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('checkbox')).toBeVisible();

    // Step 4: Check the consent checkbox and grant consent
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: /grant consent/i })).toBeEnabled();
    await page.getByRole('button', { name: /grant consent/i }).click();

    // Step 5: Verify success screen
    await expect(
      page.getByRole('heading', { name: /consent verified/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /visit reasonbridge/i })).toBeVisible();
  });

  test('parent can view child activity summary on the dashboard', async ({ page }) => {
    // Obtain a valid dashboard token via the same mechanism as consent verification
    const hookResponse = await page.request.get(
      '/auth/test/parental-dashboard-token?childEmail=demo-new@reasonbridge.demo',
    );
    expect(hookResponse.ok()).toBeTruthy();
    const { token } = await hookResponse.json();

    await page.goto(`/parental-dashboard/${token}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /parental dashboard/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/topics participated/i)).toBeVisible();
    await expect(page.getByText(/responses posted/i)).toBeVisible();
  });
});
