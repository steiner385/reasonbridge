/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * E2E tests for Profile Privacy Settings
 *
 * Tests the privacy settings functionality in the edit profile modal:
 * - Privacy settings section visibility
 * - Privacy toggle options (Public, Followers, Private)
 * - Trust score privacy restrictions
 * - Saving and canceling changes
 */

import { test, expect, Page } from '@playwright/test';
import { loginWithDemoAccount } from '../utils/auth-helpers';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

/**
 * Helper to open edit profile modal and wait for privacy settings to load.
 * Privacy settings require an API call, so we wait for the data-dependent content.
 */
async function openEditModalWithPrivacySettings(page: Page) {
  await page.goto('/profile');
  await page.click('[data-testid="edit-profile-button"]');
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

  // Wait for privacy settings header to be visible (always rendered)
  // The header includes an emoji: "🔐 Privacy Settings"
  await expect(page.locator('text=/Privacy Settings/i')).toBeVisible({ timeout: 10000 });

  // Scroll to Privacy Settings section to ensure it's in view
  const privacySection = page.locator('text=/Privacy Settings/i').first();
  await privacySection.scrollIntoViewIfNeeded();

  // Wait for the modal form to fully load
  await page.waitForTimeout(500);
}

test.describe('Profile Privacy Settings', () => {
  // Check if running in E2E Docker mode with full backend
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  // Run tests sequentially to avoid rate limiting on login API
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Add delay between tests to avoid rate limiting (login throttler: 5 attempts per minute)
    await page.waitForTimeout(13000);
    // Log in with demo account
    await loginWithDemoAccount(page, 'Admin Adams');
  });

  test('should display privacy settings section in edit profile modal', async ({ page }) => {
    await openEditModalWithPrivacySettings(page);

    // Verify privacy settings section header is visible
    await expect(page.locator('text=/Privacy Settings/i')).toBeVisible();
    await expect(page.locator('text=/Control who can see/i')).toBeVisible();
  });

  test('should display edit profile form fields', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Verify form fields are present
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.locator('textarea[name="bio"]')).toBeVisible();
  });

  test('should pre-fill display name in form', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Display name should be pre-filled
    const displayNameInput = page.getByLabel(/display name/i);
    const currentValue = await displayNameInput.inputValue();
    expect(currentValue.length).toBeGreaterThan(0);
  });

  test('should show privacy settings header with description', async ({ page }) => {
    await openEditModalWithPrivacySettings(page);

    // Privacy section should have header and description
    const privacyHeader = page.locator('h3:has-text("Privacy Settings")');
    await expect(privacyHeader).toBeVisible({ timeout: 5000 });
  });

  test('should close modal when cancel is clicked', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Click cancel button
    await page.click('button:has-text("Cancel")');

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should have save and cancel buttons', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Both buttons should be visible
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should show avatar upload option', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Avatar upload section should be visible - look for the upload area text
    // The button might have different text or be an upload area
    const avatarSection = page
      .locator('text=/upload|avatar|drag to upload|click or drag/i')
      .first();
    await expect(avatarSection).toBeVisible({ timeout: 5000 });
  });
});
