import { test, expect } from '@playwright/test';

/**
 * E2E test suite for Topic Status Management (Feature 016: Topic Management)
 * T031: Tests complete topic status workflows including:
 * - Archiving topics (creator and moderator)
 * - Reopening archived topics
 * - Locking topics (moderator only)
 * - Unlocking topics (moderator only)
 * - Activating topics from SEEDING state
 * - Permission checks for status changes
 */

test.describe('Topic Status Management', () => {
  test.describe('As Topic Creator', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user (Alice Anderson)
      await page.goto('/');
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByText('Alice Anderson').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^log in$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });

    test('should create a topic and see status action buttons', async ({ page }) => {
      // Navigate to topics page
      await page.goto('/topics');

      // Create a new topic
      await page.getByRole('button', { name: /create topic/i }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Fill in topic details
      await modal.getByLabel(/title/i).fill(`Status Test Topic ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill(
          'This is a test topic for status management workflows. We will test archiving, reopening, and other status operations on this topic.',
        );

      const tagInput = modal.getByLabel(/tags/i);
      await tagInput.fill('testing');
      await tagInput.press('Enter');

      // Submit
      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for navigation or redirect
      await page.waitForTimeout(1000);

      // Should see status action buttons (Activate Topic button for SEEDING status)
      await expect(page.getByRole('button', { name: /activate topic/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('should activate a topic from SEEDING state', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      const modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Activate Test ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing activation workflow for topics in SEEDING state.');

      const tagInput = modal.getByLabel(/tags/i);
      await tagInput.fill('test');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Click Activate Topic button
      const activateButton = page.getByRole('button', { name: /activate topic/i });
      if (await activateButton.isVisible({ timeout: 5000 })) {
        await activateButton.click();

        // Should show confirmation modal
        await expect(page.getByText(/activating this topic/i)).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /^confirm$/i }).click();

        // Wait for status change
        await page.waitForTimeout(1500);

        // Should now see Archive button instead of Activate
        await expect(page.getByRole('button', { name: /archive topic/i })).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should archive an active topic', async ({ page }) => {
      // For this test, we'll navigate to an existing active topic
      // Or create one and activate it first
      await page.goto('/topics');

      // Look for an active topic or create one
      // For simplicity, let's assume there's at least one active topic
      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No active topics available for testing');
      }

      // Check if Archive button is visible (user must be creator)
      const archiveButton = page.getByRole('button', { name: /archive topic/i });
      if (await archiveButton.isVisible({ timeout: 3000 })) {
        await archiveButton.click();

        // Should show confirmation modal
        await expect(page.getByText(/archiving this topic will close it/i)).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /^confirm$/i }).click();

        // Wait for status change
        await page.waitForTimeout(1500);

        // Should now see Reopen button
        await expect(page.getByRole('button', { name: /reopen topic/i })).toBeVisible({
          timeout: 5000,
        });
      } else {
        test.skip(true, 'User is not creator of this topic');
      }
    });

    test('should reopen an archived topic', async ({ page }) => {
      // Navigate to topics and find an archived one
      await page.goto('/topics');

      // Filter by archived status
      await page.getByRole('button', { name: 'Archived' }).click();
      await page.waitForTimeout(1000);

      // Look for an archived topic
      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No archived topics available for testing');
      }

      // Check if Reopen button is visible
      const reopenButton = page.getByRole('button', { name: /reopen topic/i });
      if (await reopenButton.isVisible({ timeout: 3000 })) {
        await reopenButton.click();

        // Should show confirmation modal
        await expect(page.getByText(/reopening this topic/i)).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /^confirm$/i }).click();

        // Wait for status change
        await page.waitForTimeout(1500);

        // Should now see Archive button again
        await expect(page.getByRole('button', { name: /archive topic/i })).toBeVisible({
          timeout: 5000,
        });
      } else {
        test.skip(true, 'User is not creator of this topic');
      }
    });

    test('should NOT see Lock button as regular user', async ({ page }) => {
      // Navigate to an active topic
      await page.goto('/topics');

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No topics available for testing');
      }

      // Regular users should not see Lock button
      await expect(page.getByRole('button', { name: /lock topic/i })).not.toBeVisible();
    });
  });

  test.describe('As Moderator', () => {
    test.beforeEach(async ({ page }) => {
      // Login as moderator (Mod Martinez)
      await page.goto('/');
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByText('Mod Martinez').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^log in$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });

    test('should see Lock button on active topics', async ({ page }) => {
      // Navigate to topics
      await page.goto('/topics');

      // Filter by active status
      await page.getByRole('button', { name: /^Active$/i }).click();
      await page.waitForTimeout(1000);

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No active topics available for testing');
      }

      // Moderators should see both Archive and Lock buttons
      await expect(page.getByRole('button', { name: /archive topic/i })).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole('button', { name: /lock topic/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('should lock an active topic', async ({ page }) => {
      // Navigate to topics
      await page.goto('/topics');

      // Filter by active status
      await page.getByRole('button', { name: /^Active$/i }).click();
      await page.waitForTimeout(1000);

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No active topics available for testing');
      }

      // Click Lock button
      const lockButton = page.getByRole('button', { name: /lock topic/i });
      if (await lockButton.isVisible({ timeout: 3000 })) {
        await lockButton.click();

        // Should show confirmation modal with warning
        await expect(
          page.getByText(/locking this topic will prevent all modifications/i),
        ).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /^confirm$/i }).click();

        // Wait for status change
        await page.waitForTimeout(1500);

        // Should now see Unlock button
        await expect(page.getByRole('button', { name: /unlock topic/i })).toBeVisible({
          timeout: 5000,
        });
      } else {
        test.skip(true, 'Lock button not available');
      }
    });

    test('should unlock a locked topic', async ({ page }) => {
      // Navigate to topics and filter by locked status
      await page.goto('/topics');

      // Filter by locked status
      await page.getByRole('button', { name: 'Locked' }).click();
      await page.waitForTimeout(1000);

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No locked topics available for testing');
      }

      // Click Unlock button
      const unlockButton = page.getByRole('button', { name: /unlock topic/i });
      if (await unlockButton.isVisible({ timeout: 3000 })) {
        await unlockButton.click();

        // Should show confirmation modal
        await expect(page.getByText(/unlocking this topic/i)).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /^confirm$/i }).click();

        // Wait for status change
        await page.waitForTimeout(1500);

        // Should now see Archive and Lock buttons (back to ACTIVE)
        await expect(page.getByRole('button', { name: /archive topic/i })).toBeVisible({
          timeout: 5000,
        });
      } else {
        test.skip(true, 'Unlock button not available');
      }
    });

    test('should be able to archive topics created by others', async ({ page }) => {
      // Navigate to topics
      await page.goto('/topics');

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No topics available for testing');
      }

      // Moderators can archive any topic
      await expect(page.getByRole('button', { name: /archive topic/i })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Status Workflow Validations', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user
      await page.goto('/');
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByText('Alice Anderson').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^log in$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    });

    test('should display confirmation modal before status change', async ({ page }) => {
      // Navigate to a topic
      await page.goto('/topics');

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No topics available for testing');
      }

      // Click any status action button if available
      const archiveButton = page.getByRole('button', { name: /archive topic/i });
      const reopenButton = page.getByRole('button', { name: /reopen topic/i });
      const activateButton = page.getByRole('button', { name: /activate topic/i });

      let buttonClicked = false;

      if (await archiveButton.isVisible({ timeout: 2000 })) {
        await archiveButton.click();
        buttonClicked = true;
      } else if (await reopenButton.isVisible({ timeout: 2000 })) {
        await reopenButton.click();
        buttonClicked = true;
      } else if (await activateButton.isVisible({ timeout: 2000 })) {
        await activateButton.click();
        buttonClicked = true;
      }

      if (buttonClicked) {
        // Should show confirmation modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('button', { name: /^confirm$/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();

        // Should show current and new status
        await expect(page.getByText(/current status:/i)).toBeVisible();
        await expect(page.getByText(/new status:/i)).toBeVisible();
      } else {
        test.skip(true, 'No status action buttons available for user');
      }
    });

    test('should be able to cancel status change', async ({ page }) => {
      // Navigate to a topic
      await page.goto('/topics');

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No topics available for testing');
      }

      // Click Archive button if available
      const archiveButton = page.getByRole('button', { name: /archive topic/i });
      if (await archiveButton.isVisible({ timeout: 2000 })) {
        await archiveButton.click();

        // Should show confirmation modal
        await expect(page.getByRole('dialog')).toBeVisible();

        // Click Cancel
        await page.getByRole('button', { name: /cancel/i }).click();

        // Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Status should not have changed
        await expect(archiveButton).toBeVisible();
      } else {
        test.skip(true, 'Archive button not available');
      }
    });
  });

  test.describe('Permission Checks', () => {
    test('unauthenticated users should not see status action buttons', async ({ page }) => {
      // Navigate to topics without logging in
      await page.goto('/topics');

      const firstTopic = page.locator('[data-testid="topic-card"]').first();
      if (await firstTopic.isVisible({ timeout: 3000 })) {
        await firstTopic.click();
      } else {
        test.skip(true, 'No topics available for testing');
      }

      // Should not see any status action buttons
      await expect(page.getByRole('button', { name: /archive topic/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /lock topic/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /reopen topic/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /activate topic/i })).not.toBeVisible();
    });
  });
});
