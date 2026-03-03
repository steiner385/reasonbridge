/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * E2E tests for editing own profile
 *
 * Tests the ProfilePage component with:
 * - Edit Profile button visibility
 * - Edit modal functionality
 * - Form validation
 * - Profile update persistence
 * - Toast notifications
 */

import { test, expect } from '@playwright/test';
import { loginWithDemoAccount } from '../utils/auth-helpers';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

// Demo account name used for testing
const DEMO_ACCOUNT_NAME = 'Admin Adams';

test.describe('Edit Own Profile', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  // Run tests sequentially to avoid rate limiting on login API
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Add delay between tests to avoid rate limiting (login throttler: 5 attempts per minute)
    // With 5 allowed per minute, we need ~12s between tests for 9 tests over 2 minutes
    await page.waitForTimeout(13000);
    // Login with demo account before each test
    await loginWithDemoAccount(page, DEMO_ACCOUNT_NAME);
  });

  test.describe('Edit Button Visibility', () => {
    test('should show Edit Profile button on own profile page', async ({ page }) => {
      // Navigate to own profile
      await page.goto('/profile');

      // Wait for page to load
      await page.waitForSelector('h1', { timeout: 10000 });

      // Edit Profile button should be visible
      const editButton = page.getByTestId('edit-profile-button');
      await expect(editButton).toBeVisible();
    });
  });

  test.describe('Edit Modal', () => {
    test('should open edit modal when clicking Edit Profile', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Click edit button
      await page.getByTestId('edit-profile-button').click();

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Form fields should be present
      await expect(page.getByLabel(/display name/i)).toBeVisible();
      await expect(page.locator('textarea[name="bio"]')).toBeVisible();
    });

    test('should close modal when clicking Cancel', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Modal should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
    });

    test('should pre-fill form with current profile data', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Display name should be pre-filled with some value (not empty)
      const displayNameInput = page.getByLabel(/display name/i);
      const currentValue = await displayNameInput.inputValue();
      expect(currentValue.length).toBeGreaterThan(0);
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty display name', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Clear display name
      const displayNameInput = page.getByLabel(/display name/i);
      await displayNameInput.clear();

      // Try to submit
      await page.getByRole('button', { name: /save/i }).click();

      // Should show error
      await expect(page.getByText(/display name is required/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show character count for bio field', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Type in bio
      const bioInput = page.locator('textarea[name="bio"]');
      await bioInput.fill('Hello world');

      // Character count should be visible
      await expect(page.getByText(/11\/300/)).toBeVisible();
    });
  });

  test.describe('Profile Update', () => {
    test('should successfully update display name', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Get original display name to restore later
      const displayNameInput = page.getByLabel(/display name/i);
      const originalDisplayName = await displayNameInput.inputValue();

      // Update display name
      const newDisplayName = `Updated${Date.now().toString().slice(-6)}`;
      await displayNameInput.clear();
      await displayNameInput.fill(newDisplayName);

      // Submit
      await page.getByRole('button', { name: /save/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Success toast should appear
      await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 5000 });

      // Page should show new display name
      await expect(page.getByText(newDisplayName)).toBeVisible({ timeout: 5000 });

      // Restore original display name for other tests
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await displayNameInput.clear();
      await displayNameInput.fill(originalDisplayName);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });

    test('should successfully update bio', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForSelector('h1', { timeout: 10000 });

      // Open modal
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Get original bio to restore later
      const bioInput = page.locator('textarea[name="bio"]');
      const originalBio = await bioInput.inputValue();

      // Update bio
      const newBio = `Test bio updated at ${Date.now()}`;
      await bioInput.clear();
      await bioInput.fill(newBio);

      // Submit
      await page.getByRole('button', { name: /save/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Success toast should appear
      await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 5000 });

      // Page should show new bio
      await expect(page.getByText(newBio)).toBeVisible({ timeout: 5000 });

      // Restore original bio for other tests
      await page.getByTestId('edit-profile-button').click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await bioInput.clear();
      await bioInput.fill(originalBio);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when accessing profile without auth', async ({ page }) => {
      // Clear any existing auth state (both cookies and localStorage)
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to a new page to ensure auth state is cleared
      await page.goto('/profile');

      // Should show login button in header (unauthenticated state)
      // The profile page for own profile requires auth, so we check for sign-in prompts
      await expect(
        page
          .getByRole('button', { name: /log in|sign in/i })
          .or(page.getByText(/not logged in|please log in|sign in/i)),
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
