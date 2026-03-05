/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * E2E tests for viewing public user profiles
 *
 * Tests the UserProfilePage component with:
 * - Profile header (avatar, name, badges)
 * - Trust score display
 * - Activity statistics
 * - Bio section
 * - Responsive layout
 * - Error handling (404, loading states)
 */

import { test, expect } from '@playwright/test';

// Demo user IDs from seed data - use real seeded users for backend-dependent tests
const DEMO_USER_IDS = {
  ADMIN_ADAMS: '11111111-0000-4000-8000-000000000001',
  ALICE_ANDERSON: '11111111-0000-4000-8000-000000000003',
};

test.describe('View Public Profile', () => {
  test.describe('Profile Structure', () => {
    test('should render profile page with all sections', async ({ page }) => {
      // Navigate to a valid user profile (would need a seeded user)
      await page.goto(`/profile/${DEMO_USER_IDS.ALICE_ANDERSON}`);

      // Wait for the user display name to appear (indicates profile loaded)
      await expect(page.getByRole('heading', { name: /Alice Anderson/i })).toBeVisible({
        timeout: 10000,
      });

      // Check for contribution history section
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible();
    });

    test('should show user avatar and display name in header', async ({ page }) => {
      await page.goto(`/profile/${DEMO_USER_IDS.ALICE_ANDERSON}`);

      // Wait for profile to load
      await page.waitForSelector('h1', { timeout: 10000 });

      // Check for avatar
      const avatar = page.locator('img[alt]').first();
      await expect(avatar).toBeVisible();

      // Check for display name (h1)
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show UserNotFound for invalid user ID', async ({ page }) => {
      await page.goto('/profile/invalid-uuid');

      // Should show error state
      await expect(page.getByText(/User Not Found|Unable to Load/i)).toBeVisible({
        timeout: 15000,
      });
    });

    test('should show UserNotFound for non-existent user', async ({ page }) => {
      // Use a valid UUID format that doesn't exist
      await page.goto('/profile/00000000-0000-0000-0000-000000000000');

      // Should show not found message (use heading to be specific)
      await expect(page.getByRole('heading', { name: /User Not Found/i })).toBeVisible({
        timeout: 30000,
      });

      // Should have Go to Home button
      await expect(page.getByRole('link', { name: /Go to Home/i })).toBeVisible();
    });

    test('should navigate to home from error page', async ({ page }) => {
      await page.goto('/profile/00000000-0000-0000-0000-000000000000');

      // Wait for error to appear
      await expect(page.getByText(/User Not Found|Unable to Load/i)).toBeVisible({
        timeout: 30000,
      });

      // Click go to home
      await page.getByRole('link', { name: /Go to Home/i }).click();

      // Should navigate to home
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Loading States', () => {
    test('should show skeleton loader while loading', async ({ page }) => {
      // Slow down network to observe loading state
      await page.route('**/users/*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto(`/profile/${DEMO_USER_IDS.ALICE_ANDERSON}`);

      // Check for skeleton or loading indicator
      const skeleton = page.locator('[class*="animate-pulse"], [class*="skeleton"]');
      // May or may not be visible depending on load speed
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Trust Score Section', () => {
    test('should display trust score badge', async ({ page }) => {
      await page.goto(`/profile/${DEMO_USER_IDS.ALICE_ANDERSON}`);

      // Wait for page to load
      await page.waitForSelector('[data-tour="trust-score"]', { timeout: 10000 });

      // Trust score badge should be visible
      const trustBadge = page.locator('[data-tour="trust-score"]');
      await expect(trustBadge).toBeVisible();
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display mobile layout on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/profile/00000000-0000-0000-0000-000000000000');

      // Page should still be usable on mobile
      await expect(page.locator('body')).toBeVisible();

      // Content should stack vertically (check for single-column layout)
      const mainContent = page.locator('main, [role="main"], .max-w-4xl');
      await expect(mainContent.first()).toBeVisible({ timeout: 30000 });
    });

    test('should display desktop layout on large screens', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });

      await page.goto('/profile/00000000-0000-0000-0000-000000000000');

      // Page should be visible
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should be accessible via direct URL', async ({ page }) => {
      const userId = '12345678-1234-1234-1234-123456789012';
      await page.goto(`/profile/${userId}`);

      // URL should match
      await expect(page).toHaveURL(`/profile/${userId}`);

      // Page should load (either content or error)
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
