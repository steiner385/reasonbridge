/**
 * Discussion Creation Flow E2E Tests (Feature 009)
 *
 * Tests for creating discussions under topics.
 *
 * IMPORTANT: These tests are SKIPPED because the feature is not fully implemented:
 * - The DiscussionListPage and CreateDiscussionForm components exist
 * - The backend API (/discussions endpoint) exists
 * - BUT: No route exposes DiscussionListPage in the UI
 *
 * Tracked in: https://github.com/steiner385/reasonbridge/issues/993
 *
 * Current routing:
 * - /topics -> TopicsPage (create TOPICS via modal) - tested in create-topic.spec.ts
 * - /discussions?topic=<id> -> DiscussionPage (view/post responses)
 *
 * When this feature is implemented, it will add:
 * - /topics/:topicId/discussions -> DiscussionListPage
 *
 * See also: create-topic.spec.ts for topic creation tests (which IS implemented)
 *
 * @see services/discussion-service/src/discussions/discussions.controller.ts
 * @see frontend/src/pages/Discussions/DiscussionListPage.tsx
 * @see frontend/src/components/discussions/CreateDiscussionForm.tsx
 */

import { test, expect } from '@playwright/test';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

test.describe('Discussion Creation Flow', () => {
  // SKIPPED: E2E tests should only test real production code, not mocked APIs
  // TODO: Rewrite to use real backend or move to integration tests
  // NOTE: Also blocked because DiscussionListPage is not routed - no /topics/:topicId/discussions route exists
  test.skip(true, 'Uses mock APIs - needs rewrite to use real backend');

  test.beforeEach(async ({ page }) => {
    // Set up authentication
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock topics endpoint for topic detail
    await page.route('**/api/topics/*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-topic-id',
            title: 'Climate Change Policy Discussion',
            description: 'A comprehensive discussion about climate change policies.',
            status: 'ACTIVE',
            visibility: 'PUBLIC',
            evidenceStandards: 'STANDARD',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participantCount: 25,
            responseCount: 42,
            discussionCount: 3,
            tags: [{ id: 'tag-1', name: 'climate', slug: 'climate' }],
          }),
        });
      } else {
        route.continue();
      }
    });

    // Mock discussions endpoint
    await page.route('**/api/discussions*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'discussion-1',
                title: 'Carbon Tax Implementation',
                topicId: 'test-topic-id',
                status: 'ACTIVE',
                responseCount: 15,
                participantCount: 8,
                lastActivityAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                creator: {
                  id: 'user-1',
                  displayName: 'Climate Expert',
                },
              },
            ],
            meta: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 1,
              itemsPerPage: 20,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          }),
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-discussion-123',
            topicId: 'test-topic-id',
            title: 'Should carbon taxes be increased?',
            status: 'ACTIVE',
            responseCount: 1,
            participantCount: 1,
            lastActivityAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            creator: {
              id: 'test-user-1',
              displayName: 'Test User',
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Navigate to topics page (DiscussionListPage route doesn't exist yet)
    await page.goto('/topics');
  });

  // =============================================================================
  // SKIPPED TESTS - Awaiting DiscussionListPage route implementation
  // =============================================================================

  test.skip('should display the "Start Discussion" button on discussion list page', async ({
    page,
  }) => {
    // When implemented: Navigate to /topics/:topicId/discussions
    // await page.goto('/topics/test-topic-id/discussions');
    const startButton = page.getByRole('button', { name: /start discussion/i });
    await expect(startButton).toBeVisible();
  });

  test.skip('should open discussion creation form when clicking "Start Discussion"', async ({
    page,
  }) => {
    // When implemented: Navigate to /topics/:topicId/discussions
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Form should be visible with heading
    await expect(page.getByText(/start a new discussion/i)).toBeVisible();
    await expect(page.getByLabel(/discussion title/i)).toBeVisible();
    await expect(page.getByLabel(/initial response/i)).toBeVisible();
  });

  test.skip('should validate title length (minimum 10 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Enter short title
    const titleInput = page.getByLabel(/discussion title/i);
    await titleInput.fill('Short');

    // Fill valid content to bypass other validation
    const contentInput = page.getByLabel(/initial response/i);
    await contentInput.fill(
      'This is a sufficiently long initial response that meets the minimum character requirement of fifty characters.',
    );

    // Try to submit
    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show validation error
    await expect(page.getByText(/title must be at least 10 characters/i)).toBeVisible();
  });

  test.skip('should validate title length (maximum 200 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.getByLabel(/discussion title/i);
    const longTitle = 'A'.repeat(201);
    await titleInput.fill(longTitle);

    const contentInput = page.getByLabel(/initial response/i);
    await contentInput.fill(
      'This is a sufficiently long initial response that meets the minimum character requirement of fifty characters.',
    );

    await page.getByRole('button', { name: /publish discussion/i }).click();

    await expect(page.getByText(/title cannot exceed 200 characters/i)).toBeVisible();
  });

  test.skip('should validate initial response length (minimum 50 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.getByLabel(/discussion title/i);
    await titleInput.fill('Valid Discussion Title');

    const contentInput = page.getByLabel(/initial response/i);
    await contentInput.fill('Too short content');

    await page.getByRole('button', { name: /publish discussion/i }).click();

    await expect(page.getByText(/initial response must be at least 50 characters/i)).toBeVisible();
  });

  test.skip('should show character counter for title', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.getByLabel(/discussion title/i);
    await titleInput.fill('Test Title');

    // Should show character count
    await expect(page.getByText(/10\/200/)).toBeVisible();
  });

  test.skip('should show character counter for content', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const contentInput = page.getByLabel(/initial response/i);
    const testContent = 'This is test content for character counting.';
    await contentInput.fill(testContent);

    // Should show character count
    await expect(page.getByText(new RegExp(`${testContent.length}`, 'i'))).toBeVisible();
  });

  test.skip('should allow adding citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Find and fill citation URL input
    const citationUrlInput = page.getByPlaceholder(/https:\/\/example\.com\/article/i);
    await citationUrlInput.fill('https://example.com/source1');

    // Find and fill citation title input
    const citationTitleInput = page.getByPlaceholder(/citation title/i);
    await citationTitleInput.fill('Example Source');

    // Click add citation button
    await page.getByRole('button', { name: /add citation/i }).click();

    // Citation should appear in the list
    await expect(page.getByText('https://example.com/source1')).toBeVisible();
    await expect(page.getByText('Example Source')).toBeVisible();
  });

  test.skip('should allow removing citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Add a citation
    const citationUrlInput = page.getByPlaceholder(/https:\/\/example\.com\/article/i);
    await citationUrlInput.fill('https://example.com/source1');
    await page.getByRole('button', { name: /add citation/i }).click();

    // Verify it was added
    await expect(page.getByText('https://example.com/source1')).toBeVisible();

    // Remove the citation
    const removeButton = page.getByRole('button', { name: /remove citation/i });
    await removeButton.click();

    // Citation should be removed
    await expect(page.getByText('https://example.com/source1')).not.toBeVisible();
  });

  test.skip('should validate citation URL format', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Try to add invalid URL
    const citationUrlInput = page.getByPlaceholder(/https:\/\/example\.com\/article/i);
    await citationUrlInput.fill('not-a-valid-url');
    await page.getByRole('button', { name: /add citation/i }).click();

    // Should show error
    await expect(page.getByText(/invalid url format/i)).toBeVisible();
  });

  test.skip('should enforce maximum 10 citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Add 10 citations
    for (let i = 1; i <= 10; i++) {
      const citationUrlInput = page.getByPlaceholder(/https:\/\/example\.com\/article/i);
      await citationUrlInput.fill(`https://example.com/source${i}`);
      await page.getByRole('button', { name: /add citation/i }).click();
    }

    // Try to add 11th citation
    const citationUrlInput = page.getByPlaceholder(/https:\/\/example\.com\/article/i);
    await citationUrlInput.fill('https://example.com/source11');
    await page.getByRole('button', { name: /add citation/i }).click();

    // Should show error
    await expect(page.getByText(/maximum 10 citations allowed/i)).toBeVisible();
  });

  test.skip('should allow canceling discussion creation', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Fill in some data
    await page.getByLabel(/discussion title/i).fill('Test Discussion');

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByText(/start a new discussion/i)).not.toBeVisible();
  });

  test.skip('should successfully create a discussion and redirect', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Fill valid form
    await page.getByLabel(/discussion title/i).fill('Should carbon taxes be increased?');
    await page
      .getByLabel(/initial response/i)
      .fill(
        'I believe carbon taxes are essential for addressing climate change because they create economic incentives for reducing emissions.',
      );

    // Submit
    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show loading state briefly
    await expect(page.getByRole('button', { name: /publishing/i })).toBeVisible();

    // Should redirect to new discussion
    await page.waitForURL('**/discussions/new-discussion-123', { timeout: 5000 });
  });

  test.skip('should show error message on API failure', async ({ page }) => {
    // Override mock with error response
    await page.route('**/api/discussions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Only verified users can create discussions',
            statusCode: 403,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /start discussion/i }).click();

    await page.getByLabel(/discussion title/i).fill('Should carbon taxes be increased?');
    await page
      .getByLabel(/initial response/i)
      .fill(
        'I believe carbon taxes are essential for addressing climate change because they create economic incentives.',
      );

    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show error message
    await expect(page.getByText(/only verified users can create discussions/i)).toBeVisible();
  });

  test.skip('should show rate limit error when exceeded', async ({ page }) => {
    // Override mock with rate limit error
    await page.route('**/api/discussions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Rate limit exceeded (5 discussions per day)',
            statusCode: 429,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /start discussion/i }).click();

    await page.getByLabel(/discussion title/i).fill('Should carbon taxes be increased?');
    await page
      .getByLabel(/initial response/i)
      .fill(
        'I believe carbon taxes are essential for addressing climate change because they create economic incentives.',
      );

    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show rate limit error
    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible();
  });
});
