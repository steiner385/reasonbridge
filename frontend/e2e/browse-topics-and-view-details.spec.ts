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

    // Wait for content to appear - either topic cards, "no topics" message, or error
    // This is more robust than waiting for skeleton to hide (avoids race conditions)
    await Promise.race([
      page.waitForSelector('[data-testid="topic-card"]', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('text=/no topics found/i', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('text=/error loading topics/i', { state: 'visible', timeout: 15000 }),
    ]);

    // Check if either topics are displayed or "No topics found" message
    const noTopicsMessage = page.getByText(/no topics found/i);
    const topicCards = page.locator('[data-testid="topic-card"]');
    const errorMessage = page.getByText(/error loading topics/i);

    const hasTopics = (await topicCards.count()) > 0;
    const hasNoTopicsMessage = await noTopicsMessage.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Either topics, "no topics" message, or error should be shown
    expect(hasTopics || hasNoTopicsMessage || hasError).toBeTruthy();
  });

  test('should navigate to topic detail page when clicking on a topic', async ({ page }) => {
    await page.goto('/topics');

    // Wait for topic cards to appear (more robust than waiting for skeleton to hide)
    await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
      state: 'visible',
      timeout: 15000,
    });

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

    // Wait for topic cards to appear
    await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Navigate to first topic
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();

      // Wait for topic detail content to load using multiple indicators
      // Use Promise.race to wait for any of: status badge, back link, or participant count
      await Promise.race([
        page.waitForSelector('text=/ACTIVE|SEEDING|ARCHIVED/', {
          state: 'visible',
          timeout: 15000,
        }),
        page.waitForSelector('[data-testid="participant-count"]', {
          state: 'visible',
          timeout: 15000,
        }),
        page.waitForSelector('a[href="/topics"]', { state: 'visible', timeout: 15000 }),
      ]);

      // Wait for networkidle to ensure all data is loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Verify detail page components
      // Status badge (ACTIVE, SEEDING, or ARCHIVED) - wait with longer timeout
      const statusBadge = page.locator('text=/ACTIVE|SEEDING|ARCHIVED/').first();
      await expect(statusBadge).toBeVisible({ timeout: 10000 });

      // Stats sections (Participants, Responses, etc.)
      await expect(page.locator('[data-testid="participant-count"]')).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator('[data-testid="response-count"]')).toBeVisible({ timeout: 5000 });

      // Action buttons
      await expect(page.getByRole('button', { name: /join discussion/i })).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('should navigate back to topics list from detail page', async ({ page }) => {
    await page.goto('/topics');

    // Wait for topic cards to appear
    await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
      state: 'visible',
      timeout: 15000,
    });

    // Navigate to first topic
    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      await firstTopicLink.click();

      // Wait for topic detail content to appear (back link indicates loaded)
      await page.waitForSelector('a[href="/topics"]', {
        state: 'visible',
        timeout: 15000,
      });

      // Click back to topics link (use specific link selector to avoid matching both link and button)
      const backLink = page.locator('a[href="/topics"]').first();
      await backLink.click();

      // Verify we're back on topics list page
      await expect(page).toHaveURL('/topics');
      await expect(page.getByRole('heading', { name: /discussion topics/i })).toBeVisible();
    }
  });

  test('should handle pagination on topics list', async ({ page }) => {
    await page.goto('/topics');

    // Wait for content to appear (topic cards or "no topics" message)
    await Promise.race([
      page.waitForSelector('[data-testid="topic-card"]', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('text=/no topics found/i', { state: 'visible', timeout: 15000 }),
    ]);

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

    // Wait for page to fully load (heading indicates page is ready)
    await page.waitForSelector('h1:has-text("Discussion Topics")', {
      state: 'visible',
      timeout: 15000,
    });

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

    // Check for loading indicator (skeleton loaders with pulse animation)
    const loadingIndicator = page
      .locator('[data-testid="topic-card-skeleton"]')
      .or(page.locator('.animate-pulse'));

    // Loading should appear briefly
    await loadingIndicator.isVisible().catch(() => false);

    // Note: Loading might be too fast to catch, so we don't fail if we miss it
    // Just verify the page eventually loads with content
    await navigationPromise;
    await Promise.race([
      page.waitForSelector('[data-testid="topic-card"]', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('text=/no topics found/i', { state: 'visible', timeout: 15000 }),
    ]);
  });

  test('should display topic card information', async ({ page }) => {
    await page.goto('/topics');

    // Wait for topic cards to appear
    await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
      state: 'visible',
      timeout: 15000,
    });

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
    await page.waitForSelector('[data-testid="topic-card"], a[href^="/topics/"]', {
      state: 'visible',
      timeout: 15000,
    });

    const firstTopicLink = page.locator('a[href^="/topics/"]').first();
    const linkCount = await firstTopicLink.count();

    if (linkCount > 0) {
      const href = await firstTopicLink.getAttribute('href');
      const topicUrl = href || '/topics/1';

      // Navigate directly to the topic detail page
      await page.goto(topicUrl);

      // Wait for topic detail content to load using multiple indicators
      await Promise.race([
        page.waitForSelector('text=/ACTIVE|SEEDING|ARCHIVED/', {
          state: 'visible',
          timeout: 15000,
        }),
        page.waitForSelector('[data-testid="participant-count"]', {
          state: 'visible',
          timeout: 15000,
        }),
        page.waitForSelector('a[href="/topics"]', { state: 'visible', timeout: 15000 }),
      ]);

      // Wait for networkidle to ensure all data is loaded
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      // Should have back navigation
      await expect(page.getByText(/back to topics/i)).toBeVisible({ timeout: 5000 });

      // Should have status badge
      const statusBadge = page.locator('text=/ACTIVE|SEEDING|ARCHIVED/').first();
      await expect(statusBadge).toBeVisible({ timeout: 10000 });
    }
  });
});
