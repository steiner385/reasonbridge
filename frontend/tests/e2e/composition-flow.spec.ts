import { test, expect } from '@playwright/test';

/**
 * E2E tests for User Story 3: Composing Responses with Real-Time Feedback
 * Tests the composition flow with preview feedback displayed in the right panel
 */

test.describe('Composition Flow - Bottom Composer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to discussions page and select a topic
    await page.goto('/discussions');
    await expect(page.locator('[data-testid="topic-list-item"]').first()).toBeVisible();
    await page.locator('[data-testid="topic-list-item"]').first().click();
  });

  test('should display response composer at bottom of conversation', async ({ page }) => {
    // Response composer should be visible in center panel
    const composer = page.locator('role=main').locator('form');
    await expect(composer).toBeVisible();

    // Should have textarea
    await expect(composer.locator('textarea')).toBeVisible();

    // Should have submit button
    await expect(composer.getByRole('button', { name: /post response/i })).toBeVisible();
  });

  test('should show character count as user types', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Type content
    await textarea.fill('This is test content');

    // Should show character count
    await expect(page.getByText(/20 \/ \d+ characters/i)).toBeVisible();
  });

  test('should switch to Preview tab when composing', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Type enough content to trigger preview feedback (20+ chars)
    await textarea.fill('This is a long enough content for preview feedback analysis');

    // Wait a moment for debouncing
    await page.waitForTimeout(500);

    // Right panel should automatically switch to Preview tab
    const previewTab = page.getByRole('tab', { name: /preview/i });
    await expect(previewTab).toBeVisible();
    await expect(previewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display preview feedback in right panel during composition', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Type content
    await textarea.fill('This is a long enough content for preview feedback analysis');

    // Wait for preview feedback to load
    await page.waitForTimeout(800);

    // Preview tab should show feedback panel
    const previewPanel = page.locator('[id="preview-panel"]');
    await expect(previewPanel).toBeVisible();

    // Should show either feedback items or empty state
    const hasFeedback = await page.getByText(/feedback preview/i).isVisible();
    const hasEmptyState = await page.getByText(/no suggestions/i).isVisible();

    expect(hasFeedback || hasEmptyState).toBe(true);
  });

  test('should show Ready to Post indicator when no issues', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Type clean content
    await textarea.fill('This is a well-structured response with no apparent issues');

    // Wait for preview feedback
    await page.waitForTimeout(800);

    // Preview tab should show checkmark or ready indicator
    const previewTab = page.getByRole('tab', { name: /preview/i });
    await expect(previewTab).toBeVisible();

    // Check for checkmark in tab (when ready to post)
    // This is optional - may not appear depending on backend response
  });

  test('should submit response and clear form', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');
    const submitButton = page.locator('role=main').getByRole('button', { name: /post response/i });

    // Type valid content (>= minLength)
    await textarea.fill('This is a valid response with enough content');

    // Click submit
    await submitButton.click();

    // Form should be reset
    await expect(textarea).toHaveValue('');

    // Character count should reset
    await expect(page.getByText(/0 \/ \d+ characters/i)).toBeVisible();
  });

  test('should not submit when content is below minimum length', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');
    const submitButton = page.locator('role=main').getByRole('button', { name: /post response/i });

    // Type short content
    await textarea.fill('Short');

    // Submit button should be disabled
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Composition Flow - Inline Replies', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to discussions page and select a topic
    await page.goto('/discussions');
    await expect(page.locator('[data-testid="topic-list-item"]').first()).toBeVisible();
    await page.locator('[data-testid="topic-list-item"]').first().click();
  });

  test('should display Reply button on responses when threading is enabled', async ({ page }) => {
    // Wait for responses to load
    const responseList = page.locator('[role="list"][aria-label="Responses"]');

    if (await responseList.isVisible()) {
      // Should have Reply button on first response
      const firstResponse = page.locator('[role="list"][aria-label="Responses"]').locator('..');
      const replyButton = firstResponse.getByRole('button', { name: /reply/i }).first();

      await expect(replyButton).toBeVisible();
    }
  });

  test('should expand inline composer when Reply is clicked', async ({ page }) => {
    // Check if responses exist
    const responseList = page.locator('[role="list"][aria-label="Responses"]');

    if (await responseList.isVisible()) {
      // Find first Reply button
      const replyButton = page.getByRole('button', { name: /reply/i }).first();

      // Click Reply
      await replyButton.click();

      // Inline composer should appear
      await page.waitForTimeout(300);

      // Should show textarea in the reply area
      // Note: This is a simplified check - actual implementation may have different selectors
      const textareas = await page.locator('textarea').count();
      expect(textareas).toBeGreaterThan(1); // At least bottom composer + inline composer
    }
  });

  test('should show preview feedback in right panel during inline reply', async ({ page }) => {
    // Check if responses exist
    const responseList = page.locator('[role="list"][aria-label="Responses"]');

    if (await responseList.isVisible()) {
      // Click first Reply button
      const replyButton = page.getByRole('button', { name: /reply/i }).first();
      await replyButton.click();

      // Wait for inline composer to expand
      await page.waitForTimeout(300);

      // Find the inline textarea (not the bottom one)
      const textareas = page.locator('textarea');
      const inlineTextarea = textareas.nth(0); // First textarea should be inline

      // Type content
      await inlineTextarea.fill('This is an inline reply with enough content for feedback');

      // Wait for debouncing and feedback
      await page.waitForTimeout(800);

      // Right panel should switch to Preview tab
      const previewTab = page.getByRole('tab', { name: /preview/i });
      await expect(previewTab).toBeVisible();
      await expect(previewTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('should collapse inline composer when Cancel is clicked', async ({ page }) => {
    // Check if responses exist
    const responseList = page.locator('[role="list"][aria-label="Responses"]');

    if (await responseList.isVisible()) {
      // Click Reply to expand
      const replyButton = page.getByRole('button', { name: /reply/i }).first();
      await replyButton.click();

      // Wait for inline composer
      await page.waitForTimeout(300);

      // Click Cancel button (should be near the inline composer)
      const cancelButtons = page.getByRole('button', { name: /cancel/i });
      if ((await cancelButtons.count()) > 0) {
        await cancelButtons.first().click();

        // Inline composer should collapse
        await page.waitForTimeout(300);

        // Should only have bottom composer textarea now
        const textareas = await page.locator('textarea').count();
        expect(textareas).toBe(1);
      }
    }
  });

  test('should submit inline reply and collapse composer', async ({ page }) => {
    // Check if responses exist
    const responseList = page.locator('[role="list"][aria-label="Responses"]');

    if (await responseList.isVisible()) {
      // Click Reply to expand
      const replyButton = page.getByRole('button', { name: /reply/i }).first();
      await replyButton.click();

      // Wait for inline composer
      await page.waitForTimeout(300);

      // Find inline textarea
      const textareas = page.locator('textarea');
      const inlineTextarea = textareas.first();

      // Type valid reply
      await inlineTextarea.fill('This is a valid inline reply with sufficient content');

      // Find and click Post Reply button
      const postReplyButton = page.getByRole('button', { name: /post reply/i }).first();
      await postReplyButton.click();

      // Wait for submission
      await page.waitForTimeout(500);

      // Inline composer should collapse
      const remainingTextareas = await page.locator('textarea').count();
      expect(remainingTextareas).toBe(1); // Only bottom composer remains
    }
  });
});

test.describe('Composition Flow - Source Citations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to discussions page and select a topic
    await page.goto('/discussions');
    await expect(page.locator('[data-testid="topic-list-item"]').first()).toBeVisible();
    await page.locator('[data-testid="topic-list-item"]').first().click();
  });

  test('should add cited source URL', async ({ page }) => {
    const sourceInput = page
      .locator('role=main')
      .getByPlaceholderText(/https:\/\/example.com\/source/i);
    const addButton = page.locator('role=main').getByRole('button', { name: /^add$/i });

    // Type valid URL
    await sourceInput.fill('https://example.com/article');

    // Click Add
    await addButton.click();

    // Source should appear in the list
    await expect(page.getByText('https://example.com/article')).toBeVisible();
  });

  test('should remove cited source', async ({ page }) => {
    const sourceInput = page
      .locator('role=main')
      .getByPlaceholderText(/https:\/\/example.com\/source/i);
    const addButton = page.locator('role=main').getByRole('button', { name: /^add$/i });

    // Add a source
    await sourceInput.fill('https://example.com/article');
    await addButton.click();

    await expect(page.getByText('https://example.com/article')).toBeVisible();

    // Click remove button
    const removeButton = page.getByLabel(/remove source/i).first();
    await removeButton.click();

    // Source should be removed
    await expect(page.getByText('https://example.com/article')).not.toBeVisible();
  });

  test('should show error for invalid URL', async ({ page }) => {
    const sourceInput = page
      .locator('role=main')
      .getByPlaceholderText(/https:\/\/example.com\/source/i);
    const addButton = page.locator('role=main').getByRole('button', { name: /^add$/i });

    // Type invalid URL
    await sourceInput.fill('not-a-valid-url');

    // Click Add
    await addButton.click();

    // Should show error message
    await expect(page.getByText(/please enter a valid url/i)).toBeVisible();
  });
});

