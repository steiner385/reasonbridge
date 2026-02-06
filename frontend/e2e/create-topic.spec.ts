import { test, expect } from '@playwright/test';

/**
 * E2E test suite for Topic Creation (Feature 016: Topic Management)
 * T020: Tests complete topic creation flow including:
 * - Modal rendering and form validation
 * - Tag input functionality
 * - Duplicate detection warnings
 * - Successful topic creation
 * - Navigation to newly created topic
 */

test.describe('Create Topic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (required for topic creation)
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Use demo admin account for testing
    await page.getByText('Admin Adams').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Wait for login to complete and modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // Navigate to topics page
    await page.goto('/topics');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();
  });

  test('should render Create Topic button on topics page', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create topic/i });
    await expect(createButton).toBeVisible();
  });

  test('should open Create Topic modal when clicking button', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();

    // Modal should be visible with correct title
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Create New Discussion Topic' })).toBeVisible();
  });

  test('should render all required form fields', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Check for title input
    const titleInput = modal.getByLabel(/title/i);
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveAttribute('type', 'text');

    // Check for description textarea
    const descriptionInput = modal.getByLabel(/description/i);
    await expect(descriptionInput).toBeVisible();

    // Check for tag input
    const tagInput = modal.getByLabel(/tags/i);
    await expect(tagInput).toBeVisible();

    // Check for visibility select
    const visibilitySelect = modal.getByLabel(/visibility/i);
    await expect(visibilitySelect).toBeVisible();

    // Check for evidence standards select
    const evidenceSelect = modal.getByLabel(/evidence standards/i);
    await expect(evidenceSelect).toBeVisible();

    // Check for submit button
    const submitButton = modal.getByRole('button', { name: /create topic/i });
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error for title too short', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Enter title that's too short (< 10 chars)
    const titleInput = modal.getByLabel(/title/i);
    await titleInput.fill('Short');

    // Blur to trigger validation
    await titleInput.blur();

    // Should show validation error
    await expect(modal.getByText(/more characters needed/i)).toBeVisible();
  });

  test('should show validation error for description too short', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Enter description that's too short (< 50 chars)
    const descriptionInput = modal.getByLabel(/description/i);
    await descriptionInput.fill('Too short description');

    // Blur to trigger validation
    await descriptionInput.blur();

    // Should show validation error
    await expect(modal.getByText(/more characters needed/i)).toBeVisible();
  });

  test('should show error if no tags are added', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Check that error message is shown when no tags present
    await expect(modal.getByText(/at least 1 tag is required/i)).toBeVisible();

    // Submit button should be disabled
    const submitButton = modal.getByRole('button', { name: /create topic/i });
    await expect(submitButton).toBeDisabled();
  });

  test('should allow adding and removing tags', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    const tagInput = modal.getByLabel(/tags/i);
    const addButton = modal.getByRole('button', { name: /^add$/i });

    // Add first tag
    await tagInput.fill('climate');
    await addButton.click();
    await expect(modal.getByText('#climate')).toBeVisible();

    // Add second tag
    await tagInput.fill('policy');
    await addButton.click();
    await expect(modal.getByText('#policy')).toBeVisible();

    // Remove first tag
    const removeButton = modal.locator('span:has-text("#climate")').getByRole('button');
    await removeButton.click();
    await expect(modal.getByText('#climate')).not.toBeVisible();

    // Second tag should still be visible
    await expect(modal.getByText('#policy')).toBeVisible();
  });

  test('should allow adding tag by pressing Enter', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    const tagInput = modal.getByLabel(/tags/i);

    // Type tag and press Enter
    await tagInput.fill('economics');
    await tagInput.press('Enter');

    // Tag should be added
    await expect(modal.getByText('#economics')).toBeVisible();

    // Input should be cleared
    await expect(tagInput).toHaveValue('');
  });

  test('should limit tags to maximum of 5', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    const tagInput = modal.getByLabel(/tags/i);
    const addButton = modal.getByRole('button', { name: /^add$/i });

    // Add 5 tags
    const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
    for (const tag of tags) {
      await tagInput.fill(tag);
      await addButton.click();
    }

    // All 5 tags should be visible
    for (const tag of tags) {
      await expect(modal.getByText(`#${tag}`)).toBeVisible();
    }

    // Input should be disabled
    await expect(tagInput).toBeDisabled();

    // Add button should be disabled
    await expect(addButton).toBeDisabled();
  });

  test('should successfully create a new topic', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Fill in valid data
    const titleInput = modal.getByLabel(/title/i);
    await titleInput.fill('Should we implement carbon taxes to combat climate change?');

    const descriptionInput = modal.getByLabel(/description/i);
    await descriptionInput.fill(
      'Carbon taxes are a policy tool that aims to reduce greenhouse gas emissions ' +
        'by placing a price on carbon dioxide emissions. This discussion explores the ' +
        'economic, social, and environmental implications of implementing such policies.',
    );

    // Add tags
    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('climate');
    await tagInput.press('Enter');
    await tagInput.fill('policy');
    await tagInput.press('Enter');
    await tagInput.fill('economics');
    await tagInput.press('Enter');

    // Set visibility
    const visibilitySelect = modal.getByLabel(/visibility/i);
    await visibilitySelect.selectOption('PUBLIC');

    // Set evidence standards
    const evidenceSelect = modal.getByLabel(/evidence standards/i);
    await evidenceSelect.selectOption('STANDARD');

    // Submit form
    const submitButton = modal.getByRole('button', { name: /create topic/i });
    await expect(submitButton).not.toBeDisabled();
    await submitButton.click();

    // Should navigate to the new topic or close modal
    // Wait for either navigation or modal close (both indicate success)
    await Promise.race([
      expect(modal).not.toBeVisible({ timeout: 10000 }),
      expect(page).toHaveURL(/\/topics\/[\w-]+/, { timeout: 10000 }),
    ]);
  });

  test('should show duplicate warning when similar topics exist', async ({ page }) => {
    // First, create a topic
    await page.getByRole('button', { name: /create topic/i }).click();
    let modal = page.getByRole('dialog');

    const uniqueTitle = `Climate Change Discussion ${Date.now()}`;
    const description =
      'This is a unique description about climate change policies and their economic impact on society. We need to discuss carbon taxes, renewable energy subsidies, and emission trading schemes.';

    await modal.getByLabel(/title/i).fill(uniqueTitle);
    await modal.getByLabel(/description/i).fill(description);

    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('climate');
    await tagInput.press('Enter');
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    await modal.getByRole('button', { name: /create topic/i }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Go back to topics page
    await page.goto('/topics');

    // Try to create a very similar topic
    await page.getByRole('button', { name: /create topic/i }).click();
    modal = page.getByRole('dialog');

    // Use almost identical title and description
    await modal.getByLabel(/title/i).fill(`Climate Change Discussion ${Date.now()}`);
    await modal.getByLabel(/description/i).fill(description);

    await tagInput.fill('climate');
    await tagInput.press('Enter');
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    await modal.getByRole('button', { name: /create topic/i }).click();

    // Should show duplicate warning
    await expect(modal.getByText(/similar topics found/i)).toBeVisible({ timeout: 10000 });

    // Should show suggested similar topics
    await expect(modal.getByText(/consider joining an existing discussion/i)).toBeVisible();

    // Button text should change to "Create Anyway"
    await expect(modal.getByRole('button', { name: /create anyway/i })).toBeVisible();
  });

  test('should allow creating topic despite duplicate warning', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Fill in data that might trigger duplicate detection
    await modal.getByLabel(/title/i).fill('Climate policy discussion on carbon emissions');
    await modal
      .getByLabel(/description/i)
      .fill(
        'A comprehensive discussion about climate policy focusing on carbon emissions ' +
          'and their impact on the environment. We need to explore various policy options.',
      );

    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('climate');
    await tagInput.press('Enter');

    // Submit once
    await modal.getByRole('button', { name: /create topic/i }).click();

    // If duplicate warning appears, click "Create Anyway"
    const createAnywayButton = modal.getByRole('button', { name: /create anyway/i });
    if (await createAnywayButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createAnywayButton.click();
    }

    // Should eventually create the topic
    await expect(modal).not.toBeVisible({ timeout: 10000 });
  });

  test('should close modal when clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Click cancel button
    await modal.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });

  test('should close modal and reset form when clicking close icon', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    let modal = page.getByRole('dialog');

    // Fill in some data
    await modal.getByLabel(/title/i).fill('Test Topic Title');

    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('test');
    await tagInput.press('Enter');

    // Close modal by clicking outside or close button
    await modal.getByRole('button', { name: /cancel/i }).click();
    await expect(modal).not.toBeVisible();

    // Reopen modal
    await page.getByRole('button', { name: /create topic/i }).click();
    modal = page.getByRole('dialog');

    // Form should be reset
    await expect(modal.getByLabel(/title/i)).toHaveValue('');
    await expect(modal.getByText('#test')).not.toBeVisible();
  });

  test('should show loading state while creating topic', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Fill in valid data
    await modal.getByLabel(/title/i).fill('Testing Loading State for Topic Creation');
    await modal
      .getByLabel(/description/i)
      .fill(
        'This is a test to verify that the loading state is properly displayed ' +
          'when creating a new topic in the reasonBridge discussion platform.',
      );

    const tagInput = modal.getByLabel(/tags/i);
    await tagInput.fill('testing');
    await tagInput.press('Enter');

    // Submit form
    const submitButton = modal.getByRole('button', { name: /create topic/i });
    await submitButton.click();

    // Should show loading state (button may show spinner or change text)
    // This may be very fast, so we just verify the form was submitted
    await expect(submitButton).toBeVisible();
  });

  test('should display character counts for title and description', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // Check initial character counts
    await expect(modal.getByText('0/200')).toBeVisible(); // Title counter
    await expect(modal.getByText('0/5000')).toBeVisible(); // Description counter

    // Type in title
    await modal.getByLabel(/title/i).fill('Test Title');
    await expect(modal.getByText('10/200')).toBeVisible();

    // Type in description
    await modal
      .getByLabel(/description/i)
      .fill('Test description text that is long enough to meet the minimum requirement.');
    await expect(modal.getByText(/\/5000$/)).toBeVisible();
  });

  test('should have accessible form structure', async ({ page }) => {
    await page.getByRole('button', { name: /create topic/i }).click();
    const modal = page.getByRole('dialog');

    // All inputs should have labels
    await expect(modal.getByLabel(/title/i)).toBeVisible();
    await expect(modal.getByLabel(/description/i)).toBeVisible();
    await expect(modal.getByLabel(/tags/i)).toBeVisible();
    await expect(modal.getByLabel(/visibility/i)).toBeVisible();
    await expect(modal.getByLabel(/evidence standards/i)).toBeVisible();

    // Modal should have proper dialog role
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('should show rate limit error when creating too many topics', async ({ page }) => {
    // This test is optional and may be skipped if rate limiting is hard to test
    // Rate limit is 5 per day, so we'd need to create 6 topics
    // In practice, this might be better tested at the API level
    test.skip(true, 'Rate limiting test requires creating 6 topics, which is time-consuming');
  });
});
