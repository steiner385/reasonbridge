/**
 * E2E tests for profile page components
 */

import { test, expect } from '@playwright/test';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('ProfilePage Component', () => {
  test('should show login prompt when not authenticated', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Not Logged In' })).toBeVisible();
    await expect(page.getByText('Please log in to view your profile.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Home' })).toBeVisible();
  });

  test('should navigate to home when clicking Go to Home button', async ({ page }) => {
    await page.goto('/profile');

    await page.getByRole('link', { name: 'Go to Home' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('UserProfilePage Component - API Error Handling', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test('should show error for invalid user ID', async ({ page }) => {
    await page.goto('/profile/invalid-uuid');

    // Should show loading first, then error
    await expect(page.getByText(/Unable to Load Profile|User Not Found/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show error for non-existent user', async ({ page }) => {
    // Use a valid UUID format that doesn't exist
    await page.goto('/profile/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText(/Unable to Load Profile|User Not Found/i)).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('UserProfilePage Component - Basic Structure', () => {
  test('should render profile page structure', async ({ page }) => {
    await page.goto('/profile');

    // Wait for the page to load (either showing content or error)
    await page.waitForSelector('h1, h2', { timeout: 10000 });

    // Basic page structure should exist
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});

test.describe('Profile Page Navigation', () => {
  test('should be accessible from direct URL', async ({ page }) => {
    await page.goto('/profile');

    // Page should load without 404
    await expect(page).toHaveURL('/profile');
    await expect(page.locator('body')).toBeVisible();
  });

  test('user profile page should be accessible from direct URL', async ({ page }) => {
    await page.goto('/profile/00000000-0000-0000-0000-000000000000');

    // Page should load without 404
    await expect(page).toHaveURL('/profile/00000000-0000-0000-0000-000000000000');
    await expect(page.locator('body')).toBeVisible();
  });
});
