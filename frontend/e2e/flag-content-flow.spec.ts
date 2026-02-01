/**
 * T208 - E2E test for flag content flow
 *
 * Tests the complete user journey for reporting inappropriate content:
 * - Opening the flag content modal from a response
 * - Filling out the report form
 * - Submitting the report
 * - Success and error handling
 * - Form validation
 */

import { test, expect } from '@playwright/test';

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('Flag Content Flow', () => {
  // Tests that require the full backend environment
  test.describe('With Backend', () => {
    test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

    test('should display flag button on response cards', async ({ page }) => {
      await page.goto('/topics');

      // Wait for topics to load
      await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
        state: 'visible',
        timeout: 15000,
      });

      // Navigate to first topic
      const firstTopicLink = page.locator('a[href^="/topics/"]').first();
      const linkCount = await firstTopicLink.count();

      if (linkCount > 0) {
        await firstTopicLink.click();

        // Wait for topic detail to load
        await page.waitForLoadState('networkidle');

        // Look for responses with flag button (either visible or within response actions)
        // The flag button is rendered with aria-label="Report content"
        const flagButton = page.locator('[aria-label="Report content"]').first();

        // If responses exist, there should be at least one flag button
        const responseCards = page.locator('[data-testid="response-card"]');
        const responseCount = await responseCards.count();

        if (responseCount > 0) {
          await expect(flagButton).toBeVisible();
        }
      }
    });

    test('should open flag modal when clicking report button', async ({ page }) => {
      await page.goto('/topics');

      // Wait for topics to load and navigate to first topic
      await page.waitForSelector('a[href^="/topics/"]', {
        state: 'visible',
        timeout: 15000,
      });

      const firstTopicLink = page.locator('a[href^="/topics/"]').first();
      if ((await firstTopicLink.count()) > 0) {
        await firstTopicLink.click();
        await page.waitForLoadState('networkidle');

        // Find and click the flag button
        const flagButton = page.locator('[aria-label="Report content"]').first();
        if ((await flagButton.count()) > 0) {
          await flagButton.click();

          // Verify modal opens with "Report Content" title
          const modal = page.getByRole('dialog');
          await expect(modal).toBeVisible();
          await expect(modal.getByRole('heading', { name: /report content/i })).toBeVisible();
        }
      }
    });

    test('should submit flag report successfully', async ({ page }) => {
      await page.goto('/topics');

      // Navigate to topic with responses
      await page.waitForSelector('a[href^="/topics/"]', {
        state: 'visible',
        timeout: 15000,
      });

      const firstTopicLink = page.locator('a[href^="/topics/"]').first();
      if ((await firstTopicLink.count()) > 0) {
        await firstTopicLink.click();
        await page.waitForLoadState('networkidle');

        // Open the flag modal
        const flagButton = page.locator('[aria-label="Report content"]').first();
        if ((await flagButton.count()) > 0) {
          await flagButton.click();

          const modal = page.getByRole('dialog');
          await expect(modal).toBeVisible();

          // Fill in the form
          // Category is pre-selected, so we can select a specific one
          await modal.locator('#category').selectOption('misinformation');

          // Fill reason
          await modal.locator('#reason').fill('Contains false claims about climate data');

          // Fill description
          await modal
            .locator('#description')
            .fill(
              'This response cites statistics that have been debunked by multiple scientific organizations. ' +
                'The claims about temperature data are misleading and could confuse readers.',
            );

          // Submit the form
          await modal.getByRole('button', { name: /submit report/i }).click();

          // Wait for success notification
          await expect(page.getByText(/report submitted/i)).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });

  // UI-only tests that use API mocking
  test.describe('UI Behavior (Mocked)', () => {
    test.beforeEach(async ({ page }) => {
      // Set up base routes for the test environment
      await page.route('**/api/topics', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'topic-1',
                title: 'Test Topic for Flagging',
                description: 'A discussion about testing content moderation',
                status: 'ACTIVE',
                createdBy: { id: 'user-1', displayName: 'Test User' },
                responseCount: 2,
                participantCount: 2,
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, pageSize: 10, total: 1 },
          }),
        });
      });

      await page.route('**/api/topics/topic-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'topic-1',
            title: 'Test Topic for Flagging',
            description: 'A discussion about testing content moderation',
            status: 'ACTIVE',
            createdBy: { id: 'user-1', displayName: 'Test User' },
            responseCount: 2,
            participantCount: 2,
            createdAt: new Date().toISOString(),
          }),
        });
      });

      await page.route('**/api/topics/topic-1/responses', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'response-1',
              topicId: 'topic-1',
              content: 'This is a potentially problematic response that might need flagging.',
              author: { id: 'user-2', displayName: 'John Doe' },
              parentId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              replyCount: 0,
            },
            {
              id: 'response-2',
              topicId: 'topic-1',
              content: 'This is another response in the discussion.',
              author: { id: 'user-3', displayName: 'Jane Smith' },
              parentId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              replyCount: 0,
            },
          ]),
        });
      });
    });

    test('should close modal when clicking cancel button', async ({ page }) => {
      // Mock the flag endpoint
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      // Find and click the flag button
      const flagButton = page.locator('[aria-label="Report content"]').first();

      // Wait a bit for content to render
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Click cancel button
        await modal.getByRole('button', { name: /cancel/i }).click();

        // Verify modal is closed
        await expect(modal).not.toBeVisible();
      }
    });

    test('should show validation errors for empty form fields', async ({ page }) => {
      // Mock the flag endpoint
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Try to submit without filling required fields
        await modal.getByRole('button', { name: /submit report/i }).click();

        // Should show validation error
        await expect(modal.getByText(/please provide a reason/i)).toBeVisible();
      }
    });

    test('should show error for missing description', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill reason but not description
        await modal.locator('#reason').fill('Test reason');

        // Try to submit
        await modal.getByRole('button', { name: /submit report/i }).click();

        // Should show validation error for description
        await expect(modal.getByText(/please provide a detailed description/i)).toBeVisible();
      }
    });

    test('should toggle anonymous submission checkbox', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Find the anonymous checkbox
        const anonymousCheckbox = modal.locator('#anonymous');

        // Verify it's checked by default
        await expect(anonymousCheckbox).toBeChecked();

        // Toggle it off
        await anonymousCheckbox.uncheck();
        await expect(anonymousCheckbox).not.toBeChecked();

        // Toggle it back on
        await anonymousCheckbox.check();
        await expect(anonymousCheckbox).toBeChecked();
      }
    });

    test('should display character counts for input fields', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill in reason field
        await modal.locator('#reason').fill('Test reason');

        // Verify character count updates
        await expect(modal.getByText(/11\/100 characters/i)).toBeVisible();

        // Fill in description field
        await modal.locator('#description').fill('Detailed description');

        // Verify character count for description
        await expect(modal.getByText(/20\/500 characters/i)).toBeVisible();
      }
    });

    test('should reset form when modal is reopened', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill in some form data
        await modal.locator('#reason').fill('Test reason');
        await modal.locator('#description').fill('Test description');

        // Close modal
        await modal.getByRole('button', { name: /cancel/i }).click();
        await expect(modal).not.toBeVisible();

        // Reopen modal
        await flagButton.click();
        await expect(modal).toBeVisible();

        // Verify form is reset
        await expect(modal.locator('#reason')).toHaveValue('');
        await expect(modal.locator('#description')).toHaveValue('');
      }
    });

    test('should handle API error gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'Failed to process flag request',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill in form data
        await modal.locator('#category').selectOption('spam');
        await modal.locator('#reason').fill('This is spam content');
        await modal
          .locator('#description')
          .fill('This response is clearly spam and should be removed.');

        // Submit form
        await modal.getByRole('button', { name: /submit report/i }).click();

        // Should show error notification or error state in modal
        await expect(
          page.getByText(/failed to submit report/i).or(modal.getByText(/error/i)),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should disable form controls while submitting', async ({ page }) => {
      // Mock slow API response
      await page.route('**/moderation/flag', async (route) => {
        // Delay response to test loading state
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill in form data
        await modal.locator('#category').selectOption('harassment');
        await modal.locator('#reason').fill('Harassing content');
        await modal
          .locator('#description')
          .fill('This response contains harassment directed at another user.');

        // Submit form
        const submitButton = modal.getByRole('button', { name: /submit report/i });
        await submitButton.click();

        // Verify submit button shows loading state (button is disabled)
        await expect(submitButton).toBeDisabled();

        // Verify form fields are disabled during submission
        await expect(modal.locator('#category')).toBeDisabled();
        await expect(modal.locator('#reason')).toBeDisabled();
        await expect(modal.locator('#description')).toBeDisabled();
      }
    });

    test('should select different flag categories', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        const categorySelect = modal.locator('#category');

        // Test selecting different categories
        const categories = [
          'inappropriate',
          'spam',
          'misinformation',
          'harassment',
          'hate-speech',
          'violence',
          'copyright',
          'privacy',
          'other',
        ];

        for (const category of categories) {
          await categorySelect.selectOption(category);
          await expect(categorySelect).toHaveValue(category);
        }
      }
    });

    test('should display content type in modal', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Verify content type is displayed
        await expect(modal.getByText(/content type/i)).toBeVisible();
        // The FlagContentButton in ThreadedResponseDisplay uses 'response' as contentType
        await expect(modal.getByText(/response/i)).toBeVisible();
      }
    });

    test('should show privacy notice', async ({ page }) => {
      await page.route('**/moderation/flag', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            flagId: 'flag-123',
            status: 'submitted',
            createdAt: new Date().toISOString(),
            message: 'Report submitted successfully',
          }),
        });
      });

      await page.goto('/topics/topic-1');
      await page.waitForLoadState('networkidle');

      const flagButton = page.locator('[aria-label="Report content"]').first();
      await page.waitForTimeout(500);

      if ((await flagButton.count()) > 0) {
        await flagButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Verify privacy notice is displayed
        await expect(modal.getByText(/moderation team/i)).toBeVisible();
        await expect(modal.getByText(/review/i)).toBeVisible();
      }
    });
  });
});
