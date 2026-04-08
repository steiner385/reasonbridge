import { test, expect } from '@playwright/test';

/**
 * E2E tests for Discussion Page with 2-Panel Layout
 *
 * Tests the discussion page functionality with:
 * - Topic selection via global Sidebar
 * - 2-panel layout (center: conversation, right: metadata)
 * - Metadata panel features (propositions, common ground, bridging)
 * - Responsive behavior
 * - Keyboard accessibility
 *
 * Note: Topic navigation is handled by the global Sidebar component,
 * not within the DiscussionLayout (hideSidebar=true).
 */

// Helper to select a topic via the Sidebar
async function selectTopicViaSidebar(page: import('@playwright/test').Page) {
  await page.goto('/discussions');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Wait for Sidebar to load topic list
  const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
  await expect(firstTopic).toBeVisible({ timeout: 15000 });

  // Click to select
  await firstTopic.click();
  await expect(page).toHaveURL(/\?topic=/);

  // Wait for conversation panel to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await expect(page.locator('.conversation-panel h1[data-testid="topic-title"]')).toBeVisible({
    timeout: 10000,
  });
}

test.describe('Discussion Page - 2-Panel Layout', () => {
  test('should display 2-panel layout when topic is selected', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Verify 2-panel layout (center + right)
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="complementary"]').first()).toBeVisible();
  });

  test('should display conversation panel with topic details', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Topic title should be visible in center panel
    const conversationPanel = page.locator('.conversation-panel');
    await expect(conversationPanel.locator('h1[data-testid="topic-title"]')).toBeVisible();

    // Response composer should be visible
    const composer = page.locator('textarea[placeholder*="perspective"]');
    await expect(composer).toBeVisible();
  });

  test('should display metadata panel with tabs', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Right panel should show metadata with tabs
    const rightPanel = page.locator('[role="complementary"]').first();
    await expect(rightPanel).toBeVisible();

    const tablist = rightPanel.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Verify tabs exist
    await expect(page.getByRole('tab', { name: /propositions/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /common ground/i })).toBeVisible();
  });
});

test.describe('Discussion Page - Propositions and Highlighting', () => {
  test.beforeEach(async ({ page }) => {
    await selectTopicViaSidebar(page);
  });

  test('should display propositions tab by default', async ({ page }) => {
    const propositionsTab = page.getByRole('tab', { name: /propositions/i });
    await expect(propositionsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should switch between metadata tabs', async ({ page }) => {
    // Click Common Ground tab
    const commonGroundTab = page.getByRole('tab', { name: /common ground/i });
    await commonGroundTab.click();
    await expect(commonGroundTab).toHaveAttribute('aria-selected', 'true');

    // Click Propositions tab back
    const propositionsTab = page.getByRole('tab', { name: /propositions/i });
    await propositionsTab.click();
    await expect(propositionsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should highlight proposition on hover', async ({ page }) => {
    // Wait for propositions to load (may take time for AI analysis)
    const propositions = page.locator('[data-proposition-id]');

    // Check if propositions exist (depends on topic having responses)
    const count = await propositions.count();
    if (count > 0) {
      const firstProposition = propositions.first();
      await firstProposition.hover();

      // Proposition should show visual highlight
      await expect(firstProposition).toHaveClass(/hover/);
    }
  });
});

test.describe('Discussion Page - Common Ground', () => {
  test.beforeEach(async ({ page }) => {
    await selectTopicViaSidebar(page);
  });

  test('should display Common Ground tab', async ({ page }) => {
    const commonGroundTab = page.getByRole('tab', { name: /common ground/i });
    await expect(commonGroundTab).toBeVisible();
  });

  test('should switch to Common Ground tab', async ({ page }) => {
    const commonGroundTab = page.getByRole('tab', { name: /common ground/i });
    await commonGroundTab.click();

    await expect(commonGroundTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display common ground analysis or loading state', async ({ page }) => {
    const commonGroundTab = page.getByRole('tab', { name: /common ground/i });
    await commonGroundTab.click();

    // Should show one of: loading, empty state, or analysis
    const loading = page.getByText(/analyzing/i);
    const emptyState = page.getByText(/no common ground/i);
    const consensus = page.getByText(/consensus/i);

    const hasLoading = await loading.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasConsensus = await consensus.isVisible().catch(() => false);

    expect(hasLoading || hasEmpty || hasConsensus).toBe(true);
  });
});

test.describe('Discussion Page - Bridging Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await selectTopicViaSidebar(page);
  });

  test('should display Bridging tab', async ({ page }) => {
    const bridgingTab = page.getByRole('tab', { name: /bridging/i });
    await expect(bridgingTab).toBeVisible();
  });

  test('should switch to Bridging tab', async ({ page }) => {
    const bridgingTab = page.getByRole('tab', { name: /bridging/i });
    await bridgingTab.click();

    await expect(bridgingTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display bridging suggestions or loading state', async ({ page }) => {
    const bridgingTab = page.getByRole('tab', { name: /bridging/i });
    await bridgingTab.click();

    // Should show one of: loading, empty state, or suggestions
    const loading = page.getByText(/generating/i);
    const emptyState = page.getByText(/no bridging/i);
    const suggestions = page.getByText(/suggestion/i);

    const hasLoading = await loading.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasSuggestions = await suggestions.isVisible().catch(() => false);

    expect(hasLoading || hasEmpty || hasSuggestions).toBe(true);
  });
});

test.describe('Discussion Page - Response Composer', () => {
  test.beforeEach(async ({ page }) => {
    await selectTopicViaSidebar(page);
  });

  test('should display response composer', async ({ page }) => {
    const composer = page.locator('textarea[placeholder*="perspective"]');
    await expect(composer).toBeVisible();
  });

  test('should allow typing in composer', async ({ page }) => {
    const composer = page.locator('textarea[placeholder*="perspective"]');
    await composer.fill('This is a test response.');
    await expect(composer).toHaveValue('This is a test response.');
  });
});

test.describe('Discussion Page - Tablet Layout', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
  });

  test('should display sidebar toggle on tablet', async ({ page }) => {
    await page.goto('/discussions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // On tablet, sidebar may be collapsed - look for toggle button
    const sidebarToggle = page.locator(
      'button[aria-label*="sidebar"], button[aria-label*="menu"], button[aria-label*="navigation"]',
    );

    // Either sidebar is visible or toggle exists
    const sidebar = page.locator('aside[aria-label*="navigation"], aside[aria-label*="sidebar"]');
    const hasSidebar = await sidebar.isVisible().catch(() => false);
    const hasToggle = (await sidebarToggle.count()) > 0;

    expect(hasSidebar || hasToggle).toBe(true);
  });

  test('should show 2-panel layout with topic selected on tablet', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Center and right panels should be visible
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[role="complementary"]').first()).toBeVisible();
  });
});

