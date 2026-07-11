import { test, expect } from '@playwright/test';

/**
 * E2E tests for the password reset journey.
 *
 * Covers:
 * - /forgot-password: page render, form validation, successful submission
 * - /reset-password: page render, form validation, invalid-code error, success state
 * - Expired/invalid token handling (UI-only — no actual email required)
 *
 * Full end-to-end flow (request → email → reset → login) requires either
 * a MailHog/SMTP intercept or the test-hook endpoint at /auth/test/reset-code.
 * Those paths are guarded by TEST_HOOK_AVAILABLE to skip in environments
 * that haven't wired them up.
 */

const TEST_HOOK_AVAILABLE = process.env['E2E_TEST_HOOKS'] === 'true';

// ---------------------------------------------------------------------------
// /forgot-password
// ---------------------------------------------------------------------------

test.describe('Forgot Password Page (/forgot-password)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
  });

  test('renders the forgot-password form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset code/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to login/i })).toBeVisible();
  });

  test('shows validation error for empty email submission', async ({ page }) => {
    await page.getByRole('button', { name: /send reset code/i }).click();
    // React Hook Form + Zod should surface an inline error before network request
    const error = page.getByText(/valid email/i).or(page.getByText(/required/i));
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('shows validation error for malformed email', async ({ page }) => {
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByRole('button', { name: /send reset code/i }).click();
    const error = page.getByText(/valid email/i);
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('shows the check-your-email state after submitting a valid email', async ({ page }) => {
    // The backend always returns 200 (anti-enumeration), so any valid email
    // transitions to the "Check Your Email" success screen.
    await page.getByLabel(/email/i).fill('any-address@example.com');
    await page.getByRole('button', { name: /send reset code/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10000,
    });
    // "for" scopes this to the success-screen paragraph ("If an account exists
    // for <email>...") and avoids a strict-mode clash with the transient toast
    // ("If an account exists, a reset code has been sent...").
    await expect(page.getByText(/if an account exists for/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /enter reset code/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /try different email/i })).toBeVisible();
  });

  test('can go back and try a different email', async ({ page }) => {
    await page.getByLabel(/email/i).fill('first@example.com');
    await page.getByRole('button', { name: /send reset code/i }).click();
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /try different email/i }).click();
    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('"Enter Reset Code" button navigates to /reset-password', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByRole('button', { name: /send reset code/i }).click();
    await expect(page.getByRole('button', { name: /enter reset code/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: /enter reset code/i }).click();
    await expect(page).toHaveURL(/\/reset-password/, { timeout: 5000 });
  });

  test('"Back to Login" link navigates away from the page', async ({ page }) => {
    await page.getByRole('link', { name: /back to login/i }).click();
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// /reset-password
// ---------------------------------------------------------------------------

test.describe('Reset Password Page (/reset-password)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password');
    await page.waitForLoadState('domcontentloaded');
  });

  test('renders the reset-password form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/reset code/i)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
  });

  test('shows validation error when code is not 6 digits', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/reset code/i).fill('12');
    await page.getByLabel(/new password/i).fill('StrongP@ss123!');
    await page.getByLabel(/confirm password/i).fill('StrongP@ss123!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/6 digits/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows validation error when code contains non-digits', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/reset code/i).fill('abc123');
    await page.getByLabel(/new password/i).fill('StrongP@ss123!');
    await page.getByLabel(/confirm password/i).fill('StrongP@ss123!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/6 digits/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows validation error when password is too short', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/reset code/i).fill('123456');
    await page.getByLabel(/new password/i).fill('Short1!');
    await page.getByLabel(/confirm password/i).fill('Short1!');
    await page.getByLabel(/new password/i).blur();
    await expect(page.getByText(/at least 12 characters/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/reset code/i).fill('123456');
    await page.getByLabel(/new password/i).fill('StrongP@ss123!');
    await page.getByLabel(/confirm password/i).fill('DifferentP@ss123!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows an error toast when code is invalid (backend rejection)', async ({ page }) => {
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/reset code/i).fill('000000');
    await page.getByLabel(/new password/i).fill('StrongP@ss123!');
    await page.getByLabel(/confirm password/i).fill('StrongP@ss123!');
    await page.getByRole('button', { name: /reset password/i }).click();

    // Backend should reject code 000000; expect an error notification
    const errorIndicator = page
      .getByRole('alert')
      .or(page.getByText(/invalid|expired|failed|error/i));
    await expect(errorIndicator).toBeVisible({ timeout: 10000 });
  });

  test('"Request a new code" link navigates to /forgot-password', async ({ page }) => {
    await page.getByRole('link', { name: /request a new code/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 5000 });
  });

  test('"Back to Login" link navigates to login', async ({ page }) => {
    await page.getByRole('link', { name: /back to login/i }).click();
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Full journey: request → reset → login
// Requires E2E_TEST_HOOKS=true and a /auth/test/reset-code backend hook.
// ---------------------------------------------------------------------------

test.describe('Full password reset journey (requires test hooks)', () => {
  test.skip(!TEST_HOOK_AVAILABLE, 'Skipped: E2E_TEST_HOOKS not enabled');

  test('user can reset password via emailed code and log in with the new password', async ({
    page,
  }) => {
    const testEmail = `e2e-reset-${Date.now()}@example.com`;
    const newPassword = 'NewStrongP@ss99!';

    // Step 1: Request a reset code
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByRole('button', { name: /send reset code/i }).click();
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10000,
    });

    // Step 2: Retrieve the code via test hook endpoint
    const hookResponse = await page.request.get(
      `/auth/test/reset-code?email=${encodeURIComponent(testEmail)}`,
    );
    expect(hookResponse.ok()).toBeTruthy();
    const { code } = await hookResponse.json();
    expect(typeof code).toBe('string');
    expect(code).toHaveLength(6);

    // Step 3: Submit the reset form with the real code
    await page.goto('/reset-password');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/reset code/i).fill(code);
    await page.getByLabel(/new password/i).fill(newPassword);
    await page.getByLabel(/confirm password/i).fill(newPassword);
    await page.getByRole('button', { name: /reset password/i }).click();

    // Step 4: Verify success state
    await expect(page.getByRole('heading', { name: /password reset successful/i })).toBeVisible({
      timeout: 10000,
    });

    // Step 5: Log in with the new password
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/email/i).fill(testEmail);
    await dialog.locator('#login-password').fill(newPassword);
    await dialog.getByRole('button', { name: /^log in$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible({
      timeout: 10000,
    });
  });
});
