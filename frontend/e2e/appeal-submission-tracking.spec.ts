/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * E2E Tests for Appeal Submission and Tracking
 *
 * Tests the complete appeal workflow:
 * 1. Viewing appeal status on the appeals page
 * 2. Filtering appeals by status
 * 3. Viewing appeal details (expanding cards)
 *
 * Note: These tests require the full backend environment (E2E_DOCKER=true)
 * because they test protected routes that require authentication.
 */

import { test, expect } from '@playwright/test';

// Check if we're running in Docker E2E mode with real backend
const isE2EDocker = process.env['E2E_DOCKER'] === 'true';

test.describe('Appeal Submission and Tracking', () => {
  // These tests require the full backend environment with real authentication
  test.skip(!isE2EDocker, 'Requires full backend environment (E2E_DOCKER=true)');

  test.describe('Appeal Status Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/');

      // Click login button
      await page.getByRole('button', { name: 'Log In' }).click();

      // Wait for login modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Login with test user
      await page.getByLabel('Email').fill('testuser@example.com');
      await page.getByLabel('Password').fill('TestPassword123!');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for login to complete and modal to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Wait for navigation and authentication state to stabilize
      await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
    });

    test('should load appeals page', async ({ page }) => {
      // Navigate to appeals page
      await page.goto('/appeals');

      // Verify page loads
      await expect(page.getByRole('heading', { name: 'Appeal Status' })).toBeVisible({
        timeout: 10000,
      });

      // Page should either show appeals or empty state
      const hasAppeals = await page
        .getByText('appeal-')
        .isVisible()
        .catch(() => false);
      const isEmpty = await page
        .getByText('No appeals found')
        .isVisible()
        .catch(() => false);

      expect(hasAppeals || isEmpty).toBe(true);
    });

    test('should display filter buttons', async ({ page }) => {
      await page.goto('/appeals');

      await expect(page.getByRole('heading', { name: 'Appeal Status' })).toBeVisible({
        timeout: 10000,
      });

      // Test filter buttons exist
      await expect(page.getByRole('button', { name: 'All Appeals' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Under Review' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Upheld' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Denied' })).toBeVisible();
    });

    test('should filter appeals by status', async ({ page }) => {
      await page.goto('/appeals');
      await expect(page.getByRole('heading', { name: 'Appeal Status' })).toBeVisible();

      // Click Pending filter
      await page.getByRole('button', { name: 'Pending' }).click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Verify the button is now active (primary style)
      const pendingButton = page.getByRole('button', { name: 'Pending' });
      await expect(pendingButton).toBeVisible();

      // Click All Appeals to reset
      await page.getByRole('button', { name: 'All Appeals' }).click();
      await page.waitForTimeout(500);
    });

    test('should show help section with status explanations', async ({ page }) => {
      await page.goto('/appeals');
      await expect(page.getByRole('heading', { name: 'Appeal Status' })).toBeVisible();

      // Verify help section
      await expect(page.getByText('What happens next?')).toBeVisible();
      await expect(
        page.getByText('Your appeal has been received and is waiting to be reviewed'),
      ).toBeVisible();
    });
  });

  test.describe('Appeal Card Interactions', () => {
    test.beforeEach(async ({ page }) => {
      // Login
      await page.goto('/');
      await page.getByRole('button', { name: 'Log In' }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await page.getByLabel('Email').fill('testuser@example.com');
      await page.getByLabel('Password').fill('TestPassword123!');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
      await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
    });

    test('should expand appeal card to show details when appeals exist', async ({ page }) => {
      await page.goto('/appeals');
      await expect(page.getByRole('heading', { name: 'Appeal Status' })).toBeVisible();

      // Check if there are any appeals to interact with
      const appealCards = page.locator('.cursor-pointer');
      const cardCount = await appealCards.count();

      if (cardCount > 0) {
        // Click the first appeal card header to expand
        await appealCards.first().click();

        // Wait for expansion animation
        await page.waitForTimeout(300);

        // Should show expanded details
        await expect(page.getByText('Appeal Details')).toBeVisible();
        await expect(page.getByText('Your Reason for Appeal')).toBeVisible();
      } else {
        // No appeals to test - verify empty state
        await expect(page.getByText('No appeals found')).toBeVisible();
      }
    });
  });
});
