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

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('User Registration and Login Flow', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test('should complete full registration and login flow', async ({ page }) => {
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
    const displayNameInput = page.getByLabel(/display name/i);
    const passwordInput = page.getByLabel(/^password/i).first();
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await emailInput.fill(testUser.email);
    await displayNameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    // Step 3: Submit registration form
    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    await registerButton.click();

    // Step 4: Wait for registration to complete and redirect
    // This could redirect to login page, dashboard, home, or landing page (/)
    // Note: The app redirects to root (/) after registration
    await page.waitForURL(/(\/$|\/login|\/dashboard|\/home|\/profile)/, { timeout: 10000 });

    // Step 5: Login after registration
    // Registration redirects to landing page (/) - navigate to login page
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      await page.goto('/login');
    }

    await test.step('Login with newly created credentials', async () => {
      // Fill login form
      const loginEmailInput = page.getByLabel(/email/i);
      const loginPasswordInput = page.getByLabel(/^password/i).first();

      await loginEmailInput.fill(testUser.email);
      await loginPasswordInput.fill(testUser.password);

      // Submit login
      const loginButton = page.getByRole('button', { name: /sign in|log in/i });
      await loginButton.click();

      // Wait for successful login redirect (navigates to / which is the home page)
      await page.waitForURL(/^http:\/\/[^\/]+\/?$/, { timeout: 10000 });
    });

    // Step 6: Verify successful authentication
    // The login was successful if we reached the home page (/)
    // Check that auth token was stored in localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(authToken).toBeTruthy();
    expect(authToken!.length).toBeGreaterThan(0);
  });

  test('should prevent registration with existing email', async ({ page }) => {
    const testUser = generateTestUser();

    // First registration
    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const displayNameInput = page.getByLabel(/display name/i);
    const passwordInput = page.getByLabel(/^password/i).first();
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await emailInput.fill(testUser.email);
    await displayNameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    await registerButton.click();

    // Wait for first registration to complete (redirects to landing page /)
    await page.waitForURL(/(\/$|\/login|\/dashboard|\/home|\/profile)/, { timeout: 10000 });

    // Attempt second registration with same email
    await page.goto('/register');

    // Re-query form elements on new page
    const emailInput2 = page.getByLabel(/email/i);
    const displayNameInput2 = page.getByLabel(/display name/i);
    const passwordInput2 = page.getByLabel(/^password/i).first();
    const confirmPasswordInput2 = page.getByLabel(/confirm password/i);
    const registerButton2 = page.getByRole('button', { name: /sign up|register|create account/i });

    await emailInput2.fill(testUser.email);
    await displayNameInput2.fill(`different${testUser.username}`);
    await passwordInput2.fill(testUser.password);
    await confirmPasswordInput2.fill(testUser.password);

    await registerButton2.click();

    // Should show error message about existing email
    const errorMessage = page.getByText(
      /email already exists|account with this email already exists/i,
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should validate password requirements during registration', async ({ page }) => {
    const testUser = generateTestUser();

    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const displayNameInput = page.getByLabel(/display name/i);
    const passwordInput = page.getByLabel(/^password/i).first();
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Fill form with weak password
    await emailInput.fill(testUser.email);
    await displayNameInput.fill(testUser.username);
    await passwordInput.fill('weak');
    await confirmPasswordInput.fill('weak');

    // Blur to trigger validation
    await confirmPasswordInput.blur();

    // Should show password requirement error
    const passwordError = page.getByText(/password must be at least/i);
    await expect(passwordError).toBeVisible();
  });

  test('should validate password confirmation match', async ({ page }) => {
    const testUser = generateTestUser();

    await page.goto('/register');

    const emailInput = page.getByLabel(/email/i);
    const displayNameInput = page.getByLabel(/display name/i);
    const passwordInput = page.getByLabel(/^password/i).first();
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    // Fill form with mismatched passwords
    await emailInput.fill(testUser.email);
    await displayNameInput.fill(testUser.username);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill('DifferentPassword123!');

    // Blur to trigger validation
    await confirmPasswordInput.blur();

    // Should show password mismatch error
    const mismatchError = page.getByText(/passwords do not match/i);
    await expect(mismatchError).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password/i).first();

    // Attempt login with non-existent credentials
    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('WrongPassword123!');

    const loginButton = page.getByRole('button', { name: /sign in|log in/i });
    await loginButton.click();

    // Should show authentication error
    const errorMessage = page.getByText(
      /invalid email or password|invalid credentials|incorrect email or password/i,
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between login and registration pages', async ({ page }) => {
    // Start at login page
    await page.goto('/login');

    // Find and click "Create account" link
    const createAccountLink = page.getByRole('link', { name: /create one/i });
    await expect(createAccountLink).toBeVisible();
    await createAccountLink.click();

    // Should navigate to registration page
    await expect(page).toHaveURL(/\/register/);
    const registrationHeading = page.getByRole('heading', {
      name: /create account/i,
    });
    await expect(registrationHeading).toBeVisible();

    // Find and click "Already have account" link
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    // Should navigate back to login page
    await expect(page).toHaveURL(/\/login/);
    const loginHeading = page.getByRole('heading', { name: /sign in/i });
    await expect(loginHeading).toBeVisible();
  });
});
