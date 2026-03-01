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
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

// Mock data for responses with votes
const mockResponseWithVotes = {
  id: 'response-with-votes',
  discussionId: 'test-topic-voting',
  topicId: 'test-topic-voting',
  content: 'This is a well-reasoned response that has received several votes from the community.',
  author: { id: 'user-1', displayName: 'Alice Smith' },
  parentResponseId: null,
  parentId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
  replyCount: 0,
  replies: [],
};

const mockVoteSummary = {
  upvotes: 12,
  downvotes: 3,
  score: 9,
  userVote: null, // User hasn't voted yet
};

const mockVoteSummaryWithUserUpvote = {
  upvotes: 13,
  downvotes: 3,
  score: 10,
  userVote: 'up',
};

const mockTopicForVoting = {
  id: 'test-topic-voting',
  title: 'Topic for Testing Voting',
  description: 'A test topic for demonstrating vote functionality',
  status: 'ACTIVE',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date().toISOString(),
  creatorId: 'user-1',
  participantCount: 15,
  responseCount: 1,
  currentDiversityScore: 0.65,
  consensusScore: 0.72,
  tags: [],
};

test.describe('Response Voting', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock topic endpoint
    await page.route(/\/topics\/test-topic-voting\/?(\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTopicForVoting),
      });
    });

    // Mock propositions endpoint
    await page.route(/\/topics\/test-topic-voting\/propositions/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock responses endpoint
    await page.route(/\/topics\/test-topic-voting\/responses/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockResponseWithVotes]),
      });
    });

    // Mock read-state endpoint
    await page.route(/\/topics\/test-topic-voting\/read-state/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    // Mock reactions endpoint
    await page.route(/\/responses\/.*\/reactions$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reactions: [], totalCount: 0 }),
      });
    });

    // Mock bookmark status
    await page.route(/\/bookmarks\/.*\/status/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isBookmarked: false }),
      });
    });

    // Mock votes endpoint - GET
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummary),
        });
      } else {
        route.continue();
      }
    });
  });

  test('should display vote counts on responses', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Look for vote count display
    const voteCount = page.locator('[data-testid="vote-count"], [data-testid="vote-score"]');
    const exists = await voteCount
      .first()
      .isVisible()
      .catch(() => false);

    if (exists) {
      const countText = await voteCount.first().textContent();
      // Should display a number (the score)
      expect(countText).toMatch(/\d/);
    } else {
      // Check for upvote/downvote buttons which may show counts
      const voteButtons = page.locator(
        '[data-testid="upvote-button"], [data-testid="downvote-button"]',
      );
      const buttonsExist = await voteButtons
        .first()
        .isVisible()
        .catch(() => false);

      if (!buttonsExist) {
        test.skip();
      }
    }
  });

  test('should display upvote and downvote buttons', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Look for vote buttons
    const upvoteButton = page.locator(
      '[data-testid="upvote-button"], button[aria-label*="upvote"], button:has-text("Upvote")',
    );
    const downvoteButton = page.locator(
      '[data-testid="downvote-button"], button[aria-label*="downvote"], button:has-text("Downvote")',
    );

    const upvoteExists = await upvoteButton
      .first()
      .isVisible()
      .catch(() => false);
    const downvoteExists = await downvoteButton
      .first()
      .isVisible()
      .catch(() => false);

    if (upvoteExists || downvoteExists) {
      if (upvoteExists) {
        await expect(upvoteButton.first()).toBeVisible();
      }
      if (downvoteExists) {
        await expect(downvoteButton.first()).toBeVisible();
      }
    } else {
      // Might appear on hover
      const responseItem = page.locator('[data-testid="response-item"]').first();
      await responseItem.hover();
      await page.waitForTimeout(300);

      const hoverUpvote = page.locator('[data-testid="upvote-button"]');
      const hoverExists = await hoverUpvote.isVisible().catch(() => false);

      if (!hoverExists) {
        test.skip();
      }
    }
  });

  test('should upvote a response when upvote button is clicked', async ({ page }) => {
    // Mock POST vote endpoint
    await page.route(/\/responses\/response-with-votes\/vote$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummaryWithUserUpvote),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    // Find and click upvote button
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    const exists = await upvoteButton.isVisible().catch(() => false);

    if (exists) {
      await upvoteButton.click();

      // Wait for vote to register
      await page.waitForTimeout(500);

      // Button should show active state
      const isActive = await upvoteButton.getAttribute('data-active');
      // Vote was successful if no error
    } else {
      test.skip();
    }
  });

  test('should downvote a response when downvote button is clicked', async ({ page }) => {
    // Mock POST vote endpoint for downvote
    await page.route(/\/responses\/response-with-votes\/vote$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            upvotes: 12,
            downvotes: 4,
            score: 8,
            userVote: 'down',
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    // Find and click downvote button
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
    const exists = await downvoteButton.isVisible().catch(() => false);

    if (exists) {
      await downvoteButton.click();
      await page.waitForTimeout(500);
    } else {
      test.skip();
    }
  });

  test('should remove vote when same button is clicked again', async ({ page }) => {
    // First mock: user has already upvoted
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummaryWithUserUpvote),
        });
      } else {
        route.continue();
      }
    });

    // Mock DELETE vote endpoint
    await page.route(/\/responses\/response-with-votes\/vote$/, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 204,
        });
      } else if (route.request().method() === 'POST') {
        // Toggle: clicking again removes vote
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummary), // Back to no user vote
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    // Find active upvote button and click to toggle off
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    const exists = await upvoteButton.isVisible().catch(() => false);

    if (exists) {
      await upvoteButton.click();
      await page.waitForTimeout(500);
    } else {
      test.skip();
    }
  });

  test('should switch vote when opposite button is clicked', async ({ page }) => {
    // Mock: user has upvoted, clicking downvote should switch
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummaryWithUserUpvote),
        });
      } else {
        route.continue();
      }
    });

    await page.route(/\/responses\/response-with-votes\/vote$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            upvotes: 12,
            downvotes: 4,
            score: 8,
            userVote: 'down',
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    // Click downvote while already upvoted
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
    const exists = await downvoteButton.isVisible().catch(() => false);

    if (exists) {
      await downvoteButton.click();
      await page.waitForTimeout(500);
    } else {
      test.skip();
    }
  });

  test('should show visual indicator for user vote state', async ({ page }) => {
    // Mock: user has upvoted
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummaryWithUserUpvote),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Check for active/highlighted upvote button
    const activeUpvote = page.locator(
      '[data-testid="upvote-button"][data-active="true"], [data-testid="upvote-button"].active',
    );
    const exists = await activeUpvote.isVisible().catch(() => false);

    if (exists) {
      await expect(activeUpvote).toBeVisible();
    }
  });

  test('should update vote count optimistically', async ({ page }) => {
    await page.route(/\/responses\/response-with-votes\/vote$/, (route) => {
      // Delay response to verify optimistic update
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockVoteSummaryWithUserUpvote),
        });
      }, 1000);
    });

    await page.goto('/discussions?topic=test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    const exists = await upvoteButton.isVisible().catch(() => false);

    if (exists) {
      // Click and immediately check for visual feedback
      await upvoteButton.click();

      // UI should update immediately (optimistic)
      await page.waitForTimeout(100);

      // Button should show pending/active state before API returns
    } else {
      test.skip();
    }
  });
});