test.describe('Discussion Page - Mobile Layout', () => {
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test('should show mobile layout with topic selected', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Conversation panel should be visible
    const conversationPanel = page.locator('.conversation-panel');
    await expect(conversationPanel).toBeVisible();

    // On mobile, metadata may be in accordion or hidden
    // Just verify the main content is accessible
    await expect(conversationPanel.locator('h1[data-testid="topic-title"]')).toBeVisible();
  });

  test('should have touch-friendly tap targets (44px minimum)', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Check any visible button has minimum 44px dimensions
    const buttons = page.locator('button:visible').first();

    if ((await buttons.count()) > 0) {
      const box = await buttons.boundingBox();
      if (box) {
        // WCAG 2.1 AA requires 44px minimum touch targets
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Discussion Page - Unsaved Changes', () => {
  test('should track unsaved changes in composer', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Type in composer
    const composer = page.locator('textarea[placeholder*="perspective"]');
    await composer.fill('This is unsaved content that should be preserved.');

    // Verify content is in the composer
    await expect(composer).toHaveValue('This is unsaved content that should be preserved.');
  });
});

test.describe('Discussion Page - Keyboard Navigation', () => {
  test('should support Escape key functionality', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Page should still be functional (no crash)
    const conversationPanel = page.locator('.conversation-panel');
    await expect(conversationPanel).toBeVisible();
  });

  test('should support Tab navigation through elements', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Press Tab several times
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is on an interactive element
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'TAB'];

    expect(interactiveTags.includes(focusedTag || '')).toBe(true);
  });

  test('should have accessible focus indicators', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Focus the composer
    const composer = page.locator('textarea[placeholder*="perspective"]');
    await composer.focus();

    // Composer should have visible focus ring
    const hasFocusStyles = await composer.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      // Check for focus ring (outline or box-shadow)
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    expect(hasFocusStyles).toBe(true);
  });
});

test.describe('Discussion Page - Virtual Scrolling', () => {
  test('should handle response list scrolling', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Wait for response list or empty state
    const responseList = page.locator('[data-testid="response-item"]');
    const emptyState = page.getByText(/no responses/i);

    const hasResponses = (await responseList.count()) > 0;
    const isEmpty = await emptyState.isVisible().catch(() => false);

    // Either should be visible
    expect(hasResponses || isEmpty).toBe(true);

    if (hasResponses) {
      // Scroll within conversation panel
      const conversationPanel = page.locator('.conversation-panel');
      await conversationPanel.evaluate((el) => {
        const scrollable = el.querySelector('[class*="overflow"]');
        if (scrollable) {
          scrollable.scrollTop = 200;
        }
      });

      // Verify page is still functional after scroll
      await expect(conversationPanel).toBeVisible();
    }
  });
});
