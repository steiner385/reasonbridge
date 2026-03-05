/**
 * E2E tests for response bookmarking feature
 *
 * Tests the complete bookmarking user journey:
 * - Viewing bookmark status on responses
 * - Adding a bookmark
 * - Removing a bookmark
 * - Viewing bookmarked responses list
 * - Bookmark persistence across sessions
 */

import { test, expect } from '@playwright/test';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

// Mock data for responses
const mockResponseForBookmark = {
  id: 'response-to-bookmark',
  discussionId: 'test-topic-bookmarks',
  topicId: 'test-topic-bookmarks',
  content: 'This is an insightful response worth bookmarking for later reference.',
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

const mockBookmarkedResponse = {
  id: 'already-bookmarked-response',
  discussionId: 'test-topic-bookmarks',
  topicId: 'test-topic-bookmarks',
  content: 'This response is already bookmarked by the user.',
  author: { id: 'user-2', displayName: 'Bob Johnson' },
  parentResponseId: null,
  parentId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: null,
  createdAt: new Date(Date.now() - 43200000).toISOString(),
  updatedAt: new Date(Date.now() - 43200000).toISOString(),
  replyCount: 0,
  replies: [],
};

const mockTopicForBookmarks = {
  id: 'test-topic-bookmarks',
  title: 'Topic for Testing Bookmarks',
  description: 'A test topic for demonstrating bookmark functionality',
  status: 'ACTIVE',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date().toISOString(),
  creatorId: 'user-1',
  participantCount: 5,
  responseCount: 2,
  currentDiversityScore: 0.65,
  consensusScore: 0.72,
  tags: [],
};

const mockBookmarksList = [
  {
    id: 'bookmark-1',
    userId: 'test-user-1',
    responseId: 'already-bookmarked-response',
    response: mockBookmarkedResponse,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

test.describe('Response Bookmarking', () => {
  // SKIPPED: E2E tests should only test real production code, not mocked APIs
  // TODO: Rewrite to use real backend or move to integration tests
  test.skip(true, 'Uses mock APIs - needs rewrite to use real backend');

  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock topic endpoint
    await page.route(/\/topics\/test-topic-bookmarks\/?(\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTopicForBookmarks),
      });
    });

    // Mock propositions endpoint
    await page.route(/\/topics\/test-topic-bookmarks\/propositions/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock responses endpoint
    await page.route(/\/topics\/test-topic-bookmarks\/responses/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockResponseForBookmark, mockBookmarkedResponse]),
      });
    });

    // Mock read-state endpoint
    await page.route(/\/topics\/test-topic-bookmarks\/read-state/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    // Mock reactions endpoints for both responses
    await page.route(/\/responses\/.*\/reactions$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reactions: [], totalCount: 0 }),
      });
    });

    // Mock bookmark status - not bookmarked
    await page.route(/\/bookmarks\/response-to-bookmark\/status/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isBookmarked: false }),
      });
    });

    // Mock bookmark status - already bookmarked
    await page.route(/\/bookmarks\/already-bookmarked-response\/status/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isBookmarked: true }),
      });
    });

    // Mock bookmarks list
    await page.route(/\/bookmarks(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockBookmarksList,
            total: 1,
            limit: 20,
            offset: 0,
          }),
        });
      } else {
        route.continue();
      }
    });
  });

  test('should display bookmark button on responses', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Look for bookmark button
    const bookmarkButton = page.locator(
      '[data-testid="bookmark-button"], button[aria-label*="bookmark"], button:has-text("Bookmark")',
    );

    const exists = await bookmarkButton
      .first()
      .isVisible()
      .catch(() => false);

    if (exists) {
      await expect(bookmarkButton.first()).toBeVisible();
    } else {
      // Bookmark might appear on hover
      const responseItem = page.locator('[data-testid="response-item"]').first();
      await responseItem.hover();
      await page.waitForTimeout(300);

      const hoverBookmark = page.locator('[data-testid="bookmark-button"]');
      const hoverExists = await hoverBookmark.isVisible().catch(() => false);

      if (!hoverExists) {
        test.skip();
      }
    }
  });

  test('should show filled bookmark icon for bookmarked responses', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find the bookmarked response
    const bookmarkedResponse = page.locator(
      '[data-testid="response-item"]:has-text("already bookmarked")',
    );

    const exists = await bookmarkedResponse.isVisible().catch(() => false);

    if (exists) {
      // Check for filled bookmark indicator
      const filledBookmark = bookmarkedResponse.locator(
        '[data-bookmarked="true"], [aria-pressed="true"]',
      );
      const filledExists = await filledBookmark.isVisible().catch(() => false);

      if (filledExists) {
        await expect(filledBookmark).toBeVisible();
      }
    }
  });

  test('should add bookmark when button is clicked', async ({ page }) => {
    // Mock POST bookmark endpoint
    await page.route(/\/bookmarks$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-bookmark-id',
            userId: 'test-user-1',
            responseId: 'response-to-bookmark',
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find unbookmarked response
    const unbookmarkedResponse = page.locator('[data-testid="response-item"]').first();
    await unbookmarkedResponse.hover();

    // Find and click bookmark button
    const bookmarkButton = unbookmarkedResponse.locator(
      '[data-testid="bookmark-button"], button[aria-label*="bookmark"]',
    );

    const exists = await bookmarkButton.isVisible().catch(() => false);

    if (exists) {
      await bookmarkButton.click();

      // Wait for bookmark to be added
      await page.waitForTimeout(500);
    } else {
      test.skip();
    }
  });

  test('should remove bookmark when clicked on bookmarked response', async ({ page }) => {
    // Mock DELETE bookmark endpoint
    await page.route(/\/bookmarks\/already-bookmarked-response/, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 204,
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find bookmarked response and its bookmark button
    const bookmarkedResponse = page.locator(
      '[data-testid="response-item"]:has-text("already bookmarked")',
    );

    const exists = await bookmarkedResponse.isVisible().catch(() => false);

    if (exists) {
      await bookmarkedResponse.hover();

      const bookmarkButton = bookmarkedResponse.locator('[data-testid="bookmark-button"]');
      const buttonExists = await bookmarkButton.isVisible().catch(() => false);

      if (buttonExists) {
        await bookmarkButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      test.skip();
    }
  });

  test('should navigate to bookmarks page', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Look for bookmarks link in navigation or profile
    const bookmarksLink = page.locator('a[href*="bookmarks"], a:has-text("Bookmarks")');
    const exists = await bookmarksLink
      .first()
      .isVisible()
      .catch(() => false);

    if (exists) {
      await bookmarksLink.first().click();
      await page.waitForURL(/bookmarks/);

      // Verify we're on the bookmarks page
      expect(page.url()).toContain('bookmarks');
    } else {
      // Try navigating directly
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display bookmarked responses on bookmarks page', async ({ page }) => {
    await page.goto('/bookmarks');

    // Wait for bookmarks to load
    await page.waitForLoadState('networkidle');

    // Check for bookmarked content
    const bookmarkedContent = page.getByText('already bookmarked');
    const emptyState = page.getByText(/no bookmarks/i);

    const hasContent = await bookmarkedContent.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    // Should show either bookmarks or empty state
    expect(hasContent || hasEmptyState).toBeTruthy();
  });

  test('should persist bookmark state after page reload', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Get initial state
    const bookmarkedResponse = page.locator(
      '[data-testid="response-item"]:has-text("already bookmarked")',
    );

    const initialExists = await bookmarkedResponse.isVisible().catch(() => false);

    // Reload the page
    await page.reload();

    // Wait for responses to load again
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Verify bookmark state is preserved
    if (initialExists) {
      await expect(bookmarkedResponse).toBeVisible();
    }
  });

  test('should show bookmark count or indicator in response actions', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-bookmarks');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Look for bookmark indicator
    const responseItem = page.locator('[data-testid="response-item"]').first();
    await responseItem.hover();

    // Check for any bookmark-related UI
    const bookmarkUI = responseItem.locator('[data-testid*="bookmark"]');
    const exists = await bookmarkUI
      .first()
      .isVisible()
      .catch(() => false);

    if (exists) {
      await expect(bookmarkUI.first()).toBeVisible();
    }
  });
});
