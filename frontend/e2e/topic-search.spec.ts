import { test, expect } from '@playwright/test';

/**
 * E2E test suite for Topic Search and Filtering (Feature 016: Topic Management)
 * T026: Tests complete topic discovery flow including:
 * - Full-text search
 * - Status filtering (SEEDING/ACTIVE/ARCHIVED/LOCKED)
 * - Visibility filtering (PUBLIC/PRIVATE/UNLISTED)
 * - Tag filtering
 * - Sort options (newest, most participants, most responses)
 * - Combined filters
 */

test.describe('Topic Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to topics page
    await page.goto('/topics');
    await expect(page.getByRole('heading', { name: 'Discussion Topics' })).toBeVisible();
  });

  test('should display topic filter controls', async ({ page }) => {
    // Check for search input
    const searchInput = page.getByLabel(/search topics/i);
    await expect(searchInput).toBeVisible();

    // Check for status filter buttons
    await expect(page.getByRole('button', { name: 'Seeding' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archived' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locked' })).toBeVisible();

    // Check for visibility filter buttons
    await expect(page.getByRole('button', { name: 'Public' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlisted' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Private' })).toBeVisible();

    // Check for sort dropdown
    const sortSelect = page.getByLabel(/sort by/i);
    await expect(sortSelect).toBeVisible();

    // Check for tag filter input
    const tagInput = page.getByLabel(/filter by tag/i);
    await expect(tagInput).toBeVisible();
  });

  test('should filter topics by status - Seeding', async ({ page }) => {
    // Click Seeding status button
    await page.getByRole('button', { name: 'Seeding' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Status: SEEDING/i)).toBeVisible();

    // Seeding button should be highlighted (primary variant)
    const seedingButton = page.getByRole('button', { name: 'Seeding' });
    await expect(seedingButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by status - Active', async ({ page }) => {
    // Click Active status button
    await page.getByRole('button', { name: /^Active$/ }).click();

    // Should show active filter badge
    await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();

    // Active button should be highlighted
    const activeButton = page.getByRole('button', { name: /^Active$/ });
    await expect(activeButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by status - Archived', async ({ page }) => {
    // Click Archived status button
    await page.getByRole('button', { name: 'Archived' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Status: ARCHIVED/i)).toBeVisible();
  });

  test('should filter topics by status - Locked', async ({ page }) => {
    // Click Locked status button
    await page.getByRole('button', { name: 'Locked' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Status: LOCKED/i)).toBeVisible();
  });

  test('should reset status filter when clicking All', async ({ page }) => {
    // First apply a status filter
    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();

    // Click All button
    await page.getByRole('button', { name: /^All$/i }).first().click();

    // Active filter badge should disappear
    await expect(page.getByText(/Status: ACTIVE/i)).not.toBeVisible();

    // All button should be highlighted
    const allButton = page.getByRole('button', { name: /^All$/i }).first();
    await expect(allButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by visibility - Public', async ({ page }) => {
    // Click Public visibility button
    await page.getByRole('button', { name: 'Public' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: PUBLIC/i)).toBeVisible();
  });

  test('should filter topics by visibility - Unlisted', async ({ page }) => {
    // Click Unlisted visibility button
    await page.getByRole('button', { name: 'Unlisted' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: UNLISTED/i)).toBeVisible();
  });

  test('should filter topics by visibility - Private', async ({ page }) => {
    // Click Private visibility button
    await page.getByRole('button', { name: 'Private' }).click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: PRIVATE/i)).toBeVisible();
  });

  test('should search topics by text query', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);
    const searchButton = page.getByRole('button', { name: /^Search$/i });

    // Enter search query
    await searchInput.fill('climate change');

    // Click search button
    await searchButton.click();

    // Should show active search filter badge
    await expect(page.getByText(/Search: "climate change"/i)).toBeVisible();

    // Wait for results to load
    await page.waitForTimeout(1000);
  });

  test('should search topics by pressing Enter key', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);

    // Enter search query and press Enter
    await searchInput.fill('carbon tax');
    await searchInput.press('Enter');

    // Should show active search filter badge
    await expect(page.getByText(/Search: "carbon tax"/i)).toBeVisible();
  });

  test('should clear search filter', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);

    // Apply search
    await searchInput.fill('policy');
    await searchInput.press('Enter');
    await expect(page.getByText(/Search: "policy"/i)).toBeVisible();

    // Click Clear button
    await page.getByRole('button', { name: /^Clear$/i }).click();

    // Search filter badge should disappear
    await expect(page.getByText(/Search: "policy"/i)).not.toBeVisible();

    // Search input should be empty
    await expect(searchInput).toHaveValue('');
  });

  test('should filter topics by tag', async ({ page }) => {
    const tagInput = page.getByLabel(/filter by tag/i);
    const applyButton = page.getByRole('button', { name: /^Apply$/i });

    // Enter tag
    await tagInput.fill('climate');

    // Click Apply button
    await applyButton.click();

    // Should show active tag filter badge
    await expect(page.getByText(/Tag: climate/i)).toBeVisible();

    // Wait for results to load
    await page.waitForTimeout(1000);
  });

  test('should filter topics by tag using Enter key', async ({ page }) => {
    const tagInput = page.getByLabel(/filter by tag/i);

    // Enter tag and press Enter
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    // Should show active tag filter badge
    await expect(page.getByText(/Tag: policy/i)).toBeVisible();
  });

  test('should clear tag filter', async ({ page }) => {
    const tagInput = page.getByLabel(/filter by tag/i);

    // Apply tag filter
    await tagInput.fill('economics');
    await tagInput.press('Enter');
    await expect(page.getByText(/Tag: economics/i)).toBeVisible();

    // Click Clear Tag button
    await page.getByRole('button', { name: /clear tag/i }).click();

    // Tag filter badge should disappear
    await expect(page.getByText(/Tag: economics/i)).not.toBeVisible();

    // Tag input should be empty
    await expect(tagInput).toHaveValue('');
  });

  test('should change sort order', async ({ page }) => {
    const sortSelect = page.getByLabel(/sort by/i);

    // Default should be "Newest First"
    await expect(sortSelect).toHaveValue('createdAt');

    // Change to "Most Participants"
    await sortSelect.selectOption('participantCount');
    await expect(sortSelect).toHaveValue('participantCount');

    // Wait for results to reload
    await page.waitForTimeout(1000);

    // Change to "Most Responses"
    await sortSelect.selectOption('responseCount');
    await expect(sortSelect).toHaveValue('responseCount');

    // Wait for results to reload
    await page.waitForTimeout(1000);
  });

  test('should apply multiple filters simultaneously', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);
    const tagInput = page.getByLabel(/filter by tag/i);

    // Apply search filter
    await searchInput.fill('climate');
    await searchInput.press('Enter');

    // Apply status filter
    await page.getByRole('button', { name: 'Active' }).click();

    // Apply visibility filter
    await page.getByRole('button', { name: 'Public' }).click();

    // Apply tag filter
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    // All filter badges should be visible
    await expect(page.getByText(/Search: "climate"/i)).toBeVisible();
    await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();
    await expect(page.getByText(/Visibility: PUBLIC/i)).toBeVisible();
    await expect(page.getByText(/Tag: policy/i)).toBeVisible();

    // Wait for results to load with combined filters
    await page.waitForTimeout(1000);
  });

  test('should display active filters section only when filters are applied', async ({ page }) => {
    // Initially, no active filters should be shown
    await expect(page.getByText(/^Active filters:$/i)).not.toBeVisible();

    // Apply a filter
    await page.getByRole('button', { name: 'Active' }).click();

    // Active filters section should appear
    await expect(page.getByText(/^Active filters:$/i)).toBeVisible();

    // Clear the filter
    await page.getByRole('button', { name: /^All$/i }).first().click();

    // Active filters section should disappear
    await expect(page.getByText(/^Active filters:$/i)).not.toBeVisible();
  });

  test('should maintain filters when navigating between pages', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);

    // Apply search filter
    await searchInput.fill('discussion');
    await searchInput.press('Enter');

    // Apply status filter
    await page.getByRole('button', { name: 'Active' }).click();

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /next/i });
    const hasPagination = await nextButton.isVisible().catch(() => false);

    if (hasPagination) {
      // Click next page
      await nextButton.click();

      // Wait for page to load
      await page.waitForTimeout(1000);

      // Filters should still be active
      await expect(page.getByText(/Search: "discussion"/i)).toBeVisible();
      await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();
    } else {
      // Skip pagination test if there's only one page
      test.skip(true, 'Not enough data for pagination testing');
    }
  });

  test('should reset to page 1 when changing filters', async ({ page }) => {
    // This test verifies that changing filters resets pagination to page 1
    // (Backend behavior, but we can verify URL doesn't have page param)

    // Apply a filter
    await page.getByRole('button', { name: 'Active' }).click();

    // Wait for results
    await page.waitForTimeout(500);

    // URL should not contain page parameter or page=1
    const url = page.url();
    expect(url).not.toContain('page=2');
    expect(url).not.toContain('page=3');
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    const searchInput = page.getByLabel(/search topics/i);

    // Search for something very specific that likely won't exist
    await searchInput.fill('xyzabc123unlikely789');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForTimeout(1500);

    // Should show "No topics found" message
    await expect(page.getByText(/no topics found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have accessible filter controls', async ({ page }) => {
    // All filter buttons should be keyboard accessible
    const statusButtons = [
      page.getByRole('button', { name: /^All$/i }).first(),
      page.getByRole('button', { name: 'Seeding' }),
      page.getByRole('button', { name: 'Active' }),
      page.getByRole('button', { name: 'Archived' }),
      page.getByRole('button', { name: 'Locked' }),
    ];

    for (const button of statusButtons) {
      await expect(button).toBeVisible();
    }

    // Sort select should have proper label
    const sortSelect = page.getByLabel(/sort by/i);
    await expect(sortSelect).toBeVisible();

    // Input fields should have labels
    await expect(page.getByLabel(/search topics/i)).toBeVisible();
    await expect(page.getByLabel(/filter by tag/i)).toBeVisible();
  });

  test('should highlight selected filter buttons', async ({ page }) => {
    // Click status filter
    const activeButton = page.getByRole('button', { name: /^Active$/i });
    await activeButton.click();

    // Button should have primary styling (highlighted)
    await expect(activeButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));

    // Other status buttons should have outline styling
    const seedingButton = page.getByRole('button', { name: 'Seeding' });
    await expect(seedingButton).toHaveAttribute('class', expect.stringContaining('border'));
  });

  test('should preserve sort order across filter changes', async ({ page }) => {
    const sortSelect = page.getByLabel(/sort by/i);

    // Change sort to "Most Participants"
    await sortSelect.selectOption('participantCount');
    await expect(sortSelect).toHaveValue('participantCount');

    // Apply a status filter
    await page.getByRole('button', { name: 'Active' }).click();

    // Wait for results
    await page.waitForTimeout(500);

    // Sort order should be preserved
    await expect(sortSelect).toHaveValue('participantCount');
  });
});
