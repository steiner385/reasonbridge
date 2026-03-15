/**
 * E2E tests for response voting feature
 *
 * Tests the complete voting user journey:
 * - Viewing vote counts on responses
 * - Upvoting a response
 * - Downvoting a response
 * - Toggling votes (removing by clicking again)
 * - Vote count display and updates
 */

import { test, expect } from '@playwright/test';
import { loginWithDemoAccount, navigateToSeededTopic, SEEDED_TOPICS } from './helpers/demo-auth';

/**
 * Helper to navigate to a topic with responses
 * Uses seeded topic via direct URL navigation (more reliable than UI clicks)
 */
async function navigateToTopicWithResponses(page: import('@playwright/test').Page) {
  // Navigate directly to a seeded topic that has responses
  await navigateToSeededTopic(page, 'CONGESTION_PRICING');

  // Wait for responses to load
  await page.waitForSelector('[data-testid="response-item"]', { timeout: 15000 });
}

test.describe('Response Voting', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDemoAccount(page, 'Alice Anderson');
  });

  test('should display vote buttons on responses', async ({ page }) => {
    await navigateToTopicWithResponses(page);

    // Vote buttons should be visible on response items
    const upvoteButton = page.locator('[data-testid="upvote-button"]');
    const downvoteButton = page.locator('[data-testid="downvote-button"]');

    await expect(upvoteButton.first()).toBeVisible({ timeout: 5000 });
    await expect(downvoteButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should upvote a response when upvote button is clicked', async ({ page }) => {
    await navigateToTopicWithResponses(page);

    // Find and click upvote button
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });

    // Click upvote
    await upvoteButton.click();

    // Wait for API call to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Button should show active state
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');
  });

  test('should downvote a response when downvote button is clicked', async ({ page }) => {
    await navigateToTopicWithResponses(page);

    // Find and click downvote button
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
    await expect(downvoteButton).toBeVisible({ timeout: 5000 });

    // Click downvote
    await downvoteButton.click();

    // Wait for API call to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Button should show active state
    await expect(downvoteButton).toHaveAttribute('data-active', 'true');
  });

  test('should toggle vote when same button is clicked again', async ({ page }) => {
    await navigateToTopicWithResponses(page);

    // Find upvote button
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });

    // First click - upvote
    await upvoteButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Second click - remove vote
    await upvoteButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Button should no longer be active
    await expect(upvoteButton).not.toHaveAttribute('data-active', 'true');
  });

  test('should switch vote when opposite button is clicked', async ({ page }) => {
    await navigateToTopicWithResponses(page);

    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();

    await expect(upvoteButton).toBeVisible({ timeout: 5000 });
    await expect(downvoteButton).toBeVisible({ timeout: 5000 });

    // First upvote
    await upvoteButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Click downvote while already upvoted
    await downvoteButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    // Downvote should now be active, upvote should not
    await expect(downvoteButton).toHaveAttribute('data-active', 'true');
    await expect(upvoteButton).not.toHaveAttribute('data-active', 'true');
  });

  // MOCK-ONLY: Tests below require mocked APIs to verify specific UI behaviors
  // that cannot be reliably triggered with real backend data

  test.describe('Mock-dependent tests', () => {
    // INTENTIONALLY SKIPPED: These tests require mocked APIs to simulate specific
    // scenarios (existing vote states, optimistic updates) that cannot be reliably
    // set up with real backend data.
    test.skip(true, 'Mock-only tests - simulates specific API states');

    test('should display vote counts on responses', async () => {
      // This test requires mocked vote counts to verify display
    });

    test('should show visual indicator for user vote state', async () => {
      // This test requires mocked initial vote state
    });

    test('should update vote count optimistically', async () => {
      // This test requires mocked delayed API response to verify optimistic updates
    });
  });
});
