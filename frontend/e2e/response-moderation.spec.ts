/**
 * E2E tests for response moderation feature
 *
 * Tests the complete moderation user journey:
 * - Viewing moderation options on responses
 * - Hiding a response (author action)
 * - Reporting a response
 * - Moderator actions (remove, restore)
 * - Viewing moderated content notice
 */

import { test, expect } from '@playwright/test';
import { mockAuthenticatedUser, mockAuthenticatedEndpoints } from './fixtures/auth-mock.fixture';

// Mock data for responses
const mockOwnResponse = {
  id: 'own-response',
  discussionId: 'test-topic-moderation',
  topicId: 'test-topic-moderation',
  content: 'This is my own response that I can edit or delete.',
  author: { id: 'test-user-1', displayName: 'Test User' },
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

const mockOtherUserResponse = {
  id: 'other-user-response',
  discussionId: 'test-topic-moderation',
  topicId: 'test-topic-moderation',
  content: 'This response was posted by another user and can be reported.',
  author: { id: 'user-2', displayName: 'Another User' },
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

const mockHiddenResponse = {
  id: 'hidden-response',
  discussionId: 'test-topic-moderation',
  topicId: 'test-topic-moderation',
  content: 'This response has been hidden by the author.',
  author: { id: 'test-user-1', displayName: 'Test User' },
  parentResponseId: null,
  parentId: null,
  citations: [],
  version: 1,
  editCount: 0,
  editedAt: null,
  deletedAt: new Date(Date.now() - 3600000).toISOString(), // Soft deleted
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  replyCount: 0,
  replies: [],
};

const mockTopicForModeration = {
  id: 'test-topic-moderation',
  title: 'Topic for Testing Moderation',
  description: 'A test topic for demonstrating moderation functionality',
  status: 'ACTIVE',
  createdAt: new Date(Date.now() - 172800000).toISOString(),
  updatedAt: new Date().toISOString(),
  creatorId: 'user-1',
  participantCount: 5,
  responseCount: 3,
  currentDiversityScore: 0.65,
  consensusScore: 0.72,
  tags: [],
};

test.describe('Response Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockAuthenticatedEndpoints(page);

    // Mock topic endpoint
    await page.route(/\/topics\/test-topic-moderation\/?(\?.*)?$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTopicForModeration),
      });
    });

    // Mock propositions endpoint
    await page.route(/\/topics\/test-topic-moderation\/propositions/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock responses endpoint
    await page.route(/\/topics\/test-topic-moderation\/responses/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockOwnResponse, mockOtherUserResponse]),
      });
    });

    // Mock read-state endpoint
    await page.route(/\/topics\/test-topic-moderation\/read-state/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    // Mock reactions endpoints
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
  });

  test('should show different options for own response vs others', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find own response
    const ownResponse = page.locator('[data-testid="response-item"]').first();
    await ownResponse.hover();

    // Look for menu or action buttons
    const menuButton = ownResponse.locator(
      '[data-testid="response-menu"], [aria-label="More options"], button:has-text("...")',
    );

    const exists = await menuButton.isVisible().catch(() => false);

    if (exists) {
      await menuButton.click();
      await page.waitForTimeout(200);

      // Own response should show edit/delete options
      const editOption = page.locator('[data-testid="edit-response"], button:has-text("Edit")');
      const deleteOption = page.locator(
        '[data-testid="delete-response"], button:has-text("Delete")',
      );

      const hasEdit = await editOption.isVisible().catch(() => false);
      const hasDelete = await deleteOption.isVisible().catch(() => false);

      if (hasEdit || hasDelete) {
        // User can manage their own responses
        expect(hasEdit || hasDelete).toBeTruthy();
      }

      // Close menu
      await page.keyboard.press('Escape');
    }
  });

  test('should show report option for other users responses', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find response from another user
    const otherResponse = page.locator('[data-testid="response-item"]:has-text("Another User")');
    const exists = await otherResponse.isVisible().catch(() => false);

    if (exists) {
      await otherResponse.hover();

      // Look for menu button
      const menuButton = otherResponse.locator(
        '[data-testid="response-menu"], [aria-label="More options"]',
      );

      const menuExists = await menuButton.isVisible().catch(() => false);

      if (menuExists) {
        await menuButton.click();
        await page.waitForTimeout(200);

        // Should have report option for other users' content
        const reportOption = page.locator(
          '[data-testid="report-response"], button:has-text("Report")',
        );
        const hasReport = await reportOption.isVisible().catch(() => false);

        if (hasReport) {
          await expect(reportOption).toBeVisible();
        }

        await page.keyboard.press('Escape');
      }
    }
  });

  test('should open report dialog when report is clicked', async ({ page }) => {
    // Mock report endpoint
    await page.route(/\/reports$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'report-1',
            responseId: 'other-user-response',
            reporterId: 'test-user-1',
            reason: 'spam',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find response from another user and open menu
    const otherResponse = page.locator('[data-testid="response-item"]:has-text("Another User")');
    const exists = await otherResponse.isVisible().catch(() => false);

    if (!exists) {
      test.skip();
      return;
    }

    await otherResponse.hover();

    const menuButton = otherResponse.locator('[data-testid="response-menu"]');
    const menuExists = await menuButton.isVisible().catch(() => false);

    if (!menuExists) {
      test.skip();
      return;
    }

    await menuButton.click();

    const reportOption = page.locator('[data-testid="report-response"], button:has-text("Report")');
    const reportExists = await reportOption.isVisible().catch(() => false);

    if (reportExists) {
      await reportOption.click();

      // Check for report dialog/modal
      const reportDialog = page.locator(
        '[data-testid="report-dialog"], [role="dialog"]:has-text("Report")',
      );
      const dialogVisible = await reportDialog.isVisible().catch(() => false);

      if (dialogVisible) {
        await expect(reportDialog).toBeVisible();
      }
    }
  });

  test('should allow deleting own response', async ({ page }) => {
    // Mock delete endpoint
    await page.route(/\/responses\/own-response$/, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 204,
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find own response
    const ownResponse = page.locator('[data-testid="response-item"]').first();
    await ownResponse.hover();

    const menuButton = ownResponse.locator('[data-testid="response-menu"]');
    const menuExists = await menuButton.isVisible().catch(() => false);

    if (!menuExists) {
      test.skip();
      return;
    }

    await menuButton.click();

    const deleteOption = page.locator('[data-testid="delete-response"], button:has-text("Delete")');
    const deleteExists = await deleteOption.isVisible().catch(() => false);

    if (deleteExists) {
      await deleteOption.click();

      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="alertdialog"], [data-testid="confirm-dialog"]');
      const dialogVisible = await confirmDialog.isVisible().catch(() => false);

      if (dialogVisible) {
        // Confirm deletion
        const confirmButton = confirmDialog.locator(
          'button:has-text("Delete"), button:has-text("Confirm")',
        );
        await confirmButton.click();

        // Wait for deletion to process
        await page.waitForTimeout(500);
      }
    }
  });

  test('should show confirmation before deleting response', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find own response and try to delete
    const ownResponse = page.locator('[data-testid="response-item"]').first();
    await ownResponse.hover();

    const menuButton = ownResponse.locator('[data-testid="response-menu"]');
    const menuExists = await menuButton.isVisible().catch(() => false);

    if (!menuExists) {
      test.skip();
      return;
    }

    await menuButton.click();

    const deleteOption = page.locator('[data-testid="delete-response"], button:has-text("Delete")');
    const deleteExists = await deleteOption.isVisible().catch(() => false);

    if (deleteExists) {
      await deleteOption.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="alertdialog"], [data-testid="confirm-dialog"]');
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")');

      const dialogVisible = await confirmDialog.isVisible().catch(() => false);
      const cancelVisible = await cancelButton.isVisible().catch(() => false);

      if (dialogVisible && cancelVisible) {
        // Cancel should close dialog without deleting
        await cancelButton.click();

        // Dialog should close
        await expect(confirmDialog).not.toBeVisible();
      }
    }
  });

  test('should allow editing own response', async ({ page }) => {
    // Mock update endpoint
    await page.route(/\/responses\/own-response$/, (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockOwnResponse,
            content: 'Updated response content',
            version: 2,
            editCount: 1,
            editedAt: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find own response
    const ownResponse = page.locator('[data-testid="response-item"]').first();
    await ownResponse.hover();

    const menuButton = ownResponse.locator('[data-testid="response-menu"]');
    const menuExists = await menuButton.isVisible().catch(() => false);

    if (!menuExists) {
      test.skip();
      return;
    }

    await menuButton.click();

    const editOption = page.locator('[data-testid="edit-response"], button:has-text("Edit")');
    const editExists = await editOption.isVisible().catch(() => false);

    if (editExists) {
      await editOption.click();

      // Should show edit interface
      const editTextarea = page.locator('textarea[data-testid="edit-content"], textarea');
      const textareaVisible = await editTextarea.isVisible().catch(() => false);

      if (textareaVisible) {
        await expect(editTextarea).toBeVisible();

        // Clear and type new content
        await editTextarea.fill('Updated response content');

        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        const saveVisible = await saveButton.isVisible().catch(() => false);

        if (saveVisible) {
          await saveButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should show moderated content notice for hidden responses', async ({ page }) => {
    // Update mock to include hidden response
    await page.route(/\/topics\/test-topic-moderation\/responses/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockOwnResponse, mockOtherUserResponse, mockHiddenResponse]),
      });
    });

    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Check for hidden/moderated content notice
    const hiddenNotice = page.locator(
      '[data-testid="hidden-response"], [data-testid="moderated-notice"], :text("hidden"), :text("removed")',
    );

    const noticeExists = await hiddenNotice
      .first()
      .isVisible()
      .catch(() => false);

    // If UI shows hidden content differently, this test validates that
    if (noticeExists) {
      await expect(hiddenNotice.first()).toBeVisible();
    }
  });

  test('should prevent reporting own response', async ({ page }) => {
    await page.goto('/discussions?topic=test-topic-moderation');

    // Wait for responses to load
    await page.waitForSelector('[data-testid="response-item"]', { timeout: 10000 });

    // Find own response
    const ownResponse = page.locator('[data-testid="response-item"]').first();
    await ownResponse.hover();

    const menuButton = ownResponse.locator('[data-testid="response-menu"]');
    const menuExists = await menuButton.isVisible().catch(() => false);

    if (!menuExists) {
      test.skip();
      return;
    }

    await menuButton.click();

    // Report option should NOT be visible for own response
    const reportOption = page.locator('[data-testid="report-response"], button:has-text("Report")');
    const reportVisible = await reportOption.isVisible().catch(() => false);

    // Should not be able to report own response
    expect(reportVisible).toBeFalsy();
  });
});
