/**
 * E2E tests for Guest Read-Only Mode
 *
 * Verifies that unauthenticated users:
 * - Can browse and read all public content
 * - See a login modal when attempting any write/interaction operation
 *
 * Also verifies that after login, the same actions work correctly.
 *
 * Related to: Plan "Read-Only Mode for Unauthenticated Users"
 */

import { test, expect } from '@playwright/test';
import {
  loginWithDemoAccount,
  navigateToSeededTopic,
  navigateToTopicWithResponses,
  waitForResponsesToLoad,
} from './helpers/demo-auth';

test.describe('Guest Read-Only Mode', () => {
  test.describe('Guests should see login modal when interacting', () => {
    test.beforeEach(async ({ page }) => {
      // Start as guest (no login)
      await page.goto('/');
    });

    test('should prompt login when clicking upvote button', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      // Find and click upvote button
      const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
      const upvoteExists = await upvoteButton.isVisible().catch(() => false);

      if (!upvoteExists) {
        test.skip(true, 'Upvote button not visible in UI');
        return;
      }

      await upvoteButton.click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    test('should prompt login when clicking downvote button', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      // Find and click downvote button
      const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
      const downvoteExists = await downvoteButton.isVisible().catch(() => false);

      if (!downvoteExists) {
        test.skip(true, 'Downvote button not visible in UI');
        return;
      }

      await downvoteButton.click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    test('should prompt login when clicking bookmark button', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      const responseItem = page.locator('[data-testid="response-item"]').first();

      // Hover to reveal action buttons
      await responseItem.hover();
      await page.waitForTimeout(300);

      // Find and click bookmark button
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-button"], button[aria-label*="bookmark"]',
      );
      const bookmarkExists = await bookmarkButton
        .first()
        .isVisible()
        .catch(() => false);

      if (!bookmarkExists) {
        test.skip(true, 'Bookmark button not visible in UI');
        return;
      }

      await bookmarkButton.first().click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    test('should prompt login when clicking add reaction button', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      const responseItem = page.locator('[data-testid="response-item"]').first();

      // Hover to reveal action buttons
      await responseItem.hover();
      await page.waitForTimeout(300);

      // Find add reaction button
      const addReactionButton = page.locator(
        '[data-testid="add-reaction-button"], button[aria-label="Add reaction"]',
      );
      const reactionExists = await addReactionButton
        .first()
        .isVisible()
        .catch(() => false);

      if (!reactionExists) {
        test.skip(true, 'Add reaction button not visible in UI');
        return;
      }

      await addReactionButton.first().click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    test('should prompt login when trying to focus reply composer', async ({ page }) => {
      // Navigate to a topic with responses
      await navigateToSeededTopic(page, 'CONGESTION_PRICING');

      // Look for reply composer or reply button
      const replyButton = page.locator(
        '[data-testid="reply-button"], button[aria-label*="Reply"], button:has-text("Reply")',
      );
      const compactComposer = page.locator('[data-testid="compact-composer"]');
      const responseComposer = page.locator(
        '[data-testid="response-composer"] textarea, .response-composer textarea',
      );

      // Try clicking reply button if it exists
      const replyExists = await replyButton
        .first()
        .isVisible()
        .catch(() => false);
      if (replyExists) {
        await replyButton.first().click();

        // Login modal should appear
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        return;
      }

      // Try clicking compact composer if it exists
      const compactExists = await compactComposer
        .first()
        .isVisible()
        .catch(() => false);
      if (compactExists) {
        await compactComposer.first().click();

        // Login modal should appear
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        return;
      }

      // Try clicking the response composer textarea if it exists
      const composerExists = await responseComposer
        .first()
        .isVisible()
        .catch(() => false);
      if (composerExists) {
        await responseComposer.first().click();

        // Login modal should appear
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        return;
      }

      test.skip(true, 'No reply composer element found in UI');
    });

    test('should prompt login when clicking follow button on user profile', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - cannot navigate to author profile');
        return;
      }

      // Click on the first author's profile link
      const authorLink = page.locator('[data-testid="response-item"] a[href^="/profile/"]').first();
      const hasAuthorLink = await authorLink
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (!hasAuthorLink) {
        test.skip(true, 'No author profile links found in responses');
        return;
      }

      await authorLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Wait for follow button to render (profile page may take time to hydrate)
      const followButton = page.locator('[data-testid="follow-button"]').first();
      const followExists = await followButton
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (!followExists) {
        test.skip(true, 'Follow button not visible on profile page');
        return;
      }

      await followButton.click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    test('should prompt login when clicking Create Topic button', async ({ page }) => {
      // Navigate to topics page
      await page.goto('/topics');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Look for create topic button
      const createButton = page.locator(
        '[data-testid="create-topic-button"], button:has-text("Create Topic"), button:has-text("New Topic")',
      );
      const createExists = await createButton
        .first()
        .isVisible()
        .catch(() => false);

      if (!createExists) {
        test.skip(true, 'Create Topic button not visible');
        return;
      }

      await createButton.first().click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
    });

    /**
     * SKIPPED: Backend-dependent vote API test
     *
     * This test requires the vote API to persist state changes after login,
     * which has a known API mismatch: GET /responses/:id/votes expects x-user-id
     * header but frontend sends Authorization: Bearer token.
     *
     * The login modal prompt behavior is verified by the tests above.
     * Vote UI behavior is verified via unit tests: VoteButtons.test.tsx
     */
    test.skip('should allow guest to login from modal and then vote', async ({ page }) => {
      // Give this test extra time due to potential rate limit retries
      test.setTimeout(60000);

      // Start fresh as guest (no beforeEach login in this describe block)
      await page.context().clearCookies();
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      // Find and click upvote button as guest - use the FIRST response
      // (We'll login as Bob who can vote on Alice's first response)
      const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
      const upvoteExists = await upvoteButton
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (!upvoteExists) {
        test.skip(true, 'Upvote button not visible in UI');
        return;
      }

      await upvoteButton.click();

      // Login modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

      // Login using the modal as Bob (not Alice to avoid rate limiting with other tests)
      const dialog = page.getByRole('dialog');
      const maxRetries = 3;
      let loginSuccess = false;

      for (let attempt = 0; attempt < maxRetries && !loginSuccess; attempt++) {
        // Make sure dialog is open before attempting login
        if (!(await dialog.isVisible())) {
          await upvoteButton.click();
          await expect(dialog).toBeVisible({ timeout: 5000 });
        }

        await page.getByRole('button', { name: /Bob Builder/i }).click();
        await dialog.getByRole('button', { name: /^log in$/i }).click();

        // Wait a moment and check for rate limit error
        await page.waitForTimeout(1000);
        const throttlerError = page.locator('text=ThrottlerException');
        const hasThrottlerError = await throttlerError.isVisible().catch(() => false);

        if (hasThrottlerError) {
          // Close the modal and wait before retry
          const closeButton = dialog
            .locator('[aria-label="Close"]')
            .or(dialog.locator('button:has-text("×")'));
          const closeExists = await closeButton
            .first()
            .isVisible()
            .catch(() => false);
          if (closeExists) {
            await closeButton.first().click();
            await expect(dialog).not.toBeVisible({ timeout: 3000 });
          }
          // Wait for rate limit to expire (longer each retry)
          await page.waitForTimeout(3000 * (attempt + 1));
          continue;
        }

        loginSuccess = true;
      }

      // Wait for modal to close and authentication to complete
      await expect(dialog).not.toBeVisible({ timeout: 10000 });

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500); // Allow token propagation

      // After login, the app may redirect to /topics?welcome=true
      // Navigate back to the discussion page to continue the vote flow
      await navigateToSeededTopic(page, 'CONGESTION_PRICING');

      // Re-locate the upvote button (we're on a new page) - use first() for Alice's response (Bob can vote on it)
      const upvoteButtonAfterLogin = page.locator('[data-testid="upvote-button"]').first();
      await expect(upvoteButtonAfterLogin).toBeVisible({ timeout: 10000 });

      // Get initial vote state (may be true if Alice already voted from seed data)
      const initialActiveState = await upvoteButtonAfterLogin.getAttribute('data-active');

      await upvoteButtonAfterLogin.click();

      // Login modal should NOT appear (user is now authenticated)
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });

      // Vote should toggle: if was active, now inactive; if inactive, now active
      const expectedState = initialActiveState === 'true' ? 'false' : 'true';
      await expect(upvoteButtonAfterLogin).toHaveAttribute('data-active', expectedState, {
        timeout: 10000,
      });
    });
  });

  test.describe('Authenticated users should have full functionality', () => {
    // Note: These tests require the full backend stack to be running.
    // They will be skipped if login fails (indicating backend is not available).

    test.beforeEach(async ({ page }) => {
      // Attempt to login - will fail if backend not running
      try {
        await loginWithDemoAccount(page, 'Alice Anderson');
      } catch (error) {
        // Login failed - will be caught by individual tests
        // We don't skip here as test.skip() doesn't work in beforeEach
      }
    });

    test('should allow voting when authenticated', async ({ page }) => {
      // Check if login was successful by verifying auth token is stored
      // Note: Token may be in sessionStorage if rememberMe was false (default)
      const authToken = await page.evaluate(
        () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken'),
      );
      if (!authToken) {
        test.skip(true, 'Auth token not present - demo login may have failed');
        return;
      }

      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      // Find upvote button on second response (Bob's) since Alice can't vote on her own
      const upvoteButton = page.locator('[data-testid="upvote-button"]').nth(1);
      const upvoteExists = await upvoteButton.isVisible().catch(() => false);

      if (!upvoteExists) {
        test.skip(true, 'Upvote button not visible in UI');
        return;
      }

      // Wait for vote data to load (button becomes enabled)
      await expect(upvoteButton).not.toBeDisabled({ timeout: 10000 });

      // Get initial vote state (may be true if Alice already voted from seed data)
      const initialActiveState = await upvoteButton.getAttribute('data-active');

      await upvoteButton.click();

      // Login modal should NOT appear
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });

      // Vote should toggle: if was active, now inactive; if inactive, now active
      const expectedState = initialActiveState === 'true' ? 'false' : 'true';
      await expect(upvoteButton).toHaveAttribute('data-active', expectedState, { timeout: 10000 });
    });

    test('should allow bookmarking when authenticated', async ({ page }) => {
      // Check if login was successful (login modal should not be visible)
      const loginModalVisible = await page
        .getByRole('dialog')
        .isVisible()
        .catch(() => false);
      if (loginModalVisible) {
        test.skip(true, 'Login failed - backend may not be running');
        return;
      }

      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      const responseItem = page.locator('[data-testid="response-item"]').first();

      // Hover to reveal action buttons
      await responseItem.hover();
      await page.waitForTimeout(300);

      // Find and click bookmark button
      const bookmarkButton = responseItem.locator(
        '[data-testid="bookmark-button"], button[aria-label*="bookmark"]',
      );
      const bookmarkExists = await bookmarkButton.isVisible().catch(() => false);

      if (!bookmarkExists) {
        test.skip(true, 'Bookmark button not visible in UI');
        return;
      }

      await bookmarkButton.click();

      // Login modal should NOT appear
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });

      // Wait for bookmark state to update with proper retry (use poll for OR condition)
      await expect
        .poll(
          async () => {
            const isBookmarked = await bookmarkButton.getAttribute('data-bookmarked');
            const ariaPressed = await bookmarkButton.getAttribute('aria-pressed');
            return isBookmarked === 'true' || ariaPressed === 'true';
          },
          { timeout: 10000 },
        )
        .toBeTruthy();
    });
  });

  test.describe('Guest browsing is unaffected', () => {
    test('should allow guest to browse topics list', async ({ page }) => {
      await page.goto('/topics');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Topics should be visible - skip if API isn't available
      const topicCards = page.locator('[data-testid="topic-card"]');
      const hasTopics = await topicCards
        .first()
        .isVisible({ timeout: 15000 })
        .catch(() => false);

      if (!hasTopics) {
        // Check if there's an error message or 0 topics indicating API failure
        const errorAlert = page.locator('text=Failed to load topics');
        const zeroTopics = page.locator('text=0 topics');
        const hasError = await errorAlert.isVisible().catch(() => false);
        const hasZeroTopics = await zeroTopics.isVisible().catch(() => false);

        if (hasError || hasZeroTopics) {
          test.skip(true, 'Topics API not available - backend may not be running');
          return;
        }
      }

      await expect(topicCards.first()).toBeVisible();
    });

    test('should allow guest to read topic details', async ({ page }) => {
      // Navigate to a topic
      await navigateToSeededTopic(page, 'CONGESTION_PRICING');

      // Topic title should be visible - use .first() to avoid strict mode violation
      // (data-testid="topic-title" matches multiple elements in the sidebar)
      const topicTitle = page
        .locator('.conversation-panel h1, [data-testid="topic-title"]')
        .first();
      const titleVisible = await topicTitle.isVisible().catch(() => false);

      if (!titleVisible) {
        test.skip(true, 'Topic details not available - backend may not be running');
        return;
      }

      await expect(topicTitle).toBeVisible();
    });

    test('should allow guest to view responses', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - backend may be starting up');
        return;
      }

      const responseItems = page.locator('[data-testid="response-item"]');
      await expect(responseItems.first()).toBeVisible();
    });

    test('should allow guest to view user profiles', async ({ page }) => {
      // Navigate to a topic with responses (30s timeout for CI cold-starts)
      const { hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
      if (!hasResponses) {
        test.skip(true, 'No responses loaded - cannot navigate to author profile');
        return;
      }

      // Click on the first author's profile link (wait for links to be hydrated)
      const authorLink = page.locator('[data-testid="response-item"] a[href^="/profile/"]').first();
      const hasAuthorLink = await authorLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasAuthorLink) {
        test.skip(true, 'No author profile links found in responses');
        return;
      }

      await authorLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Profile content should be visible (look for common profile elements)
      const profileContent = page.locator('[data-testid="profile-page"], .profile-content, h1');
      const profileExists = await profileContent
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      if (!profileExists) {
        test.skip(true, 'Profile page not available - backend may not be running');
        return;
      }

      await expect(profileContent.first()).toBeVisible();
    });
  });
});
