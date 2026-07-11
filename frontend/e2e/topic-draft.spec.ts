import { test, expect } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/demo-auth';

/**
 * E2E test suite for Topic Draft Auto-Save and Recovery (Feature 016: Topic Management)
 * T240: Tests draft saving and recovery functionality including:
 * - Auto-save to localStorage during form input
 * - Draft restoration prompt on modal reopen (after unexpected closure)
 * - "Restore Draft" button restores saved content
 * - "Start Fresh" button clears draft
 * - Draft clears after successful topic creation or explicit cancel
 */

const DRAFT_STORAGE_KEY = 'create-topic-draft';

// Helper to create a valid draft object
const createDraftData = (overrides = {}) => ({
  title: 'Saved Draft Title for Testing',
  description: 'This is a saved draft description with enough content to be valid.',
  tags: ['test-tag'],
  visibility: 'PUBLIC',
  evidenceStandards: 'STANDARD',
  isMatureContent: false,
  savedAt: new Date().toISOString(),
  ...overrides,
});

test.describe('Topic Draft Saving and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Login using shared helper (handles auth state properly)
    await loginWithDemoAccount(page, 'Admin Adams');

    // Clear any existing draft
    await page.evaluate((key) => localStorage.removeItem(key), DRAFT_STORAGE_KEY);

    // Navigate to topics page if not already there
    if (!page.url().includes('/topics')) {
      await page.goto('/topics');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(300);
    }
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Clean up drafts after each test
    await page.evaluate((key) => localStorage.removeItem(key), DRAFT_STORAGE_KEY);
  });

  test('should auto-save draft to localStorage when typing', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Type a title that meets minimum length (10+ chars)
    const titleInput = modal.getByLabel(/title/i);
    await titleInput.fill('Test Draft Title For Auto-Save');

    // Wait for debounce (800ms default) + processing time
    await page.waitForTimeout(1200);

    // Verify draft is saved to localStorage
    const draftData = await page.evaluate((key) => {
      const draft = localStorage.getItem(key);
      return draft ? JSON.parse(draft) : null;
    }, DRAFT_STORAGE_KEY);

    expect(draftData).not.toBeNull();
    expect(draftData.title).toBe('Test Draft Title For Auto-Save');
  });

  test('should show draft restoration prompt when modal opens with existing draft', async ({
    page,
  }) => {
    // Manually set a draft in localStorage before opening modal
    // This simulates the case where draft was saved before unexpected closure
    await page.evaluate(
      ({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      },
      { key: DRAFT_STORAGE_KEY, data: createDraftData() },
    );

    // Reload page so useTopicDraft hook initializes with saved draft
    // (The hook checks localStorage on page load, not modal open)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();

    // Open the modal
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Should show draft restoration prompt
    await expect(modal.getByText(/unsaved draft found/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: /restore draft/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /start fresh/i })).toBeVisible();
  });

  test('should restore draft content when clicking Restore Draft button', async ({ page }) => {
    const testTitle = 'Unique Restoration Test Title';
    const testDescription =
      'This is the description that should be restored after clicking restore button.';

    // Set a draft with specific content
    await page.evaluate(
      ({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      },
      {
        key: DRAFT_STORAGE_KEY,
        data: createDraftData({
          title: testTitle,
          description: testDescription,
        }),
      },
    );

    // Reload page so useTopicDraft hook initializes with saved draft
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();

    // Open the modal
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Click Restore Draft
    await modal.getByRole('button', { name: /restore draft/i }).click();

    // Verify content is restored
    await expect(modal.getByLabel(/title/i)).toHaveValue(testTitle);
    await expect(modal.getByLabel(/description/i)).toHaveValue(testDescription);

    // Draft prompt should no longer be visible
    await expect(modal.getByText(/unsaved draft found/i)).not.toBeVisible();
  });

  test('should clear draft when clicking Start Fresh button', async ({ page }) => {
    // Set a draft first
    await page.evaluate(
      ({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      },
      {
        key: DRAFT_STORAGE_KEY,
        data: createDraftData({ title: 'Draft To Be Cleared Title' }),
      },
    );

    // Reload page so useTopicDraft hook initializes with saved draft
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();

    // Open the modal
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Click Start Fresh
    await modal.getByRole('button', { name: /start fresh/i }).click();

    // Form should be empty
    await expect(modal.getByLabel(/title/i)).toHaveValue('');

    // Draft prompt should no longer be visible
    await expect(modal.getByText(/unsaved draft found/i)).not.toBeVisible();

    // localStorage should have draft cleared
    const draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).toBeNull();
  });

  test('should clear draft when clicking Cancel button', async ({ page }) => {
    // First, create a draft by typing and waiting for auto-save
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Type content to trigger auto-save
    const titleInput = modal.getByLabel(/title/i);
    await titleInput.fill('Draft To Be Cleared By Cancel');

    // Wait for auto-save
    await page.waitForTimeout(1200);

    // Verify draft exists
    let draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).not.toBeNull();

    // Click Cancel - this should clear the draft
    await modal.getByRole('button', { name: /cancel/i }).click();
    await expect(modal).not.toBeVisible();

    // Verify draft is cleared
    draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).toBeNull();
  });

  test('should clear draft after successful topic creation', async ({ page }) => {
    // Create a draft
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    const uniqueTitle = `E2E Draft Clear Test ${Date.now()}`;

    // Fill form with valid content
    await modal.getByLabel(/title/i).fill(uniqueTitle);
    await modal
      .getByLabel(/description/i)
      .fill(
        'This is a valid description with enough characters to pass validation requirements for this test.',
      );

    // Add a tag
    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('test-tag');
    await page.keyboard.press('Enter');

    // Wait for auto-save to ensure draft exists
    await page.waitForTimeout(1200);

    // Verify draft exists before submission
    let draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).not.toBeNull();

    // Submit the form
    await modal.getByRole('button', { name: /^create topic$/i }).click();

    // Wait for modal to close (successful creation)
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify draft is cleared after successful creation
    draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).toBeNull();
  });

  test('should preserve draft data including tags and settings when restored', async ({ page }) => {
    // Create a comprehensive draft
    await page.evaluate(
      ({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      },
      {
        key: DRAFT_STORAGE_KEY,
        data: createDraftData({
          title: 'Comprehensive Draft Test Title',
          description: 'This description tests that all fields are saved properly.',
          tags: ['draft-tag-1', 'draft-tag-2'],
          visibility: 'PRIVATE',
          evidenceStandards: 'RIGOROUS',
        }),
      },
    );

    // Reload page so useTopicDraft hook initializes with saved draft
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();

    // Open the modal
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Click Restore Draft
    await modal.getByRole('button', { name: /restore draft/i }).click();

    // Verify all fields are restored
    await expect(modal.getByLabel(/title/i)).toHaveValue('Comprehensive Draft Test Title');
    await expect(modal.getByLabel(/description/i)).toHaveValue(
      'This description tests that all fields are saved properly.',
    );
    await expect(modal.getByLabel(/visibility/i)).toHaveValue('PRIVATE');
    await expect(modal.getByLabel(/evidence standards/i)).toHaveValue('RIGOROUS');

    // Verify tags are restored (check for tag pills)
    await expect(modal.getByText('draft-tag-1')).toBeVisible();
    await expect(modal.getByText('draft-tag-2')).toBeVisible();
  });

  test('should not show draft prompt if no saved draft exists', async ({ page }) => {
    // Ensure no draft exists
    await page.evaluate((key) => localStorage.removeItem(key), DRAFT_STORAGE_KEY);

    // Open modal
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Draft prompt should NOT be visible
    await expect(modal.getByText(/unsaved draft found/i)).not.toBeVisible();

    // Form fields should be empty
    await expect(modal.getByLabel(/title/i)).toHaveValue('');
  });

  test('should not save draft if content is below minimum length', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Type content below minimum (10 chars)
    await modal.getByLabel(/title/i).fill('Short');

    // Wait for debounce
    await page.waitForTimeout(1200);

    // Verify draft is NOT saved
    const draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).toBeNull();
  });

  test('should show save status indicator while auto-saving', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    // Type content to trigger auto-save
    await modal.getByLabel(/title/i).fill('Title For Save Status Test');

    // Wait for save to complete and verify "Draft saved" indicator appears
    await page.waitForTimeout(1200);

    // Should show save confirmation (either "Saving draft..." or "Draft saved at...")
    await expect(modal.getByText(/draft saved at|saving draft/i)).toBeVisible({ timeout: 3000 });
  });

  test('should persist draft across page reload', async ({ page }) => {
    // Open modal and type content
    await page.getByRole('button', { name: /create topic/i }).click();
    let modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();

    const testTitle = 'Draft Persistence Across Reload Test';
    await modal.getByLabel(/title/i).fill(testTitle);

    // Wait for auto-save
    await page.waitForTimeout(1200);

    // Verify draft is saved
    let draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).not.toBeNull();

    // Reload the page (simulates unexpected closure)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Navigate back to topics page
    if (!page.url().includes('/topics')) {
      await page.goto('/topics');
    }
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();

    // Verify draft still exists in localStorage after reload
    draftData = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    expect(draftData).not.toBeNull();
    const parsed = JSON.parse(draftData as string);
    expect(parsed.title).toBe(testTitle);

    // Open modal again - should show draft prompt
    await page.getByRole('button', { name: /create topic/i }).click();
    modal = page.locator('[data-testid="create-topic-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/unsaved draft found/i)).toBeVisible();
  });
});
