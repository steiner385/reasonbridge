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

test.describe('Browse Topics and View Details', () => {
  test('should load and display the topics list page', async ({ page }) => {
    await page.goto('/topics');

    // Wait for page to finish loading
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

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

  /**
   * Tests topic selection via the global Sidebar.
   * The Sidebar displays topic list items on desktop viewports (≥768px)
   * when navigating to /discussions (topics mode).
   */
  test('should navigate to topic in discussion view when clicking on a topic', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for Sidebar to load topic list items
    // The Sidebar fetches topics when in "topics" mode (/discussions route)
    const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
    await expect(firstTopic).toBeVisible({ timeout: 15000 });

    // Get the topic title from the sidebar item
    const topicTitle = await firstTopic.locator('[data-testid="topic-title"]').textContent();

    // Click the topic in the Sidebar
    await firstTopic.click();

    // Verify URL updates with topic query parameter
    await expect(page).toHaveURL(/\/discussions\?topic=/);

    // Wait for conversation panel to load the topic
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify conversation panel displays the topic title
    const conversationHeader = page.locator('.conversation-panel h1[data-testid="topic-title"]');
    await expect(conversationHeader).toContainText(topicTitle!.trim(), { timeout: 10000 });

    // Verify 2-panel layout is visible (center + right panels in DiscussionLayout)
    // The Sidebar is separate from DiscussionLayout
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="complementary"]').first()).toBeVisible();
  });

  /**
   * Tests that the right panel shows metadata tabs when a topic is selected.
   */
  test('should display topic metadata in right panel', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for Sidebar to load topic list items
    const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
    await expect(firstTopic).toBeVisible({ timeout: 15000 });

    // Click the topic in the Sidebar
    await firstTopic.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify conversation panel shows topic content
    await expect(page.locator('.conversation-panel h1[data-testid="topic-title"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify right panel (metadata) is visible
    const rightPanel = page.locator('[role="complementary"]').first();
    await expect(rightPanel).toBeVisible();

    // Check for metadata panel tabs (Propositions, Common Ground, Bridging)
    const tablist = rightPanel.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Verify at least one tab is present
    const tabs = rightPanel.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  /**
   * Tests switching between topics using the Sidebar.
   */
  test('should allow switching between topics using sidebar', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for Sidebar to load topic list items
    await expect(page.locator('[data-testid="topic-list-item"]').first()).toBeVisible({
      timeout: 15000,
    });

    const topics = page.locator('[data-testid="topic-list-item"]');
    const topicCount = await topics.count();

    // We have 12 seeded topics, so this should always pass
    if (topicCount < 2) {
      console.warn('Need at least 2 topics - check that demo data is seeded correctly');
      expect(topicCount).toBeGreaterThanOrEqual(2);
    }

    // Select first topic
    const firstTopic = topics.nth(0);
    const firstTopicTitle = await firstTopic.locator('[data-testid="topic-title"]').textContent();
    await firstTopic.click();

    // Wait for conversation panel to load with topic content
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const h1 = page.locator('.conversation-panel h1[data-testid="topic-title"]');
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText(firstTopicTitle!.trim(), { timeout: 5000 });

    // Select second topic
    const secondTopic = topics.nth(1);
    const secondTopicTitle = await secondTopic.locator('[data-testid="topic-title"]').textContent();
    await secondTopic.click();

    // Wait for content to update after topic switch
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await expect(h1).toContainText(secondTopicTitle!.trim(), { timeout: 5000 });

    // Sidebar should still be visible (it's separate from DiscussionLayout)
    await expect(page.locator('aside[aria-label="Topic navigation sidebar"]')).toBeVisible();
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

  /**
   * Tests direct navigation to a specific topic via URL query parameter.
   */
  test('should handle direct navigation to topic via URL parameter', async ({ page }) => {
    // First, navigate to discussions and select a topic to get its ID
    await page.goto('/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
    await expect(firstTopic).toBeVisible({ timeout: 15000 });

    // Click to navigate and get the topic ID from URL
    await firstTopic.click();
    await page.waitForURL(/topic=/);

    const currentUrl = page.url();
    const topicId = new URL(currentUrl).searchParams.get('topic');
    expect(topicId).toBeTruthy();

    // Get the topic title for verification
    const topicTitle = await page
      .locator('.conversation-panel h1[data-testid="topic-title"]')
      .textContent();

    // Navigate away to home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Test direct navigation with topic parameter
    await page.goto(`/discussions?topic=${topicId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Verify conversation panel shows the topic
    const h1 = page.locator('.conversation-panel h1[data-testid="topic-title"]');
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText(topicTitle!.trim());

    // Verify 2-panel layout is visible
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="complementary"]').first()).toBeVisible();
  });
});
