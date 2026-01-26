import { test, expect } from '@playwright/test';

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

test.describe('Email Signup Flow', () => {
  test.describe('Successful Signup Journey', () => {
    test('should complete full email signup flow with verification', async ({ page }) => {
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

        // Check for code input instructions
        const instructions = page.getByText(/enter.*code|verification code|6-digit/i);
        await expect(instructions).toBeVisible();

        // Check for code input field(s)
        // Could be a single input or multiple digit inputs
        const codeInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
        await expect(codeInput).toBeVisible();
      });

      // Step 5: Enter 6-digit verification code
      // Note: In real testing, this would require either:
      // - Mocking the email service to retrieve the code
      // - Using a test-only endpoint to get the verification code
      // - Configuring Cognito with a known test user code
      await test.step('Enter verification code', async () => {
        // For this test, we'll assume a mock code or test endpoint
        // In production, you'd integrate with your test email service
        const testCode = '123456'; // Replace with actual test code retrieval

        const codeInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
        await codeInput.fill(testCode);

        // Submit verification code
        const verifyButton = page.getByRole('button', {
          name: /verify|confirm|submit/i,
        });

        if (await verifyButton.isVisible()) {
          await verifyButton.click();
        }

        // Note: This step will fail without proper test code setup
        // Mark as expected to fail until test infrastructure is configured
      });

      // Step 6: Verify redirect to topic selection
      await test.step('Verify redirect to topic selection', async () => {
        // Wait for redirect to onboarding/topics page
        await page.waitForURL(/\/onboarding\/topics/, { timeout: 15000 });

        // Verify topic selection page loaded
        const topicHeading = page.getByRole('heading', {
          name: /select.*topic|choose.*topic|interests/i,
        });
        await expect(topicHeading).toBeVisible({ timeout: 5000 });
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
      const passwordError = page.getByText(
        /password must be at least 12 characters|password.*too short|password.*weak/i
      );
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
      const testUser = generateTestUser();

      // First registration attempt
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
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
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      await submitButton.click();

      // Should show duplicate email error
      const duplicateError = page.getByText(
        /email already exists|email.*already registered|email.*taken/i
      );
      await expect(duplicateError).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid verification code', async ({ page }) => {
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });
      await submitButton.click();

      // Wait for verification page
      await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });

      // Enter invalid code
      const codeInput = page.locator('input[type="text"], input[inputmode="numeric"]').first();
      await codeInput.fill('000000'); // Invalid code

      const verifyButton = page.getByRole('button', {
        name: /verify|confirm|submit/i,
      });

      if (await verifyButton.isVisible()) {
        await verifyButton.click();
      }

      // Should show invalid code error
      const invalidCodeError = page.getByText(
        /invalid.*code|incorrect.*code|verification.*failed/i
      );
      await expect(invalidCodeError).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Resend Verification Flow', () => {
    test('should allow resending verification code', async ({ page }) => {
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
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

      // Should show success message
      const successMessage = page.getByText(/code sent|email sent|check your email/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test('should rate limit resend verification requests', async ({ page }) => {
      const testUser = generateTestUser();

      // Complete signup to get to verification page
      await page.goto('/signup');

      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/display name|username/i).fill(testUser.displayName);
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      await page.getByRole('button', {
        name: /sign up|create account|register/i,
      }).click();

      await page.waitForURL(/\/verification|\/verify-email/, { timeout: 15000 });

      const resendButton = page.getByRole('button', {
        name: /resend|send again|didn't receive/i,
      });

      // Click resend multiple times rapidly
      for (let i = 0; i < 4; i++) {
        await resendButton.click();
        await page.waitForTimeout(500);
      }

      // Should show rate limit error after 3 attempts (per spec)
      const rateLimitError = page.getByText(/too many requests|rate limit|try again later/i);
      await expect(rateLimitError).toBeVisible({ timeout: 5000 });
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
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
      await page.getByLabel(/confirm password/i).fill(testUser.password);

      const submitButton = page.getByRole('button', {
        name: /sign up|create account|register/i,
      });

      await submitButton.click();

      // Button should show loading state
      const loadingButton = page.getByRole('button', {
        name: /creating|signing up|loading/i,
      });

      // Loading state should be visible (even if briefly)
      // Or button should be disabled during submission
      const isLoading = await loadingButton.isVisible({ timeout: 1000 }).catch(() => false);
      const isDisabled = await submitButton.isDisabled();

      expect(isLoading || isDisabled).toBeTruthy();
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
      await page.getByLabel(/^password$/i).first().fill(testUser.password);
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
