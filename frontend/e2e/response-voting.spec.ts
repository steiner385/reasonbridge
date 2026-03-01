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
  userVote: 'UPVOTE', // Must match VoteType: 'UPVOTE' | 'DOWNVOTE'
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

// Mock discussion detail matching DiscussionDetail interface
const mockDiscussionForVoting = {
  id: 'test-topic-voting',
  title: 'Topic for Testing Voting',
  status: 'ACTIVE' as const,
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  topicId: 'test-topic-voting',
  creator: { id: 'user-1', displayName: 'Alice Smith' },
  responseCount: 1,
  participantCount: 15,
  responses: [mockResponseWithVotes],
};

test.describe('Response Voting', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock discussion detail endpoint (for DiscussionDetailPage - non-compact view)
    // Only intercept fetch/xhr requests to API, not browser navigation
    await page.route(/\/discussions\/test-topic-voting\/?(\?.*)?$/, (route) => {
      const resourceType = route.request().resourceType();
      // Only mock API fetch requests, not document navigation
      if (resourceType === 'fetch' || resourceType === 'xhr') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockDiscussionForVoting),
        });
      } else {
        // Let document navigation through to React app
        route.continue();
      }
    });

    // Mock topic endpoint (still needed for responses)
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

    // Note: Votes endpoint mock is set up in individual tests based on scenario
  });

  test('should display vote counts on responses', async ({ page }) => {
    // Mock votes endpoint - user hasn't voted yet
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoteSummary),
      });
    });

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load - DiscussionDetailPage renders in non-compact mode with vote buttons
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Vote count should be visible in non-compact mode
    const voteCount = page.locator('[data-testid="vote-count"]');
    await expect(voteCount.first()).toBeVisible({ timeout: 5000 });

    const countText = await voteCount.first().textContent();
    // Should display a number (the score)
    expect(countText).toMatch(/\d/);
  });

  test('should display upvote and downvote buttons', async ({ page }) => {
    // Mock votes endpoint - user hasn't voted yet
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoteSummary),
      });
    });

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Vote buttons should be visible in non-compact mode
    const upvoteButton = page.locator('[data-testid="upvote-button"]');
    const downvoteButton = page.locator('[data-testid="downvote-button"]');

    await expect(upvoteButton.first()).toBeVisible({ timeout: 5000 });
    await expect(downvoteButton.first()).toBeVisible({ timeout: 5000 });
  });

  test('should upvote a response when upvote button is clicked', async ({ page }) => {
    // Mock votes GET endpoint - user hasn't voted yet
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoteSummary),
      });
    });

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

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find and click upvote button (visible in non-compact mode)
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });
    await upvoteButton.click();

    // Wait for vote to register
    await page.waitForTimeout(500);

    // Button should show active state
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');
  });

  test('should downvote a response when downvote button is clicked', async ({ page }) => {
    // Mock votes GET endpoint - user hasn't voted yet
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoteSummary),
      });
    });

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
            userVote: 'DOWNVOTE',
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find and click downvote button (visible in non-compact mode)
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
    await expect(downvoteButton).toBeVisible({ timeout: 5000 });
    await downvoteButton.click();

    // Wait for vote to register and button to show active state
    await page.waitForTimeout(500);
    await expect(downvoteButton).toHaveAttribute('data-active', 'true');
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

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find active upvote button (should show active state) and click to toggle off
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    await upvoteButton.click();
    await page.waitForTimeout(500);

    // Button should no longer be active
    await expect(upvoteButton).not.toHaveAttribute('data-active', 'true');
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
            userVote: 'DOWNVOTE',
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Upvote should be active initially
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Click downvote while already upvoted
    const downvoteButton = page.locator('[data-testid="downvote-button"]').first();
    await expect(downvoteButton).toBeVisible({ timeout: 5000 });
    await downvoteButton.click();
    await page.waitForTimeout(500);

    // Downvote should now be active, upvote should not
    await expect(downvoteButton).toHaveAttribute('data-active', 'true');
    await expect(upvoteButton).not.toHaveAttribute('data-active', 'true');
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

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Check for active/highlighted upvote button
    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');
  });

  test('should update vote count optimistically', async ({ page }) => {
    // Mock votes GET endpoint - user hasn't voted yet
    await page.route(/\/responses\/response-with-votes\/votes$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockVoteSummary),
      });
    });

    // Mock POST vote endpoint with delay
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

    await page.goto('/discussions/test-topic-voting');

    // Wait for response to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    await expect(upvoteButton).toBeVisible({ timeout: 5000 });

    // Get initial vote count
    const voteCount = page.locator('[data-testid="vote-count"]').first();
    const initialCount = await voteCount.textContent();

    // Click and immediately check for visual feedback
    await upvoteButton.click();

    // UI should update immediately (optimistic) - button shows active
    await page.waitForTimeout(100);
    await expect(upvoteButton).toHaveAttribute('data-active', 'true');

    // Vote count should update optimistically
    const updatedCount = await voteCount.textContent();
    expect(Number(updatedCount)).toBeGreaterThan(Number(initialCount));
  });
});
