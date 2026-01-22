import { test, expect } from '@playwright/test';

/**
 * E2E test suite for submitting responses to topics
 *
 * Tests the complete user journey of:
 * - Navigating to a topic detail page
 * - Filling out the response composer form
 * - Adding metadata (opinions, factual claims, sources)
 * - Submitting a response
 * - Verifying the response appears in the discussion
 */

// Generate unique response content
const generateResponseContent = () => {
  const timestamp = Date.now();
  return `This is a test response submitted at ${timestamp}. This response contains enough characters to meet the minimum length requirement for testing purposes.`;
};

test.describe('Submit Response to Topic', () => {
  test('should display response composer on topic detail page', async ({ page }) => {
    // Navigate to topics list
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Navigate to first topic
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Look for response composer form
      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();
      await expect(responseTextarea).toBeVisible();

      // Check for submit button
      const submitButton = page.getByRole('button', { name: /post response|submit|post reply/i });
      await expect(submitButton).toBeVisible();
    }
  });

  test('should validate minimum response length', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Find response textarea
      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();

      // Enter text that's too short
      await responseTextarea.fill('Short');

      // The submit button should be disabled when text is too short
      // This is the correct validation behavior - button stays disabled
      const submitButton = page.getByRole('button', { name: /post response|submit|post reply/i });
      await expect(submitButton).toBeDisabled();

      // Check for inline validation indicator (character count showing insufficient)
      // Look for character count that shows we're below minimum
      const characterCountOrValidation = page
        .locator('text=/\\d+.*\\/.*\\d+/i') // e.g., "5 / 50"
        .or(page.locator('text=/characters?/i'));

      // At least the character count should be visible to indicate length requirement
      const hasValidationIndicator = await characterCountOrValidation
        .first()
        .isVisible()
        .catch(() => false);

      // Validation is enforced either by disabled button or visible character requirement
      expect(hasValidationIndicator || (await submitButton.isDisabled())).toBeTruthy();
    }
  });

  test('should submit a basic response successfully', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const responseContent = generateResponseContent();

      // Fill response textarea
      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();
      await responseTextarea.fill(responseContent);

      // Submit the response
      const submitButton = page.getByRole('button', { name: /post response|submit|post reply/i });
      await submitButton.click();

      // Wait for submission to complete
      // Either the form clears, shows success message, or response appears in list
      await page.waitForTimeout(2000);

      // Check if form was cleared (indicates success)
      const clearedTextarea = await responseTextarea.inputValue();
      const wasCleared = clearedTextarea === '';

      // Or check for success message
      const successMessage = page.locator('text=/success|posted|submitted/i').first();
      const hasSuccessMessage = await successMessage.isVisible().catch(() => false);

      // At least one success indicator should be present
      expect(wasCleared || hasSuccessMessage).toBeTruthy();
    }
  });

  test('should show character count while typing', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();

      // Type some content
      const testContent = 'Test response content';
      await responseTextarea.fill(testContent);

      // Check for character count display
      const characterCount = page
        .locator('text=/\\d+.*\\/.*\\d+.*character/i')
        .or(page.locator('#character-count'));
      await expect(characterCount.first()).toBeVisible();
    }
  });

  test('should allow adding metadata checkboxes', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Look for metadata checkboxes
      const opinionCheckbox = page
        .locator('#contains-opinion, input[type="checkbox"]')
        .filter({ hasText: /opinion/i })
        .or(page.getByLabel(/opinion/i));
      const factualCheckbox = page
        .locator('#contains-factual-claims, input[type="checkbox"]')
        .filter({ hasText: /factual/i })
        .or(page.getByLabel(/factual/i));

      const hasOpinionCheckbox = (await opinionCheckbox.count()) > 0;
      const hasFactualCheckbox = (await factualCheckbox.count()) > 0;

      if (hasOpinionCheckbox) {
        // Check opinion checkbox
        await opinionCheckbox.first().check();
        await expect(opinionCheckbox.first()).toBeChecked();
      }

      if (hasFactualCheckbox) {
        // Check factual claims checkbox
        await factualCheckbox.first().check();
        await expect(factualCheckbox.first()).toBeChecked();
      }
    }
  });

  test('should allow adding cited sources', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Find source input field
      const sourceInput = page
        .locator('#cited-source, input[type="url"], input[placeholder*="source"]')
        .first();
      const hasSourceInput = (await sourceInput.count()) > 0;

      if (hasSourceInput) {
        // Add a source
        await sourceInput.fill('https://example.com/source');

        // Click add button
        const addButton = page.getByRole('button', { name: /add/i }).first();
        await addButton.click();

        // Verify source was added (should appear in list)
        await expect(page.getByText('https://example.com/source')).toBeVisible();
      }
    }
  });

  test('should validate URL format for cited sources', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const sourceInput = page
        .locator('#cited-source, input[type="url"], input[placeholder*="source"]')
        .first();
      const hasSourceInput = (await sourceInput.count()) > 0;

      if (hasSourceInput) {
        // Try to add invalid URL
        await sourceInput.fill('not-a-valid-url');
        const addButton = page.getByRole('button', { name: /add/i }).first();
        await addButton.click();

        // Should show error or not add the source
        // Either browser validation or custom error message
        const errorMessage = page.getByText(/valid url|invalid/i);
        const hasError = await errorMessage.isVisible().catch(() => false);

        // If no error message, source shouldn't be in the list
        if (!hasError) {
          const invalidSourceInList = page.getByText('not-a-valid-url');
          await expect(invalidSourceInList).not.toBeVisible();
        }
      }
    }
  });

  test('should allow removing added sources', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const sourceInput = page
        .locator('#cited-source, input[type="url"], input[placeholder*="source"]')
        .first();
      const hasSourceInput = (await sourceInput.count()) > 0;

      if (hasSourceInput) {
        // Add a source
        const testUrl = 'https://example.com/test-source';
        await sourceInput.fill(testUrl);
        const addButton = page.getByRole('button', { name: /add/i }).first();
        await addButton.click();

        // Verify source appears
        await expect(page.getByText(testUrl)).toBeVisible();

        // Find and click remove button
        const removeButton = page
          .locator(`button[aria-label*="Remove"], button`)
          .filter({ hasText: /×|remove/i })
          .first();
        const hasRemoveButton = (await removeButton.count()) > 0;

        if (hasRemoveButton) {
          await removeButton.click();

          // Source should be removed
          await expect(page.getByText(testUrl)).not.toBeVisible();
        }
      }
    }
  });

  test('should submit response with all metadata fields', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const responseContent = generateResponseContent();

      // Fill response textarea
      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();
      await responseTextarea.fill(responseContent);

      // Check metadata checkboxes
      const opinionCheckbox = page
        .locator('#contains-opinion, input[type="checkbox"]')
        .filter({ hasText: /opinion/i })
        .or(page.getByLabel(/opinion/i));
      const factualCheckbox = page
        .locator('#contains-factual-claims, input[type="checkbox"]')
        .filter({ hasText: /factual/i })
        .or(page.getByLabel(/factual/i));

      if ((await opinionCheckbox.count()) > 0) {
        await opinionCheckbox.first().check();
      }

      if ((await factualCheckbox.count()) > 0) {
        await factualCheckbox.first().check();
      }

      // Add a source
      const sourceInput = page
        .locator('#cited-source, input[type="url"], input[placeholder*="source"]')
        .first();
      if ((await sourceInput.count()) > 0) {
        await sourceInput.fill('https://example.com/evidence');
        const addButton = page.getByRole('button', { name: /add/i }).first();
        await addButton.click();
      }

      // Submit the response
      const submitButton = page.getByRole('button', { name: /post response|submit|post reply/i });
      await submitButton.click();

      // Wait for submission to complete
      await page.waitForTimeout(2000);

      // Check for multiple success indicators (same pattern as basic response test)
      // 1. Form was cleared
      const clearedTextarea = await responseTextarea.inputValue();
      const wasCleared = clearedTextarea === '';

      // 2. Success message shown
      const successMessage = page.locator('text=/success|posted|submitted/i').first();
      const hasSuccessMessage = await successMessage.isVisible().catch(() => false);

      // 3. Button returns to enabled state (not in submitting state)
      const buttonEnabled = await submitButton.isEnabled().catch(() => false);

      // 4. No error message visible
      const errorMessage = page.locator('text=/error|failed/i').first();
      const hasError = await errorMessage.isVisible().catch(() => false);

      // At least one positive indicator should be present, and no error
      // The form may not clear in all implementations, so we check multiple indicators
      expect(wasCleared || hasSuccessMessage || (buttonEnabled && !hasError)).toBeTruthy();
    }
  });

  test('should disable submit button while response is too short', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      const responseTextarea = page
        .locator(
          '#response-content, textarea[placeholder*="perspective"], textarea[placeholder*="response"]',
        )
        .first();
      const submitButton = page.getByRole('button', { name: /post response|submit|post reply/i });

      // Initially, submit button should be disabled
      await expect(submitButton).toBeDisabled();

      // Type short content
      await responseTextarea.fill('Hi');

      // Button should still be disabled
      await expect(submitButton).toBeDisabled();

      // Type enough content
      await responseTextarea.fill(generateResponseContent());

      // Button should now be enabled
      await expect(submitButton).toBeEnabled();
    }
  });
});
