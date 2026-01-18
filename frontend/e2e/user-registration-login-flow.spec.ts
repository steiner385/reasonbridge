import { test, expect } from '@playwright/test';

/**
 * E2E test suite for User Registration and Login Flow
 *
 * Tests the complete user journey from registration to login:
 * - User registration with validation
 * - Successful registration redirect
 * - Login with newly created credentials
 * - Successful authentication and redirect to dashboard/home
 */

// Generate unique test user credentials
const generateTestUser = () => {
  const timestamp = Date.now();
  return {
    email: `test-user-${timestamp}@example.com`,
    username: `testuser${timestamp}`,
    password: 'SecurePassword123!',
  };
};

test.describe('User Registration and Login Flow', () => {
  test.skip('should complete full registration and login flow', async ({ page }) => {
    const testUser = generateTestUser();

    // Step 1: Navigate to registration page
    await page.goto('/register');

    // Verify we're on the registration page
    const registrationHeading = page.getByRole('heading', {
      name: /sign up|register|create account/i,
    });
    await expect(registrationHeading).toBeVisible();

    // Step 2: Fill out registration form
    const emailInput = page.getByLabel(/email/i);
    const usernameInput = page.getByLabel(/username/i);
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await emailInput.fill(testUser.email);
    await usernameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    // Step 3: Submit registration form
    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    await registerButton.click();

    // Step 4: Wait for registration to complete and redirect
    // This could redirect to login page, dashboard, or show a success message
    await page.waitForURL(/\/(login|dashboard|home|profile)/, { timeout: 10000 });

    // Step 5: If redirected to login, proceed with login
    // If redirected to dashboard/home, registration included auto-login
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      // Manual login required
      await test.step('Login with newly created credentials', async () => {
        // Fill login form
        const loginEmailInput = page.getByLabel(/email/i);
        const loginPasswordInput = page.getByLabel(/^password$/i);

        await loginEmailInput.fill(testUser.email);
        await loginPasswordInput.fill(testUser.password);

        // Submit login
        const loginButton = page.getByRole('button', { name: /sign in|log in/i });
        await loginButton.click();

        // Wait for successful login redirect
        await page.waitForURL(/\/(dashboard|home|profile)/, { timeout: 10000 });
      });
    }

    // Step 6: Verify successful authentication
    // Check for authenticated state indicators
    // This could be a user menu, profile link, or logout button
    const authenticatedIndicators = [
      page.getByRole('button', { name: /log out|sign out/i }),
      page.getByRole('link', { name: /profile|account/i }),
      page.getByText(new RegExp(testUser.username, 'i')),
    ];

    // At least one indicator should be visible
    let foundIndicator = false;
    for (const indicator of authenticatedIndicators) {
      const count = await indicator.count();
      if (count > 0 && (await indicator.first().isVisible())) {
        foundIndicator = true;
        break;
      }
    }

    expect(foundIndicator).toBeTruthy();
  });

  test.skip('should prevent registration with existing email', async ({ page }) => {
    const testUser = generateTestUser();

    // First registration
    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const usernameInput = page.getByLabel(/username/i);
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await emailInput.fill(testUser.email);
    await usernameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    await registerButton.click();

    // Wait for first registration to complete
    await page.waitForURL(/\/(login|dashboard|home|profile)/, { timeout: 10000 });

    // Attempt second registration with same email
    await page.goto('/register');

    await emailInput.fill(testUser.email);
    await usernameInput.fill(`different${testUser.username}`);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    await registerButton.click();

    // Should show error message about existing email
    const errorMessage = page.getByText(/email already exists|email is already registered/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test.skip('should validate password requirements during registration', async ({ page }) => {
    const testUser = generateTestUser();

    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const usernameInput = page.getByLabel(/username/i);
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Fill form with weak password
    await emailInput.fill(testUser.email);
    await usernameInput.fill(testUser.username);
    await passwordInput.fill('weak');
    await confirmPasswordInput.fill('weak');

    // Blur to trigger validation
    await confirmPasswordInput.blur();

    // Should show password requirement error
    const passwordError = page.getByText(/password must be at least|password is too short/i);
    await expect(passwordError).toBeVisible();
  });

  test.skip('should validate password confirmation match', async ({ page }) => {
    const testUser = generateTestUser();

    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const usernameInput = page.getByLabel(/username/i);
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Fill form with mismatched passwords
    await emailInput.fill(testUser.email);
    await usernameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill('DifferentPassword123!');

    // Blur to trigger validation
    await confirmPasswordInput.blur();

    // Should show password mismatch error
    const mismatchError = page.getByText(/passwords do not match|passwords must match/i);
    await expect(mismatchError).toBeVisible();
  });

  test.skip('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i);

    // Attempt login with non-existent credentials
    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('WrongPassword123!');

    const loginButton = page.getByRole('button', { name: /sign in|log in/i });
    await loginButton.click();

    // Should show authentication error
    const errorMessage = page.getByText(/invalid credentials|incorrect email or password/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test.skip('should navigate between login and registration pages', async ({ page }) => {
    // Start at login page
    await page.goto('/login');

    // Find and click "Create account" link
    const createAccountLink = page.getByRole('link', { name: /create one|sign up|register/i });
    await expect(createAccountLink).toBeVisible();
    await createAccountLink.click();

    // Should navigate to registration page
    await expect(page).toHaveURL(/\/register/);
    const registrationHeading = page.getByRole('heading', {
      name: /sign up|register|create account/i,
    });
    await expect(registrationHeading).toBeVisible();

    // Find and click "Already have account" link
    const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    // Should navigate back to login page
    await expect(page).toHaveURL(/\/login/);
    const loginHeading = page.getByRole('heading', { name: /sign in|log in/i });
    await expect(loginHeading).toBeVisible();
  });
});
