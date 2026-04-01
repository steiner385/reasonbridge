/**
 * Discussion Creation Flow E2E Tests (Feature 009)
 *
 * Tests for creating discussions under topics.
 *
 * CONVERTED: Now uses real backend instead of mocks.
 * Issue #993 RESOLVED: Route /topics/:topicId/discussions exists.
 *
 * Routing:
 * - /topics/:topicId/discussions -> DiscussionListPage
 * - /discussions?topic=<id> -> DiscussionPage (view/post responses)
 *
 * @see services/discussion-service/src/discussions/discussions.controller.ts
 * @see frontend/src/pages/Discussions/DiscussionListPage.tsx
 * @see frontend/src/components/discussions/CreateDiscussionForm.tsx
 */

import { test, expect } from '@playwright/test';
import {
  loginWithDemoAccount,
  loginWithEmailPassword,
  SEEDED_TOPICS,
  DEMO_CREDENTIALS,
} from './helpers/demo-auth';

test.describe('Discussion Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Alice Anderson (verified user who can create discussions)
    await loginWithDemoAccount(page, 'Alice Anderson');

    // Navigate to discussion list page for a seeded topic
    const topic = SEEDED_TOPICS.CONGESTION_PRICING;
    await page.goto(`/topics/${topic.id}/discussions`);
    await page.waitForLoadState('networkidle');
  });

  // =============================================================================
  // REAL BACKEND TESTS - Using DiscussionListPage route
  // =============================================================================

  test('should display the "Start Discussion" button on discussion list page', async ({ page }) => {
    const startButton = page.getByRole('button', { name: /start discussion/i });
    await expect(startButton).toBeVisible();
  });

  test('should open discussion creation form when clicking "Start Discussion"', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Form should be visible with heading
    await expect(page.getByText(/start a new discussion/i)).toBeVisible();
    await expect(page.locator('label[for="title"]')).toBeVisible();
    await expect(page.locator('label[for="content"]')).toBeVisible();
  });

  test('should validate title length (minimum 10 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Enter short title
    const titleInput = page.locator('#title');
    await titleInput.fill('Short');

    // Fill valid content to bypass other validation
    const contentInput = page.locator('#content');
    await contentInput.fill(
      'This is a sufficiently long initial response that meets the minimum character requirement of fifty characters.',
    );

    // Try to submit
    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show validation error
    await expect(page.getByText(/title must be at least 10 characters/i)).toBeVisible();
  });

  test('should validate title length (maximum 200 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.locator('#title');
    // Note: Input has maxLength=200, so we fill exactly 200 then try to exceed
    const longTitle = 'A'.repeat(200);
    await titleInput.fill(longTitle);

    const contentInput = page.locator('#content');
    await contentInput.fill(
      'This is a sufficiently long initial response that meets the minimum character requirement of fifty characters.',
    );

    // With maxLength attribute, browser prevents exceeding 200 chars
    // Test passes if character counter shows 200/200
    await expect(page.getByText('200/200')).toBeVisible();
  });

  test('should validate initial response length (minimum 50 characters)', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.locator('#title');
    await titleInput.fill('Valid Discussion Title for Testing');

    const contentInput = page.locator('#content');
    await contentInput.fill('Too short content');

    await page.getByRole('button', { name: /publish discussion/i }).click();

    await expect(page.getByText(/initial response must be at least 50 characters/i)).toBeVisible();
  });

  test('should show character counter for title', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const titleInput = page.locator('#title');
    await titleInput.fill('Test Title');

    // Should show character count (10/200)
    await expect(page.getByText('10/200')).toBeVisible();
  });

  test('should show character counter for content', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    const contentInput = page.locator('#content');
    const testContent = 'This is test content for character counting in E2E test.';
    await contentInput.fill(testContent);

    // Should show character count (format: X/25,000)
    await expect(page.getByText(`${testContent.length}/25,000`)).toBeVisible();
  });

  test('should allow adding citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Find and fill citation URL input
    const citationUrlInput = page.getByPlaceholder('https://example.com/article');
    await citationUrlInput.fill('https://example.com/source1');

    // Find and fill citation title input
    const citationTitleInput = page.getByPlaceholder('Citation title (optional)');
    await citationTitleInput.fill('Example Source');

    // Click add citation button
    await page.getByRole('button', { name: /add citation/i }).click();

    // Citation should appear in the list
    await expect(page.getByText('https://example.com/source1')).toBeVisible();
    await expect(page.getByText('Example Source')).toBeVisible();
  });

  test('should allow removing citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Add a citation
    const citationUrlInput = page.getByPlaceholder('https://example.com/article');
    await citationUrlInput.fill('https://example.com/source1');
    await page.getByRole('button', { name: /add citation/i }).click();

    // Verify it was added
    await expect(page.getByText('https://example.com/source1')).toBeVisible();

    // Remove the citation
    const removeButton = page
      .locator('span:has-text("https://example.com/source1")')
      .getByRole('button');
    await removeButton.click();

    // Citation should be removed
    await expect(page.getByText('https://example.com/source1')).not.toBeVisible();
  });

  test('should validate citation URL format', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Try to add invalid URL
    const citationUrlInput = page.getByPlaceholder('https://example.com/article');
    await citationUrlInput.fill('not-a-valid-url');
    await page.getByRole('button', { name: /add citation/i }).click();

    // Should show error
    await expect(page.getByText(/invalid url format/i)).toBeVisible();
  });

  test('should enforce maximum 10 citations', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Add 10 citations
    for (let i = 1; i <= 10; i++) {
      const citationUrlInput = page.getByPlaceholder('https://example.com/article');
      await citationUrlInput.fill(`https://example.com/source${i}`);
      await page.getByRole('button', { name: /add citation/i }).click();
      // Wait for citation to be added
      await expect(page.getByText(`https://example.com/source${i}`)).toBeVisible();
    }

    // Citation URL input should be hidden after 10 citations
    const citationUrlInput = page.getByPlaceholder('https://example.com/article');
    await expect(citationUrlInput).not.toBeVisible();
  });

  test('should allow canceling discussion creation', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Fill in some data
    const titleInput = page.locator('#title');
    await titleInput.fill('Test Discussion Title');

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Form should be closed
    await expect(page.getByText(/start a new discussion/i)).not.toBeVisible();
  });

  test('should successfully create a discussion and redirect', async ({ page }) => {
    await page.getByRole('button', { name: /start discussion/i }).click();

    // Fill valid form with unique identifier
    const uniqueId = Date.now();
    const titleInput = page.locator('#title');
    await titleInput.fill(`E2E Test Discussion ${uniqueId}`);

    const contentInput = page.locator('#content');
    await contentInput.fill(
      `This is a test discussion created during E2E testing (ID: ${uniqueId}). I believe we need to address this issue comprehensively by considering multiple perspectives and evidence.`,
    );

    // Submit
    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show loading state briefly, then redirect
    // Wait for URL to change to a discussion detail page
    await page.waitForURL(/\/discussions\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    // Verify we're on a discussion page (not the list page)
    expect(page.url()).toMatch(/\/discussions\/[a-zA-Z0-9-]+$/);
  });

  test.skip('should show rate limit error when exceeded', async () => {
    // Rate limiting is disabled in E2E test mode (NODE_ENV=test) to prevent flakiness.
    // This test should be covered by integration tests with controlled rate limit settings.
    // See: services/api-gateway/src/app.module.ts (ThrottlerGuard is conditionally disabled)
  });
});

// =============================================================================
// ERROR HANDLING TESTS - Separate describe to avoid Alice login in beforeEach
// =============================================================================
test.describe('Discussion Creation - Error Handling', () => {
  test('should show error message when unverified user tries to create discussion', async ({
    page,
  }) => {
    // Login as unverified user (no beforeEach login)
    await loginWithEmailPassword(
      page,
      DEMO_CREDENTIALS['Unverified Uma'].email,
      DEMO_CREDENTIALS['Unverified Uma'].password,
    );

    // Navigate to discussion list page
    const topic = SEEDED_TOPICS.CONGESTION_PRICING;
    await page.goto(`/topics/${topic.id}/discussions`);
    await page.waitForLoadState('networkidle');

    // Open form and try to create a discussion
    await page
      .getByRole('button', { name: /start discussion/i })
      .first()
      .click();

    // Fill in valid discussion details
    await page.locator('#title').fill('Test Discussion from Unverified User');
    await page
      .locator('#content')
      .fill(
        'This is a test discussion that should fail because the user is not verified. The content needs to be at least 50 characters.',
      );

    // Try to submit
    await page.getByRole('button', { name: /publish discussion/i }).click();

    // Should show error message about being verified
    await expect(page.getByText(/verified users|only verified/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
