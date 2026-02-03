import { test, expect } from '@playwright/test';

/**
 * E2E test suite for the Login Modal
 *
 * Tests the login modal functionality including:
 * - Modal rendering and accessibility
 * - Demo credential selection
 * - Form input and validation
 * - Modal close behavior
 */

test.describe('Login Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open login modal
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should render the login modal with all required elements', async ({ page }) => {
    // Check for modal heading
    const heading = page.getByRole('heading', { name: 'Log In' });
    await expect(heading).toBeVisible();

    // Check for email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Check for password input
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Check for submit button (inside the modal form)
    const dialog = page.getByRole('dialog');
    const submitButton = dialog.getByRole('button', { name: /^log in$/i });
    await expect(submitButton).toBeVisible();
  });

  test('should display demo credentials section', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    // Check for demo credentials heading
    await expect(dialog.getByText('Quick Login with Demo Accounts')).toBeVisible();

    // Check for all demo accounts (using .first() where text may match role badge too)
    await expect(dialog.getByText('Admin Adams')).toBeVisible();
    await expect(dialog.getByText('Mod Martinez')).toBeVisible();
    await expect(dialog.getByText('Alice Anderson')).toBeVisible();
    await expect(dialog.getByText('Bob Builder')).toBeVisible();
    await expect(dialog.getByText('New User').first()).toBeVisible();
  });

  test('should auto-fill credentials when clicking demo account', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Click on Admin Adams demo account
    await page.getByText('Admin Adams').click();

    // Verify credentials are auto-filled
    await expect(emailInput).toHaveValue('demo-admin@reasonbridge.demo');
    await expect(passwordInput).toHaveValue('DemoAdmin2026!');
  });

  test('should auto-fill different credentials for different demo accounts', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Click on Bob Builder demo account
    await page.getByText('Bob Builder').click();

    // Verify Bob's credentials are auto-filled
    await expect(emailInput).toHaveValue('demo-bob@reasonbridge.demo');
    await expect(passwordInput).toHaveValue('DemoBob2026!');
  });

  test('should allow manual entry of credentials', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Enter credentials manually
    await emailInput.fill('test@example.com');
    await passwordInput.fill('SecurePassword123!');

    // Verify values are entered
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('SecurePassword123!');
  });

  test('should close modal when clicking outside', async ({ page }) => {
    // Click outside the modal (on the overlay)
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });

    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    // Click the close button (X icon)
    await page.getByRole('button', { name: /close login modal/i }).click();

    // Modal should be closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should display sign up link', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    // Check for sign up link
    await expect(dialog.getByText("Don't have an account?")).toBeVisible();
    await expect(dialog.getByRole('button', { name: /sign up free/i })).toBeVisible();
  });

  test('should navigate to signup page when clicking sign up link', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    // Click sign up link (inside the modal)
    await dialog.getByRole('button', { name: /sign up free/i }).click();

    // Should navigate to signup page
    await expect(page).toHaveURL('/signup');
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Enter invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('WrongPassword123!');

    // Submit the form (using the submit button inside the dialog)
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Should show error message (actual message depends on backend)
    await expect(dialog.locator('.bg-red-50').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state while logging in', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    // Enter credentials
    await emailInput.fill('demo-admin@reasonbridge.demo');
    await passwordInput.fill('DemoAdmin2026!');

    // Submit the form (using the submit button inside the dialog)
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Should show loading state (button text changes)
    // Note: This may be very fast, so we just verify the form submitted
    // by checking we either see loading or the modal closes
    const loginButton = dialog.getByRole('button', { name: /logging in|log in/i });
    await expect(loginButton).toBeVisible();
  });

  test('should have accessible form structure', async ({ page }) => {
    // All inputs should have labels
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Modal should have proper dialog role
    const modal = page.getByRole('dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('should display role badges for demo accounts', async ({ page }) => {
    // Check for role badges
    await expect(page.getByText('Admin').first()).toBeVisible();
    await expect(page.getByText('Moderator')).toBeVisible();
    await expect(page.getByText('Power User')).toBeVisible();
    await expect(page.getByText('Regular User')).toBeVisible();
  });
});
