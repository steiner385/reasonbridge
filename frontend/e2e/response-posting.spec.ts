/**
 * T049 [US2] - E2E test for response posting flow (Feature 009)
 *
 * Tests the complete user journey for posting responses to discussions:
 * - Viewing discussion with existing responses
 * - Opening response form
 * - Adding citations
 * - Form validation
 * - Successful submission with optimistic updates
 * - Response appearing in the list
 */

import { test, expect } from '@playwright/test';

test.describe('Response Posting Flow', () => {
  const mockDiscussion = {
    id: 'discussion-123',
    topicId: 'topic-456',
    title: 'Should carbon taxes be increased in 2027?',
    status: 'ACTIVE',
    creator: {
      id: 'user-123',
      displayName: 'Alice Smith',
    },
    responseCount: 3,
    participantCount: 2,
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString(),
  };

  const mockResponses = [
    {
      id: 'response-1',
      discussionId: 'discussion-123',
      content: 'I believe carbon taxes are essential for addressing climate change.',
      author: { id: 'user-123', displayName: 'Alice Smith' },
      parentResponseId: null,
      citations: [],
      version: 1,
      editCount: 0,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      replyCount: 0,
    },
    {
      id: 'response-2',
      discussionId: 'discussion-123',
      content:
        'While I understand the concern, I worry about the economic impact on lower-income families.',
      author: { id: 'user-456', displayName: 'Bob Johnson' },
      parentResponseId: null,
      citations: [
        {
          id: 'citation-1',
          originalUrl: 'https://example.com/economic-impact',
          normalizedUrl: 'https://example.com/economic-impact',
          title: 'Economic Impact Study',
          validationStatus: 'UNVERIFIED',
          validatedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
      version: 1,
      editCount: 0,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
      replyCount: 0,
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Mock the discussion detail API
    await page.route('**/discussions/discussion-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDiscussion),
      });
    });

    // Mock the responses API
    await page.route('**/discussions/discussion-123/responses', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponses),
        });
      }
    });

    // Navigate to discussion detail page
    await page.goto('/discussions/discussion-123');
  });

  test('should display discussion title and existing responses', async ({ page }) => {
    // Discussion title should be visible
    await expect(
      page.getByRole('heading', { name: /should carbon taxes be increased/i }),
    ).toBeVisible();

    // Existing responses should be visible
    await expect(page.getByText(/I believe carbon taxes are essential/i)).toBeVisible();
    await expect(page.getByText(/While I understand the concern/i)).toBeVisible();

    // Should show response count
    await expect(page.getByText(/3 responses/i)).toBeVisible();
  });

  test('should display "Add Response" button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add response/i });
    await expect(addButton).toBeVisible();
  });

  test('should open response form when clicking "Add Response"', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    // Form should be visible
    await expect(page.getByText(/add your response/i)).toBeVisible();
    await expect(page.getByPlaceholder(/share your perspective/i)).toBeVisible();
  });

  test('should validate response length (minimum 50 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill('Too short');

    await page.getByRole('button', { name: /post response/i }).click();

    await expect(page.getByText(/response must be at least 50 characters/i)).toBeVisible();
  });

  test('should validate response length (maximum 25000 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    const longContent = 'A'.repeat(25001);
    await contentInput.fill(longContent);

    await page.getByRole('button', { name: /post response/i }).click();

    await expect(page.getByText(/response cannot exceed 25,000 characters/i)).toBeVisible();
  });

  test('should show character counter with minimum requirement hint', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill('This is a test');

    // Should show how many more characters needed
    await expect(page.getByText(/more needed/i)).toBeVisible();
  });

  test('should show green character counter when minimum is met', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    const validContent =
      'This is a sufficiently long response that meets the minimum character requirement.';
    await contentInput.fill(validContent);

    // Character counter should be visible (checking for the number, not color as color is CSS)
    await expect(page.getByText(new RegExp(`${validContent.length}`, 'i'))).toBeVisible();
  });

  test('should disable submit button when content is too short', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill('Short text');

    const submitButton = page.getByRole('button', { name: /post response/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when content meets minimum', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill(
      'This is a sufficiently long response that meets the minimum character requirement.',
    );

    const submitButton = page.getByRole('button', { name: /post response/i });
    await expect(submitButton).toBeEnabled();
  });

  test('should allow adding citations to response', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    // Click "Add Citation" button to show citation inputs
    await page.getByRole('button', { name: /add citation/i }).click();

    // Fill citation details
    const urlInput = page.getByPlaceholder(/https:\/\/example\.com\/source/i);
    await urlInput.fill('https://example.com/carbon-research');

    const titleInput = page.getByPlaceholder(/citation title \(optional\)/i);
    await titleInput.fill('Carbon Tax Research');

    // Click add button
    await page.getByRole('button', { name: /^add$/i }).click();

    // Citation should appear
    await expect(page.getByText('https://example.com/carbon-research')).toBeVisible();
    await expect(page.getByText('Carbon Tax Research')).toBeVisible();
  });

  test('should allow removing citations', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    // Add a citation
    await page.getByRole('button', { name: /add citation/i }).click();
    await page
      .getByPlaceholder(/https:\/\/example\.com\/source/i)
      .fill('https://example.com/source1');
    await page.getByRole('button', { name: /^add$/i }).click();

    // Verify it was added
    await expect(page.getByText('https://example.com/source1')).toBeVisible();

    // Remove it
    await page.getByRole('button', { name: /remove citation/i }).click();

    // Should be removed
    await expect(page.getByText('https://example.com/source1')).not.toBeVisible();
  });

  test('should successfully post response with optimistic update', async ({ page }) => {
    // Mock the response creation API
    await page.route('**/responses', async (route) => {
      if (route.request().method() === 'POST') {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'response-new',
            discussionId: 'discussion-123',
            content:
              'I agree that we need a balanced approach that considers both environmental and economic factors.',
            author: { id: 'current-user', displayName: 'Current User' },
            parentResponseId: null,
            citations: [],
            version: 1,
            editCount: 0,
            editedAt: null,
            deletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replyCount: 0,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add response/i }).click();

    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill(
      'I agree that we need a balanced approach that considers both environmental and economic factors.',
    );

    await page.getByRole('button', { name: /post response/i }).click();

    // Should show posting state
    await expect(page.getByRole('button', { name: /posting/i })).toBeVisible();

    // Response should appear in the list (optimistic update)
    await expect(page.getByText(/I agree that we need a balanced approach/i)).toBeVisible();
  });

  test('should allow canceling response creation', async ({ page }) => {
    await page.getByRole('button', { name: /add response/i }).click();

    // Fill in some data
    const contentInput = page.getByPlaceholder(/share your perspective/i);
    await contentInput.fill('This is a test response that will be canceled before posting.');

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByText(/add your response/i)).not.toBeVisible();
  });

  test('should show error message on API failure', async ({ page }) => {
    // Mock API error
    await page.route('**/responses', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Cannot add responses to non-active discussions',
            statusCode: 400,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add response/i }).click();

    await page
      .getByPlaceholder(/share your perspective/i)
      .fill('This is a valid response that will trigger an API error for testing purposes.');

    await page.getByRole('button', { name: /post response/i }).click();

    // Should show error message
    await expect(page.getByText(/cannot add responses to non-active discussions/i)).toBeVisible();
  });

  test('should show rate limit error when exceeded', async ({ page }) => {
    // Mock rate limit error
    await page.route('**/responses', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Rate limit exceeded (10 responses per minute)',
            statusCode: 429,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add response/i }).click();

    await page
      .getByPlaceholder(/share your perspective/i)
      .fill('This is a valid response that will trigger a rate limit error for testing purposes.');

    await page.getByRole('button', { name: /post response/i }).click();

    // Should show rate limit error
    await expect(page.getByText(/rate limit exceeded/i)).toBeVisible();
  });

  test('should display citations from existing responses', async ({ page }) => {
    // Second response has a citation
    await expect(page.getByText('Economic Impact Study')).toBeVisible();

    // Citation should be a link
    const citationLink = page.getByRole('link', { name: /economic impact study/i });
    await expect(citationLink).toBeVisible();
    await expect(citationLink).toHaveAttribute('href', 'https://example.com/economic-impact');
    await expect(citationLink).toHaveAttribute('target', '_blank');
  });

  test('should clear form after successful submission', async ({ page }) => {
    // Mock successful response creation
    await page.route('**/responses', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'response-new',
            discussionId: 'discussion-123',
            content: 'Test response content',
            author: { id: 'current-user', displayName: 'Test User' },
            parentResponseId: null,
            citations: [],
            version: 1,
            editCount: 0,
            editedAt: null,
            deletedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            replyCount: 0,
          }),
        });
      }
    });

    await page.getByRole('button', { name: /add response/i }).click();

    await page
      .getByPlaceholder(/share your perspective/i)
      .fill(
        'This is a test response that will be successfully posted and then the form should clear.',
      );

    await page.getByRole('button', { name: /post response/i }).click();

    // Wait for success
    await page.waitForTimeout(1000);

    // Form should be closed after successful submission
    await expect(page.getByText(/add your response/i)).not.toBeVisible();
  });
});
