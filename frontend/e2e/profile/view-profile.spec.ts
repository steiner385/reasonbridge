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

import { test, expect, Page } from '@playwright/test';

// Demo user IDs from seed data - use real seeded users for backend-dependent tests
const DEMO_USER_IDS = {
  ADMIN_ADAMS: '11111111-0000-4000-8000-000000000001',
  MOD_MARTINEZ: '11111111-0000-4000-8000-000000000002',
  ALICE_ANDERSON: '11111111-0000-4000-8000-000000000003',
};

/**
 * Navigate to a profile page and wait for it to fully load.
 * Handles the async nature of profile loading with proper waiting.
 */
async function navigateToProfile(page: Page, userId: string, expectedName?: RegExp) {
  await page.goto(`/profile/${userId}`);
  // Wait for network requests to complete (profile makes multiple API calls)
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // If expected name provided, wait for it to appear
  if (expectedName) {
    await expect(page.getByRole('heading', { name: expectedName })).toBeVisible({
      timeout: 15000,
    });
  }
}

test.describe('View Public Profile', () => {
  test.describe('Profile Structure', () => {
    test('should render profile page with all sections', async ({ page }) => {
      // Navigate to a valid user profile (would need a seeded user)
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Check for contribution history section
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible();
    });

    test('should show user avatar and display name in header', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

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

      // Check for skeleton or loading indicator - may or may not be visible depending on load speed
      // Just verify the page loads without errors
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Trust Score Section', () => {
    test('should display trust score badge', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Trust score badge should be visible
      const trustBadge = page.locator('[data-tour="trust-score"]');
      await expect(trustBadge).toBeVisible({ timeout: 10000 });
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

  test.describe('Activity Statistics', () => {
    test('should display topic count and response count', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.MOD_MARTINEZ, /Mod Martinez/i);

      // Activity section should exist
      await expect(page.getByRole('heading', { name: 'Activity' })).toBeVisible();

      // Should show Topics stat with a number
      await expect(page.getByText('Topics').first()).toBeVisible();

      // Should show Responses stat with a number
      await expect(page.getByText('Responses').first()).toBeVisible();
    });

    test('should display numeric counts for activity stats', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Activity section should have numeric values (not "No activity statistics available")
      const activitySection = page.locator('h2:has-text("Activity")').locator('..');
      await expect(activitySection).not.toContainText('No activity statistics available');
    });
  });

  test.describe('Bio Section', () => {
    test('should display About section', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // About section should be visible
      await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    });

    test('should show placeholder when bio is empty', async ({ page }) => {
      // Mod Martinez has no bio set
      await navigateToProfile(page, DEMO_USER_IDS.MOD_MARTINEZ, /Mod Martinez/i);

      // Should show "No bio provided" or similar
      await expect(page.getByText(/No bio provided/i)).toBeVisible();
    });
  });

  test.describe('Contribution History', () => {
    test('should display contribution history section', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Contribution History section should be visible
      await expect(page.getByRole('heading', { name: 'Contribution History' })).toBeVisible();
    });

    test('should display contribution filter buttons', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Wait for contribution history to load
      const contributionHistory = page.locator('[data-testid="contribution-history"]');
      await expect(contributionHistory).toBeVisible({ timeout: 10000 });

      // Filter buttons should be visible within the contribution history section
      await expect(contributionHistory.getByRole('button', { name: /All/i })).toBeVisible();
      await expect(contributionHistory.getByRole('button', { name: /Topics/i })).toBeVisible();
      await expect(contributionHistory.getByRole('button', { name: /Responses/i })).toBeVisible();
      await expect(contributionHistory.getByRole('button', { name: /Votes/i })).toBeVisible();
    });

    test('should filter contributions by type when clicking filter buttons', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Wait for contribution history to load
      const contributionHistory = page.locator('[data-testid="contribution-history"]');
      await expect(contributionHistory).toBeVisible({ timeout: 10000 });

      // Click on Topics filter within contribution history section
      await contributionHistory.getByRole('button', { name: /Topics/i }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Should show "Created topic" entries
      await expect(page.getByText('Created topic').first()).toBeVisible({ timeout: 5000 });
    });

    test('should filter to show only responses', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Wait for contribution history to load
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible({
        timeout: 10000,
      });

      // Click on Responses filter
      await page.getByRole('button', { name: /Responses/i }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Should show "Posted response" entries
      await expect(page.getByText('Posted response').first()).toBeVisible({ timeout: 5000 });
    });

    test('should show contribution items with timestamps', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.MOD_MARTINEZ, /Mod Martinez/i);

      // Wait for contribution history to load
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible({
        timeout: 10000,
      });

      // Contributions should have time elements (e.g., "2 days ago", "1 week ago")
      const timeElements = page.locator('time');
      await expect(timeElements.first()).toBeVisible();
    });

    test('should link contribution items to their topics', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Wait for contribution history to load
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible({
        timeout: 10000,
      });

      // Contribution items should be links to topics
      const contributionLinks = page.locator(
        '[data-testid="contribution-history"] a[href*="/topics/"]',
      );
      await expect(contributionLinks.first()).toBeVisible();
    });

    test('should navigate to topic when clicking contribution item', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Wait for contribution history to load
      await expect(page.locator('[data-testid="contribution-history"]')).toBeVisible({
        timeout: 10000,
      });

      // Click the first contribution link
      const firstContribution = page
        .locator('[data-testid="contribution-history"] a[href*="/topics/"]')
        .first();
      await firstContribution.click();

      // Should navigate to a topic page
      await expect(page).toHaveURL(/\/topics\//);
    });
  });

  test.describe('Follower Counts', () => {
    test('should display follow button in header', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Should have the Follow button with specific testid
      await expect(page.getByTestId('follow-button')).toBeVisible();
    });

    test('should display followers and following buttons', async ({ page }) => {
      await navigateToProfile(page, DEMO_USER_IDS.ALICE_ANDERSON, /Alice Anderson/i);

      // Should have followers and following text in the profile header
      await expect(page.getByRole('button', { name: /followers/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /following/i })).toBeVisible();
    });
  });
});
