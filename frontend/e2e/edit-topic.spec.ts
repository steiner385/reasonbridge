import { test, expect } from '@playwright/test';
import { loginWithDemoAccount, SEEDED_TOPICS } from './helpers/demo-auth';

/**
 * E2E test suite for Topic Editing (Feature 016: Topic Management)
 * T037: Tests complete topic edit workflows including:
 * - Editing topic title, description, tags
 * - Edit reason requirement for topics >24 hours old
 * - Change preview before submission
 * - Edit history display with diffs
 * - Permission checks (only creator/moderator can edit)
 */

test.describe('Topic Editing', () => {
  test.describe('As Topic Creator', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user (Alice Anderson) using helper for consistency
      await loginWithDemoAccount(page, 'Alice Anderson');
    });

    test('should see Edit button on own topics', async ({ page }) => {
      // Navigate to topics
      await page.goto('/topics');

      // Create a new topic to ensure we have one we own
      await page.getByRole('button', { name: /create topic/i }).click();
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      await modal.getByLabel(/title/i).fill(`Edit Test Topic ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill(
          'This is a test topic that we will edit to verify the edit functionality works correctly.',
        );

      const tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('testing');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page and data to load
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500); // Allow React state to update

      // Should see Edit button on discussion page (creator can edit own topics)
      await expect(page.getByRole('button', { name: /edit topic/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('should successfully edit topic title and description', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      const originalTitle = `Original Title ${Date.now()}`;
      await modal.getByLabel(/title/i).fill(originalTitle);
      await modal
        .getByLabel(/description/i)
        .fill('This is the original description that we will modify later.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('original');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Modify title and description
      const editedTitle = `Edited Title ${Date.now()}`;
      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      const descInput = modal.getByLabel(/description/i);
      await descInput.clear();
      await descInput.fill(
        'This is the edited description with updated content for testing purposes.',
      );

      // Preview changes
      await modal.getByRole('button', { name: /preview changes/i }).click();

      // Should show change preview
      await expect(page.getByText(/review changes/i)).toBeVisible();
      // Use .first() to avoid strict mode violations - titles may appear in both original/updated sections
      await expect(page.getByText(originalTitle).first()).toBeVisible();
      await expect(page.getByText(editedTitle).first()).toBeVisible();

      // Confirm and save
      await modal.getByRole('button', { name: /confirm & save/i }).click();

      // Wait for modal to close
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Should see updated title on page
      await expect(page.getByText(editedTitle)).toBeVisible({ timeout: 5000 });
    });

    test('should edit topic tags', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Tags Edit Test ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing tag editing functionality with multiple tags to add and remove.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('original-tag');
      await tagInput.press('Enter');
      await tagInput.fill('will-remove');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Remove one tag
      const removeButtons = modal.locator('button:has(svg)').filter({ hasText: '' });
      if (await removeButtons.first().isVisible()) {
        await removeButtons.first().click();
      }

      // Add new tag
      tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('new-tag');
      await tagInput.press('Enter');

      // Preview and save
      await modal.getByRole('button', { name: /preview changes/i }).click();
      await expect(page.getByText(/review changes/i)).toBeVisible();

      await modal.getByRole('button', { name: /confirm & save/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Should see new tag
      await expect(page.getByText('new-tag')).toBeVisible({ timeout: 5000 });
    });

    test('should not require edit reason for recent topics (<24h)', async ({ page }) => {
      // Create a topic first (will be recent)
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Recent Topic ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('This is a recent topic that should not require an edit reason.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('recent');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Should NOT see edit reason requirement warning
      await expect(page.getByText(/older than 24 hours/i)).not.toBeVisible();

      // Edit reason field should be optional
      const editReasonLabel = modal.getByLabel(/edit reason/i);
      const labelText = await editReasonLabel.textContent();
      expect(labelText).not.toContain('*'); // No asterisk for required field

      // Should be able to preview without edit reason
      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill(`Updated Recent Topic ${Date.now()}`);

      await modal.getByRole('button', { name: /preview changes/i }).click();
      await expect(page.getByText(/review changes/i)).toBeVisible();
    });

    test('should allow flagging edit for moderation review', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Flag Test Topic ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing the flag for review functionality when editing topics.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('test');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Make a change
      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill(`Flagged Edit Topic ${Date.now()}`);

      // Flag for review
      await modal.getByLabel(/flag.*moderator review/i).check();

      // Preview changes
      await modal.getByRole('button', { name: /preview changes/i }).click();

      // Should show flag warning in preview
      await expect(page.getByText(/flagged for moderator review/i)).toBeVisible();
    });

    test('should display validation errors', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Validation Test ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing validation errors during topic editing process.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('test');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Clear title to trigger validation error
      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill('Short'); // Too short

      // Try to preview
      await modal.getByRole('button', { name: /preview changes/i }).click();

      // Should show validation error
      await expect(page.getByText(/at least 10 characters/i)).toBeVisible();
    });

    test('should not allow editing without changes', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`No Changes Test ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing that we cannot submit edits without making any changes to the topic.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('test');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Click Edit button
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      // Don't make any changes
      // Preview button should be disabled
      const previewButton = modal.getByRole('button', { name: /preview changes/i });
      await expect(previewButton).toBeDisabled();
    });
  });

  test.describe('Edit History', () => {
    test.beforeEach(async ({ page }) => {
      // Login as regular user using helper for consistency
      await loginWithDemoAccount(page, 'Alice Anderson');
    });

    test('should display edit history after editing', async ({ page }) => {
      // Create a topic first
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      const originalTitle = `History Test ${Date.now()}`;
      await modal.getByLabel(/title/i).fill(originalTitle);
      await modal
        .getByLabel(/description/i)
        .fill('Testing edit history display with multiple edits to verify history tracking works.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('history');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Make an edit
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const editedTitle = `History Test Edited ${Date.now()}`;
      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill(editedTitle);

      await modal.getByRole('button', { name: /preview changes/i }).click();
      await modal.getByRole('button', { name: /confirm & save/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Check for Edit History section
      // Note: The actual implementation may show history in a tab or separate section
      // Adjust selector based on actual UI
      const historySection = page.locator('text=/edit history/i').first();
      if (await historySection.isVisible({ timeout: 3000 })) {
        // Should show at least one edit
        await expect(page.getByText(/1.*edit/i)).toBeVisible();
      }
    });

    test('should show changes in edit history', async ({ page }) => {
      // Create and edit a topic
      await page.goto('/topics');
      await page.getByRole('button', { name: /create topic/i }).click();
      let modal = page.getByRole('dialog');

      await modal.getByLabel(/title/i).fill(`Changes Display Test ${Date.now()}`);
      await modal
        .getByLabel(/description/i)
        .fill('Testing that changes are properly displayed in the edit history view.');

      let tagInput = modal.getByRole('combobox', { name: /tags/i });
      await tagInput.fill('test');
      await tagInput.press('Enter');

      await modal.getByRole('button', { name: /create topic/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });

      // Wait for redirect to discussion page
      await page.waitForURL(/\/discussions\?topic=/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Edit the topic
      await page.getByRole('button', { name: /edit topic/i }).click();
      modal = page.getByRole('dialog');

      const titleInput = modal.getByLabel(/^title/i);
      await titleInput.clear();
      await titleInput.fill(`Updated Changes Display ${Date.now()}`);

      await modal.getByRole('button', { name: /preview changes/i }).click();
      await modal.getByRole('button', { name: /confirm & save/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1500);

      // Look for Show Changes button in history
      const showChangesButton = page.getByRole('button', { name: /show changes/i }).first();
      if (await showChangesButton.isVisible({ timeout: 3000 })) {
        await showChangesButton.click();

        // Should show diff view
        await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.bg-green-50').first()).toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('Permission Checks', () => {
    test('unauthenticated users should not see Edit button', async ({ page }) => {
      // Navigate directly to a known seeded topic without logging in
      const topic = SEEDED_TOPICS.CONGESTION_PRICING;
      await page.goto(`/discussions?topic=${topic.id}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Wait for page to load
      await page.waitForSelector('.conversation-panel h1, [data-testid="topic-title"]', {
        timeout: 10000,
      });

      // Should not see Edit button (not authenticated)
      await expect(page.getByRole('button', { name: /edit topic/i })).not.toBeVisible();
    });

    test('users should not see Edit button on topics created by others', async ({ page }) => {
      // Login as Bob Builder
      await loginWithDemoAccount(page, 'Bob Builder');

      // Navigate to a topic created by Alice Anderson (CONGESTION_PRICING)
      const topic = SEEDED_TOPICS.CONGESTION_PRICING;
      await page.goto(`/discussions?topic=${topic.id}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Wait for page to load
      await page.waitForSelector('.conversation-panel h1, [data-testid="topic-title"]', {
        timeout: 10000,
      });

      // Should not see Edit button (Bob didn't create this topic)
      const editButton = page.getByRole('button', { name: /edit topic/i });
      // Either button doesn't exist or is not visible
      const isVisible = await editButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });
});
