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
// Uses timestamp + random suffix + process ID to avoid collisions across parallel workers
const generateTestUser = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const processId = process.pid || Math.floor(Math.random() * 10000);
  return {
    email: `e2e-${timestamp}-${processId}-${randomSuffix}@example.com`,
    username: `e2euser${timestamp}${randomSuffix}`,
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

    // Step 4: Wait for registration to complete
    // Use Promise.race to detect either redirect OR error display
    const result = await Promise.race([
      page
        .waitForURL((url) => !url.pathname.includes('/register'), { timeout: 20000 })
        .then(() => 'redirect' as const),
      page
        .locator('.bg-fallacy-light p')
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => 'error' as const),
    ]);

    if (result === 'error') {
      const errorText = await page.locator('.bg-fallacy-light p').first().textContent();
      throw new Error(`Registration failed with error: ${errorText}`);
    }

    // Success: verify we landed on an expected page
    await expect(page).toHaveURL(/(\/$|\/login|\/dashboard|\/home|\/profile|\/topics)/, {
      timeout: 5000,
    });

    // Step 5: Login after registration
    // Registration redirects to landing page (/) - use login modal
    await test.step('Login with newly created credentials', async () => {
      // Navigate to landing page to access login modal
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Open login modal by clicking Log In button
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Fill login form inside the modal
      const dialog = page.getByRole('dialog');
      const loginEmailInput = dialog.getByLabel(/email/i);
      const loginPasswordInput = dialog.getByLabel(/password/i);

      await loginEmailInput.fill(testUser.email);
      await loginPasswordInput.fill(testUser.password);

      // Submit login
      const loginButton = dialog.getByRole('button', { name: /^log in$/i });
      await loginButton.click();

      // Wait for login to complete - use Promise.race to detect either success OR error
      const loginResult = await Promise.race([
        dialog.waitFor({ state: 'hidden', timeout: 15000 }).then(() => 'success' as const),
        dialog
          .locator('.bg-red-50 p, [class*="error"] p')
          .waitFor({ state: 'visible', timeout: 15000 })
          .then(() => 'error' as const),
      ]);

      if (loginResult === 'error') {
        const errorText = await dialog
          .locator('.bg-red-50 p, [class*="error"] p')
          .first()
          .textContent();
        throw new Error(`Login failed with error: ${errorText}`);
      }

      // Wait for redirect to authenticated page
      await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
    });

    // Step 6: Verify successful authentication
    // The login was successful if we reached the home page (/)
    // Check that auth token was stored in localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
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

    // Wait for first registration to complete
    // Use Promise.race to detect either redirect OR error display
    const firstResult = await Promise.race([
      page
        .waitForURL((url) => !url.pathname.includes('/register'), { timeout: 20000 })
        .then(() => 'redirect' as const),
      page
        .locator('.bg-fallacy-light p')
        .waitFor({ state: 'visible', timeout: 20000 })
        .then(() => 'error' as const),
    ]);

    if (firstResult === 'error') {
      const errorText = await page.locator('.bg-fallacy-light p').first().textContent();
      throw new Error(`First registration failed: ${errorText}`);
    }

    // Attempt second registration with same email
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

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

    // Wait for API response
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should show error message about existing email - check the error container
    const errorMessage = page.locator('.bg-fallacy-light p, [role="alert"]').filter({
      hasText: /already exists|account.*exists/i,
    });
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
    // Navigate to landing page and open login modal
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open login modal
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    const dialog = page.getByRole('dialog');
    const emailInput = dialog.getByLabel(/email/i);
    const passwordInput = dialog.getByLabel(/password/i);

    // Attempt login with non-existent credentials
    await emailInput.fill('nonexistent@example.com');
    await passwordInput.fill('WrongPassword123!');

    const loginButton = dialog.getByRole('button', { name: /^log in$/i });
    await loginButton.click();

    // Wait for API response
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should show authentication error within the modal
    // Error messages include: "Invalid credentials", "Invalid email or password", "Login failed", etc.
    // The login error is displayed in a div with bg-red-50 containing p.text-red-600
    const errorMessage = dialog
      .locator('.bg-red-50 p.text-red-600, .text-red-400, [role="alert"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify the error text is meaningful
    const errorText = await errorMessage.textContent();
    expect(errorText?.toLowerCase()).toMatch(
      /invalid|failed|error|incorrect|unauthorized|wrong|credentials/i,
    );
  });

  test('should navigate between login modal and registration page', async ({ page }) => {
    // Start at landing page and open login modal
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open login modal
    await page.getByRole('button', { name: /log in/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find and click "Sign up free" button in modal
    // Note: This is a button element that navigates to signup, not a link
    const createAccountButton = dialog.getByRole('button', { name: /sign up free/i });
    await expect(createAccountButton).toBeVisible();
    await createAccountButton.click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/register|\/signup/, { timeout: 10000 });

    // Wait for page to load and find the heading
    // SignupPage has heading "Create Your Account"
    const registrationHeading = page.getByRole('heading', {
      name: /create.*account|sign up/i,
    });
    await expect(registrationHeading).toBeVisible({ timeout: 10000 });

    // Find and click "Sign in" button on signup page (it's a button, not a link)
    const loginButton = page.getByRole('button', { name: /sign in/i });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should navigate back to landing page where login is a modal
    await expect(page).toHaveURL(/\/$|\/login/);
  });
});
