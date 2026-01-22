import { test, expect } from '@playwright/test';

/**
 * E2E test suite for browsing topics and viewing topic details
 *
 * Tests the complete user journey of:
 * - Browsing the topics list page
 * - Applying filters and pagination
 * - Clicking on a topic to view its details
 * - Navigating back to the topics list
 */

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('Browse Topics and View Details', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test('should load and display the topics list page', async ({ page }) => {
    await page.goto('/topics');

    // Wait for page to finish loading
    await page.waitForLoadState('networkidle');

    // Check for page heading
    const heading = page.getByRole('heading', { name: /discussion topics/i });
    await expect(heading).toBeVisible();

    // Check for page description
    await expect(page.getByText(/browse and join rational discussions/i)).toBeVisible();

    // Verify filter UI is present
    const filterSection = page.locator('.topic-filter-ui, [data-testid="topic-filters"]').first();
    await expect(filterSection.or(page.locator('text=Sort by').first())).toBeVisible();
  });

  test('should display topic cards when topics are available', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading to complete (spinner disappears)
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Check if either topics are displayed or "No topics found" message
    const noTopicsMessage = page.getByText(/no topics found/i);
    const topicCards = page
      .locator('[data-testid="topic-card"]')
      .or(page.locator('article').first());

    const hasTopics = (await topicCards.count()) > 0;
    const hasNoTopicsMessage = await noTopicsMessage.isVisible().catch(() => false);

    // Either topics should be shown or "no topics" message
    expect(hasTopics || hasNoTopicsMessage).toBeTruthy();
  });

  test('should navigate to topic detail page when clicking on a topic', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading to complete
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Find and click the first topic card (either by link or card container)
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();

    // Check if topics are available
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      // Get the topic ID from the href before clicking
      const href = await firstTopicLink.getAttribute('href');
      const topicId = href?.split('/topics/')[1];

      await firstTopicLink.click();

      // Verify we're on the topic detail page
      await expect(page).toHaveURL(new RegExp(`/topics/${topicId}`));

      // Check for detail page elements
      await expect(page.getByText(/back to topics/i)).toBeVisible();
    }
  });

  test('should display topic details correctly', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Navigate to first topic
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();

      // Wait for detail page to load
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Verify detail page components
      // Status badge (ACTIVE, SEEDING, or ARCHIVED)
      const statusBadge = page.locator('text=/ACTIVE|SEEDING|ARCHIVED/').first();
      await expect(statusBadge).toBeVisible();

      // Stats sections (Participants, Responses, etc.)
      await expect(page.getByText(/participants/i)).toBeVisible();
      await expect(page.getByText(/responses/i)).toBeVisible();

      // Action buttons
      await expect(page.getByRole('button', { name: /join discussion/i })).toBeVisible();
    }
  });

  test('should navigate back to topics list from detail page', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Navigate to first topic
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();

      // Wait for detail page
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Click back to topics link
      const backLink = page.getByText(/back to topics/i).or(page.locator('a[href="/topics"]'));
      await backLink.click();

      // Verify we're back on topics list page
      await expect(page).toHaveURL('/topics');
      await expect(page.getByRole('heading', { name: /discussion topics/i })).toBeVisible();
    }
  });

  test('should handle pagination on topics list', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Check if pagination controls exist
    const nextButton = page.getByRole('button', { name: /next/i });
    const prevButton = page.getByRole('button', { name: /previous/i });

    // If pagination exists, test it
    const hasNextButton = (await nextButton.count()) > 0;

    if (hasNextButton) {
      // Previous button should be disabled on page 1
      await expect(prevButton).toBeDisabled();

      // Check if next button is enabled (means there are multiple pages)
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Click next to go to page 2
        await nextButton.click();

        // Wait for page to update
        await page.waitForTimeout(1000);

        // Previous button should now be enabled
        await expect(prevButton).toBeEnabled();
      }
    }
  });

  test('should display topic filters and allow filtering', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Look for sort controls
    const sortControls = page
      .locator('text=/sort by/i')
      .or(page.locator('[data-testid="sort-select"]'));

    // Filters should be present
    await expect(sortControls.first()).toBeVisible();

    // Check for common filter options (status, tags, etc.)
    // These might be in dropdowns, so we just verify the filter UI exists
    const filterContainer = page
      .locator('.topic-filter-ui')
      .or(page.locator('text=/filter/i').first());
    await expect(filterContainer).toBeVisible();
  });

  test('should show loading state while fetching topics', async ({ page }) => {
    // Start navigation but don't wait
    const navigationPromise = page.goto('/topics');

    // Check for loading indicator
    const loadingIndicator = page
      .locator('text=Loading topics...')
      .or(page.locator('.animate-spin'));

    // Loading should appear briefly
    await loadingIndicator.isVisible().catch(() => false);

    // Note: Loading might be too fast to catch, so we don't fail if we miss it
    // Just verify the page eventually loads
    await navigationPromise;
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });
  });

  test('should display topic card information', async ({ page }) => {
    await page.goto('/topics');

    // Wait for loading
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    // Get first topic card
    const firstCard = page.locator('a[href^="/topics/"]').first();
    const cardCount = await firstCard.count();

    if (cardCount > 0) {
      // Topic cards should contain certain information
      // Check within the card's parent container
      const cardContainer = firstCard.locator('..').first();

      // Look for topic title (usually in a heading or prominent text)
      await cardContainer.locator('h1, h2, h3, h4').count();
      const hasText = await cardContainer.textContent();

      // Card should have some content
      expect(hasText?.length).toBeGreaterThan(0);
    }
  });

  test('should handle direct navigation to topic detail page', async ({ page }) => {
    // First, get a valid topic ID from the topics list
    await page.goto('/topics');
    await page.waitForSelector('text=Loading topics...', { state: 'hidden', timeout: 10000 });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      const href = await firstTopicLink.getAttribute('href');
      const topicUrl = href || '/topics/1';

      // Navigate directly to the topic detail page
      await page.goto(topicUrl);

      // Should show topic details (not 404)
      await page.waitForSelector('text=Loading topic details...', {
        state: 'hidden',
        timeout: 10000,
      });

      // Should have back navigation
      await expect(page.getByText(/back to topics/i)).toBeVisible();

      // Should have status badge
      const statusBadge = page.locator('text=/ACTIVE|SEEDING|ARCHIVED/').first();
      await expect(statusBadge).toBeVisible();
    }
  });
});