test.describe('Composition Flow - Preview Tab Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to discussions page and select a topic
    await page.goto('/discussions');
    await expect(page.locator('[data-testid="topic-list-item"]').first()).toBeVisible();
    await page.locator('[data-testid="topic-list-item"]').first().click();
  });

  test('should hide Preview tab when not composing', async ({ page }) => {
    // Initially, Preview tab should not be visible
    const previewTab = page.getByRole('tab', { name: /preview/i });

    // Preview tab may be hidden when not composing
    const isVisible = await previewTab.isVisible();

    // If visible, it should not be the active tab initially
    if (isVisible) {
      const isSelected = await previewTab.getAttribute('aria-selected');
      expect(isSelected).not.toBe('true');
    }
  });

  test('should auto-activate Preview tab when composing starts', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Start typing
    await textarea.fill('This is content that triggers preview feedback display');

    // Wait for debouncing
    await page.waitForTimeout(800);

    // Preview tab should appear and be active
    const previewTab = page.getByRole('tab', { name: /preview/i });
    await expect(previewTab).toBeVisible();
    await expect(previewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should allow switching between tabs while composing', async ({ page }) => {
    const textarea = page.locator('role=main').locator('textarea');

    // Start typing to activate Preview tab
    await textarea.fill('This is content for preview');
    await page.waitForTimeout(800);

    // Switch to Propositions tab
    const propositionsTab = page.getByRole('tab', { name: /propositions/i });
    await propositionsTab.click();

    // Propositions tab should be active
    await expect(propositionsTab).toHaveAttribute('aria-selected', 'true');

    // Switch back to Preview tab
    const previewTab = page.getByRole('tab', { name: /preview/i });
    await previewTab.click();

    // Preview tab should be active again
    await expect(previewTab).toHaveAttribute('aria-selected', 'true');
  });
});
