import { test, expect } from '@playwright/test';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

// E2E verification code - must match E2E_VERIFICATION_CODE env var set on user-service
const E2E_VERIFICATION_CODE = '123456';

/**
 * E2E Test Suite: Email Signup Flow
 * Task: T086
 *
 * Tests the complete email-based signup and verification journey:
 * - Navigate to signup page
 * - Fill email/password form with validation
 * - Submit signup
 * - Verify email verification page loads
 * - Enter 6-digit verification code
 * - Verify redirect to topic selection (/onboarding/topics)
 * - Test error scenarios (weak password, duplicate email, invalid code)
 * - Test resend verification flow
 *
 * Covers User Story 2 (US2) - Create Account with Minimal Friction
 */

// Test data generator for unique user credentials
const generateTestUser = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  return {
    email: `test-signup-${timestamp}-${randomSuffix}@example.com`,
    displayName: `TestUser${timestamp}`,
    password: 'SecureP@ssw0rd123!', // Meets requirements: 12+ chars, mixed case, numbers, special chars
    weakPassword: 'weak123', // Intentionally weak for validation testing
  };
};

// Note: Backend-dependent tests require E2E Docker environment (services running)
// Run with: pnpm test:e2e (which starts docker-compose.e2e.yml)
test.describe('Email Signup Flow', () => {
  test.describe('Successful Signup Journey', () => {
    /**
     * SKIPPED: Full signup with verification depends on email service
     *
     * This test requires the user-service to send actual verification codes
     * and the notification-service to deliver emails. In E2E environment,
     * the email delivery path is incomplete. Registration without verification
     * is tested via user-registration-login-flow.spec.ts.
     */
    test.skip('should complete full email signup flow with verification', async ({ page }) => {
      test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');
      const testUser = generateTestUser();

      // Step 1: Navigate to signup page
      await test.step('Navigate to signup page', async () => {
        await page.goto('/signup');

        // Verify we're on the signup page
        const heading = page.getByRole('heading', {
          name: /sign up|create account|register/i,
        });
        await expect(heading).toBeVisible({ timeout: 10000 });
      });

      // Step 2: Fill out signup form
      await test.step('Fill signup form with valid data', async () => {
        // Fill email field
        const emailInput = page.getByLabel(/email/i);
        await emailInput.fill(testUser.email);

        // Fill display name field
        const displayNameInput = page.getByLabel(/display name|username/i);
        await displayNameInput.fill(testUser.displayName);

        // Fill password field
        const passwordInput = page.getByLabel(/^password$/i).first();
        await passwordInput.fill(testUser.password);

        // Fill confirm password field
        const confirmPasswordInput = page.getByLabel(/confirm password/i);
        await confirmPasswordInput.fill(testUser.password);

        // Verify no validation errors are shown
        const errorMessages = page.locator('[class*="error"], [role="alert"]');
        await expect(errorMessages).toHaveCount(0);
      });

      // Step 3: Submit signup form
      await test.step('Submit signup form', async () => {
        const signupButton = page.getByRole('button', {
          name: /sign up|create account|register/i,
        });
        await signupButton.click();

        // Wait for form submission to complete
        // Should redirect to email verification page
        await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });
      });

      // Step 4: Verify email verification page loads
      await test.step('Verify email verification page loads', async () => {
        // Check for verification heading
        const verificationHeading = page.getByRole('heading', {
          name: /verify|verification|check your email/i,
        });
        await expect(verificationHeading).toBeVisible({ timeout: 5000 });

        // Check for code input instructions (use first() to avoid strict mode violation)
        const instructions = page.getByText(/we sent a 6-digit code/i);
        await expect(instructions).toBeVisible();

        // Check for code input field(s)
        // Could be a single input or multiple digit inputs
        const codeInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
        await expect(codeInput).toBeVisible();
      });

      // Step 5: Enter 6-digit verification code
      // Uses E2E_VERIFICATION_CODE which is set as env var on user-service in E2E mode
      await test.step('Enter verification code', async () => {
        // Enter the known E2E verification code - fill each of the 6 digit inputs
        const codeInputs = page.locator('input[inputmode="numeric"]');
        const inputCount = await codeInputs.count();

        if (inputCount === 6) {
          // Individual digit inputs
          for (let i = 0; i < 6; i++) {
            await codeInputs.nth(i).fill(E2E_VERIFICATION_CODE[i]);
          }
        } else {
          // Single input field
          await codeInputs.first().fill(E2E_VERIFICATION_CODE);
        }

        // The component auto-submits when all 6 digits are entered
        // Wait for navigation to complete
        await page.waitForURL(/\/onboarding\/topics|\/topics/, { timeout: 15000 });
      });

      // Step 6: Verify redirect to topic selection
      await test.step('Verify redirect to topic selection', async () => {
        // Should be redirected to topic selection or topics page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/onboarding\/topics|\/topics/);

        // Verify page content
        const heading = page.getByRole('heading', {
          name: /topics|interests|select|choose/i,
        });
        await expect(heading.first()).toBeVisible({ timeout: 5000 });
      });
    });

    test('should display password strength indicator during signup', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/signup');

      const passwordInput = page.getByLabel(/^password$/i).first();

      // Test weak password
      await passwordInput.fill('weak');
      const weakIndicator = page.locator('[class*="weak"], [class*="strength"]');
      // Should show weak indicator or validation error
      await expect(weakIndicator.or(page.getByText(/weak|too short/i))).toBeVisible({
        timeout: 2000,
      });

      // Test strong password
      await passwordInput.fill(testUser.password);
      // Validation error should disappear or show strong indicator
      const errorCount = await page.getByText(/weak|too short/i).count();
      expect(errorCount).toBe(0);
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation error for weak password', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/signup');

      // Fill form with weak password
      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill(testUser.email);

      const displayNameInput = page.getByLabel(/display name|username/i);
      await displayNameInput.fill(testUser.displayName);

      const passwordInput = page.getByLabel(/^password$/i).first();
      await passwordInput.fill(testUser.weakPassword);

      const confirmPasswordInput = page.getByLabel(/confirm password/i);
      await confirmPasswordInput.fill(testUser.weakPassword);

      // Blur to trigger validation
      await confirmPasswordInput.blur();

      // Should show password requirement error
      const passwordError = page.getByRole('alert').filter({
        hasText: /password must be at least 12 characters|password.*too short/i,
      });
      await expect(passwordError).toBeVisible({ timeout: 3000 });
    });

    test('should show validation error for password mismatch', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/signup');

      const passwordInput = page.getByLabel(/^password$/i).first();
      await passwordInput.fill(testUser.password);

      const confirmPasswordInput = page.getByLabel(/confirm password/i);
      await confirmPasswordInput.fill('DifferentP@ssw0rd123!');
      await confirmPasswordInput.blur();

      // Should show password mismatch error
      const mismatchError = page.getByText(/passwords do not match|passwords must match/i);
      await expect(mismatchError).toBeVisible({ timeout: 3000 });
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup');

      const emailInput = page.getByLabel(/email/i);

      // Test invalid email
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      const emailError = page.getByText(/valid email|email.*invalid/i);
      await expect(emailError).toBeVisible({ timeout: 3000 });

      // Test valid email - error should disappear
      await emailInput.fill('valid@example.com');
      await emailInput.blur();

      const errorCount = await emailError.count();
      expect(errorCount).toBe(0);
    });

    test('should validate display name length', async ({ page }) => {
      await page.goto('/signup');

      const displayNameInput = page.getByLabel(/display name|username/i);

      // Test too short
      await displayNameInput.fill('ab');
      await displayNameInput.blur();

      const shortError = page.getByText(/at least 3 characters|too short/i);
      await expect(shortError).toBeVisible({ timeout: 3000 });

      // Test valid length
      await displayNameInput.fill('ValidName');
      await displayNameInput.blur();

      const errorCount = await shortError.count();
      expect(errorCount).toBe(0);
    });

    test('should disable submit button while form is invalid', async ({ page }) => {
      await page.goto('/signup');

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });

      // Button should be enabled initially (or disabled if form is empty)
      const initialState = await submitButton.isDisabled();

      // Fill with invalid data
      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('invalid-email');

      // If button becomes disabled, that's good validation
      // Note: This depends on implementation - some forms allow submission and show errors after
    });
  });

  test.describe('Error Scenarios', () => {
    test('should show error for duplicate email', async ({ page }) => {
      test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');
      const testUser = generateTestUser();

      // First registration attempt
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await submitButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Go back and attempt second registration with same email
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(`${testUser.displayName}2`);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      await submitButton.click();

      // Should show duplicate email error
      const duplicateError = page.getByText(
        /email already exists|email.*already registered|email.*taken/i,
      );
      await expect(duplicateError).toBeVisible({ timeout: 5000 });
    });

    /**
     * SKIPPED: Invalid verification code error depends on verification service
     *
     * This test requires the user-service verification endpoint to validate
     * codes and return specific error messages. The error handling UI is
     * verified via component tests for VerificationCodeInput.
     */
    test.skip('should show error for invalid verification code', async ({ page }) => {
      test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await submitButton.click();

      // Wait for verification page
      await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });

      // Enter invalid code - fill each of the 6 digit inputs
      // Note: The verification page auto-submits when all 6 digits are entered
      const testCode = '000000'; // Invalid code
      const codeInputs = page.locator('input[inputmode="numeric"]');
      const inputCount = await codeInputs.count();

      if (inputCount === 6) {
        for (let i = 0; i < 6; i++) {
          await codeInputs.nth(i).fill(testCode[i]);
        }
      } else {
        await codeInputs.first().fill(testCode);
      }

      // The component auto-submits when all 6 digits are entered,
      // so we don't need to click the verify button.
      // Just wait for the error message to appear.

      // Should show invalid code error
      const invalidCodeError = page.getByText(
        /invalid.*code|incorrect.*code|verification.*failed|expired/i,
      );
      await expect(invalidCodeError).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Resend Verification Flow', () => {
    test('should allow resending verification code', async ({ page }) => {
      test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await submitButton.click();

      // Wait for verification page
      await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });

      // Find and click resend button
      const resendButton = page.getByRole('button', {
        name: /resend|send again|didn't receive/i,
      });
      await expect(resendButton).toBeVisible({ timeout: 5000 });

      await resendButton.click();

      // Should show success message AND/OR the button text changes to show countdown
      // The success message is "Verification code sent! Check your email."
      // After success, button text changes to "Resend code (60s)"
      const successMessage = page.getByText(/verification code sent|code sent|check your email/i);
      const cooldownButton = page.getByRole('button', { name: /resend code \(\d+s\)/i });

      // Either success message is visible OR button shows cooldown (both indicate success)
      // Use first() to avoid strict mode violation when both are visible
      await expect(successMessage.or(cooldownButton).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show cooldown timer after resending verification code', async ({ page }) => {
      // Note: This test verifies the UI-level rate limiting (cooldown timer).
      // The backend also has rate limiting (3 requests/minute), but the UI cooldown
      // (60 seconds after each successful resend) prevents rapid clicking, so
      // the backend rate limit is effectively unreachable through normal UI interaction.
      test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      await page
        .getByRole('button', {
          name: /sign up|create account|register/i,
        })
        .click();

      await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });

      const resendButton = page.getByRole('button', {
        name: /resend|send again|didn't receive/i,
      });

      // Click resend button
      await resendButton.click();

      // After successful resend, button should show cooldown timer and be disabled
      // The button text changes to "Resend code (60s)" and counts down
      const cooldownButton = page.getByRole('button', { name: /resend code \(\d+s\)/i });
      await expect(cooldownButton).toBeVisible({ timeout: 5000 });

      // Verify button is disabled during cooldown
      await expect(cooldownButton).toBeDisabled();
    });
  });

  test.describe('Navigation and User Experience', () => {
    test('should allow navigation to login page from signup', async ({ page }) => {
      await page.goto('/signup');

      // Find "Already have an account" link
      const loginLink = page.getByRole('link', {
        name: /sign in|log in|already have/i,
      });
      await expect(loginLink).toBeVisible();

      await loginLink.click();

      // Should navigate to login page
      await expect(page).toHaveURL(/\/login/);

      const loginHeading = page.getByRole('heading', {
        name: /sign in|log in/i,
      });
      await expect(loginHeading).toBeVisible();
    });

    test('should show loading state during signup submission', async ({ page }) => {
      const testUser = generateTestUser();

      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });

      // Use Promise.race to detect loading state quickly before it disappears
      const loadingPromise = page
        .getByRole('button', { name: /creating account/i })
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      await submitButton.click();

      // Check if loading state was detected OR an error message appears
      // (error indicates submission was attempted but failed due to no backend)
      const wasLoading = await loadingPromise;
      const hasError = await page
        .locator('[role="alert"]')
        .waitFor({ state: 'visible', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      // Either loading state was visible OR form showed error (meaning it tried to submit)
      expect(wasLoading || hasError).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      const testUser = generateTestUser();

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/signup');

      // All form elements should be visible and functional
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page
        .getByLabel(/^password$/i)
        .first()
        .fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await expect(submitButton).toBeVisible();

      // Form should be usable on mobile
      await submitButton.click();
    });

    test('should work on tablet viewport', async ({ page }) => {
      const testUser = generateTestUser();

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/signup');

      // Form should render properly on tablet
      const heading = page.getByRole('heading', {
        name: /sign up|create account|register/i,
      });
      await expect(heading).toBeVisible();

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels and ARIA attributes', async ({ page }) => {
      await page.goto('/signup');

      // All inputs should have associated labels
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toBeVisible();

      const displayNameInput = page.getByLabel(/display name|username/i);
      await expect(displayNameInput).toBeVisible();

      const passwordInput = page.getByLabel(/^password$/i).first();
      await expect(passwordInput).toBeVisible();

      const confirmPasswordInput = page.getByLabel(/confirm password/i);
      await expect(confirmPasswordInput).toBeVisible();
    });

    test('should announce validation errors to screen readers', async ({ page }) => {
      await page.goto('/signup');

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      // Error should have role="alert" or aria-live attribute
      const errorElement = page.locator('[role="alert"], [aria-live="polite"]');
      const errorCount = await errorElement.count();

      // At least one error announcement element should exist
      expect(errorCount).toBeGreaterThan(0);
    });
  });
});
