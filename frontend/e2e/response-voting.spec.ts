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
import {
  loginWithDemoAccount,
  navigateToSeededTopic,
  waitForResponsesToLoad,
} from './helpers/demo-auth';

/**
 * Helper to navigate to a topic with responses
 * Uses seeded topic via direct URL navigation (more reliable than UI clicks)
 * Uses polling with 30s timeout for CI cold-start scenarios
 */
async function navigateToTopicWithResponses(page: import('@playwright/test').Page) {
  // Navigate directly to a seeded topic that has responses
  await navigateToSeededTopic(page, 'CONGESTION_PRICING');

  // Wait for responses to load with polling (handles CI cold-starts better than waitForSelector)
  const hasResponses = await waitForResponsesToLoad(page, { timeout: 30000 });
  if (!hasResponses) {
    // Log warning but don't fail - some tests may work without responses
    console.warn('Responses not loaded within timeout - backend may be starting up');
  }
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

    // Wait for vote API call to complete
    await page.waitForTimeout(500);

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

    // Wait for vote API call to complete
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500); // Wait for vote API call to complete
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Second click - remove vote
    await upvoteButton.click();
    await page.waitForTimeout(500); // Wait for vote API call to complete

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
    await page.waitForTimeout(500); // Wait for vote API call to complete
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Click downvote while already upvoted
    await downvoteButton.click();
    await page.waitForTimeout(500); // Wait for vote API call to complete

    // Downvote should now be active, upvote should not
    await expect(downvoteButton).toHaveAttribute('data-active', 'true');
    await expect(upvoteButton).not.toHaveAttribute('data-active', 'true');
  });

  /**
   * PERMANENTLY SKIPPED: Mock-only tests
   *
   * These tests require mocked APIs to simulate specific vote states
   * (existing votes, optimistic updates, vote counts) that cannot be
   * reliably set up with real backend data.
   *
   * UI behavior is covered via:
   * - Unit tests: frontend/src/components/responses/__tests__/VoteButtons.test.tsx
   * - Above E2E tests cover upvote/downvote/toggle with real backend
   */
  // Mock-dependent tests (tracked in #1349): these need page.route() request
  // interception to simulate specific vote-count/API states. Marked test.fixme
  // so they surface as known-unimplemented work rather than a describe-level
  // runtime skip that hides them entirely.
  test.describe('Mock-dependent tests', () => {
    test.fixme('should display vote counts on responses', async () => {
      // TODO(#1349): intercept the responses request with page.route() and
      // return known vote counts to assert their display.
    });

    test.fixme('should show visual indicator for user vote state', async () => {
      // TODO(#1349): intercept with a mocked initial vote state.
    });

    test.fixme('should update vote count optimistically', async () => {
      // TODO(#1349): intercept with a delayed API response to assert the
      // optimistic update then reconciliation.
    });
  });
});
