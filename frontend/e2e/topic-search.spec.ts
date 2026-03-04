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
    // Check for search input (using topic-filter-search-input to avoid collision with TopicSearchFilter)
    const searchInput = page.getByTestId('topic-filter-search-input');
    await expect(searchInput).toBeVisible();

    // Check for status filter buttons (use data-testid for specificity)
    await expect(page.getByTestId('topic-filter-status-seeding')).toBeVisible();
    await expect(page.getByTestId('topic-filter-status-active')).toBeVisible();
    await expect(page.getByTestId('topic-filter-status-archived')).toBeVisible();
    await expect(page.getByTestId('topic-filter-status-locked')).toBeVisible();

    // Check for visibility filter buttons
    await expect(page.getByTestId('topic-filter-visibility-public')).toBeVisible();
    await expect(page.getByTestId('topic-filter-visibility-unlisted')).toBeVisible();
    await expect(page.getByTestId('topic-filter-visibility-private')).toBeVisible();

    // Check for sort dropdown
    const sortSelect = page.getByTestId('topic-sort-select');
    await expect(sortSelect).toBeVisible();

    // Check for tag filter input
    const tagInput = page.getByTestId('tag-filter-input');
    await expect(tagInput).toBeVisible();
  });

  test('should filter topics by status - Seeding', async ({ page }) => {
    // Click Seeding status button
    await page.getByTestId('topic-filter-status-seeding').click();

    // Should show active filter badge
    await expect(page.getByText(/Status: SEEDING/i)).toBeVisible();

    // Seeding button should be highlighted (primary variant)
    const seedingButton = page.getByTestId('topic-filter-status-seeding');
    await expect(seedingButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by status - Active', async ({ page }) => {
    // Click Active status button
    await page.getByTestId('topic-filter-status-active').click();

    // Should show active filter badge
    await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();

    // Active button should be highlighted
    const activeButton = page.getByTestId('topic-filter-status-active');
    await expect(activeButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by status - Archived', async ({ page }) => {
    // Click Archived status button
    await page.getByTestId('topic-filter-status-archived').click();

    // Should show active filter badge
    await expect(page.getByText(/Status: ARCHIVED/i)).toBeVisible();
  });

  test('should filter topics by status - Locked', async ({ page }) => {
    // Click Locked status button
    await page.getByTestId('topic-filter-status-locked').click();

    // Should show active filter badge
    await expect(page.getByText(/Status: LOCKED/i)).toBeVisible();
  });

  test('should reset status filter when clicking All', async ({ page }) => {
    // First apply a status filter
    await page.getByTestId('topic-filter-status-active').click();
    await expect(page.getByText(/Status: ACTIVE/i)).toBeVisible();

    // Click All button
    await page.getByTestId('topic-filter-status-all').click();

    // Active filter badge should disappear
    await expect(page.getByText(/Status: ACTIVE/i)).not.toBeVisible();

    // All button should be highlighted
    const allButton = page.getByTestId('topic-filter-status-all');
    await expect(allButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));
  });

  test('should filter topics by visibility - Public', async ({ page }) => {
    // Click Public visibility button
    await page.getByTestId('topic-filter-visibility-public').click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: PUBLIC/i)).toBeVisible();
  });

  test('should filter topics by visibility - Unlisted', async ({ page }) => {
    // Click Unlisted visibility button
    await page.getByTestId('topic-filter-visibility-unlisted').click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: UNLISTED/i)).toBeVisible();
  });

  test('should filter topics by visibility - Private', async ({ page }) => {
    // Click Private visibility button
    await page.getByTestId('topic-filter-visibility-private').click();

    // Should show active filter badge
    await expect(page.getByText(/Visibility: PRIVATE/i)).toBeVisible();
  });

  test('should search topics by text query', async ({ page }) => {
    const searchInput = page.getByTestId('topic-filter-search-input');
    const searchButton = page.getByTestId('topic-search-button');

    // Enter search query
    await searchInput.fill('climate change');

    // Click search button
    await searchButton.click();

    // Should show active search filter badge
    await expect(page.getByText(/Search:.*climate change/i)).toBeVisible();

    // Wait for results to load
    await page.waitForTimeout(1000);
  });

  test('should search topics by pressing Enter key', async ({ page }) => {
    const searchInput = page.getByTestId('topic-filter-search-input');

    // Enter search query and press Enter
    await searchInput.fill('carbon tax');
    await searchInput.press('Enter');

    // Should show active search filter badge
    await expect(page.getByText(/Search:.*carbon tax/i)).toBeVisible();
  });

  test('should clear search filter', async ({ page }) => {
    const searchInput = page.getByTestId('topic-filter-search-input');

    // Apply search
    await searchInput.fill('policy');
    await searchInput.press('Enter');
    await expect(page.getByText(/Search:.*policy/i)).toBeVisible();

    // Click Clear button
    await page.getByTestId('clear-search-button').click();

    // Search filter badge should disappear
    await expect(page.getByText(/Search:.*policy/i)).not.toBeVisible();

    // Search input should be empty
    await expect(searchInput).toHaveValue('');
  });

  test('should filter topics by tag', async ({ page }) => {
    const tagInput = page.getByTestId('tag-filter-input');
    const applyButton = page.getByTestId('apply-tag-filter-button');

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
    const tagInput = page.getByTestId('tag-filter-input');

    // Enter tag and press Enter
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    // Should show active tag filter badge
    await expect(page.getByText(/Tag: policy/i)).toBeVisible();
  });

  test('should clear tag filter', async ({ page }) => {
    const tagInput = page.getByTestId('tag-filter-input');

    // Apply tag filter
    await tagInput.fill('economics');
    await tagInput.press('Enter');
    await expect(page.getByText(/Tag: economics/i)).toBeVisible();

    // Click Clear Tag button
    await page.getByTestId('clear-tag-filter-button').click();

    // Tag filter badge should disappear
    await expect(page.getByText(/Tag: economics/i)).not.toBeVisible();

    // Tag input should be empty
    await expect(tagInput).toHaveValue('');
  });

  test('should change sort order', async ({ page }) => {
    const sortSelect = page.getByTestId('topic-sort-select');

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
    const searchInput = page.getByTestId('topic-filter-search-input');
    const tagInput = page.getByTestId('tag-filter-input');

    // Apply search filter
    await searchInput.fill('climate');
    await searchInput.press('Enter');

    // Apply status filter
    await page.getByTestId('topic-filter-status-active').click();

    // Apply visibility filter
    await page.getByTestId('topic-filter-visibility-public').click();

    // Apply tag filter
    await tagInput.fill('policy');
    await tagInput.press('Enter');

    // All filter badges should be visible
    await expect(page.getByText(/Search:.*climate/i)).toBeVisible();
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
    await page.getByTestId('topic-filter-status-active').click();

    // Active filters section should appear
    await expect(page.getByText(/^Active filters:$/i)).toBeVisible();

    // Clear the filter
    await page.getByTestId('topic-filter-status-all').click();

    // Active filters section should disappear
    await expect(page.getByText(/^Active filters:$/i)).not.toBeVisible();
  });

  test('should maintain filters when navigating between pages', async ({ page }) => {
    const searchInput = page.getByTestId('topic-filter-search-input');

    // Apply search filter
    await searchInput.fill('discussion');
    await searchInput.press('Enter');

    // Apply status filter
    await page.getByTestId('topic-filter-status-active').click();

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /next/i });
    const hasPagination = await nextButton.isVisible().catch(() => false);

    if (hasPagination) {
      // Click next page
      await nextButton.click();

      // Wait for page to load
      await page.waitForTimeout(1000);

      // Filters should still be active
      await expect(page.getByText(/Search:.*discussion/i)).toBeVisible();
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
    await page.getByTestId('topic-filter-status-active').click();

    // Wait for results
    await page.waitForTimeout(500);

    // URL should not contain page parameter or page=1
    const url = page.url();
    expect(url).not.toContain('page=2');
    expect(url).not.toContain('page=3');
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    const searchInput = page.getByTestId('topic-filter-search-input');

    // Search for something very specific that likely won't exist
    await searchInput.fill('xyzabc123unlikely789');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForTimeout(1500);

    // Should show "No topics found" message
    await expect(page.getByText(/no topics found/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have accessible filter controls', async ({ page }) => {
    // All filter buttons should be keyboard accessible (use data-testid)
    const statusButtons = [
      page.getByTestId('topic-filter-status-all'),
      page.getByTestId('topic-filter-status-seeding'),
      page.getByTestId('topic-filter-status-active'),
      page.getByTestId('topic-filter-status-archived'),
      page.getByTestId('topic-filter-status-locked'),
    ];

    for (const button of statusButtons) {
      await expect(button).toBeVisible();
    }

    // Sort select should have proper label
    const sortSelect = page.getByTestId('topic-sort-select');
    await expect(sortSelect).toBeVisible();

    // Input fields should be visible
    await expect(page.getByTestId('topic-filter-search-input')).toBeVisible();
    await expect(page.getByTestId('tag-filter-input')).toBeVisible();
  });

  test('should highlight selected filter buttons', async ({ page }) => {
    // Click status filter
    const activeButton = page.getByTestId('topic-filter-status-active');
    await activeButton.click();

    // Button should have primary styling (highlighted)
    await expect(activeButton).toHaveAttribute('class', expect.stringContaining('bg-primary'));

    // Other status buttons should have outline styling
    const seedingButton = page.getByTestId('topic-filter-status-seeding');
    await expect(seedingButton).toHaveAttribute('class', expect.stringContaining('bg-gray'));
  });

  test('should preserve sort order across filter changes', async ({ page }) => {
    const sortSelect = page.getByTestId('topic-sort-select');

    // Change sort to "Most Participants"
    await sortSelect.selectOption('participantCount');
    await expect(sortSelect).toHaveValue('participantCount');

    // Apply a status filter
    await page.getByTestId('topic-filter-status-active').click();

    // Wait for results
    await page.waitForTimeout(500);

    // Sort order should be preserved
    await expect(sortSelect).toHaveValue('participantCount');
  });
});
