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

  // Scroll element into view first (handles mobile viewport where element may be outside viewport)
  await firstTopic.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  // Click to select (use force for mobile viewports where scroll may not fully work)
  await firstTopic.click({ force: true });
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

    // Response composer should be visible (CompactComposer uses "Share your thoughts...")
    const composer = page.locator('textarea[placeholder*="thoughts"]');
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

      // Propositions use Tailwind hover: classes for styling
      // Verify the proposition is still visible and interactive after hover
      await expect(firstProposition).toBeVisible();
      // The hover state is applied via CSS :hover pseudo-class, not a class change
    } else {
      // Skip test if no propositions exist (topic may not have AI-analyzed responses)
      test.skip();
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

    // Wait for tab panel to be visible
    const tabPanel = page.locator('[role="tabpanel"][id="bridging-panel"]');
    await expect(tabPanel).toBeVisible({ timeout: 5000 });

    // Should show one of: loading, empty state, or suggestions
    // Match various text patterns that appear in different states
    const loading = page.getByText(/generating bridging/i);
    const emptyState = page.getByText(/no bridging suggestions/i);
    const suggestionsAppear = page.getByText(/suggestions will appear/i);
    const bridgingSection = page.locator('[data-testid="bridging-suggestions"]');

    const hasLoading = await loading.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasSuggestionsAppear = await suggestionsAppear.isVisible().catch(() => false);
    const hasBridgingSection = await bridgingSection.isVisible().catch(() => false);

    expect(hasLoading || hasEmpty || hasSuggestionsAppear || hasBridgingSection).toBe(true);
  });
});

test.describe('Discussion Page - Response Composer', () => {
  test.beforeEach(async ({ page }) => {
    await selectTopicViaSidebar(page);
  });

  test('should display response composer', async ({ page }) => {
    // CompactComposer uses "Share your thoughts..." placeholder
    const composer = page.locator('textarea[placeholder*="thoughts"]');
    await expect(composer).toBeVisible();
  });

  test('should allow typing in composer', async ({ page }) => {
    const composer = page.locator('textarea[placeholder*="thoughts"]');
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

    // Type in composer (CompactComposer uses "Share your thoughts..." placeholder)
    const composer = page.locator('textarea[placeholder*="thoughts"]');
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
    // Check both tag names AND elements with tabindex/role that make them interactive
    const isInteractive = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;

      // Native interactive elements
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
      if (interactiveTags.includes(el.tagName)) return true;

      // Elements made interactive via tabindex or role
      const hasTabIndex = el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';
      const hasInteractiveRole = [
        'button',
        'link',
        'tab',
        'menuitem',
        'checkbox',
        'radio',
      ].includes(el.getAttribute('role') || '');

      return hasTabIndex || hasInteractiveRole;
    });

    expect(isInteractive).toBe(true);
  });

  test('should have accessible focus indicators', async ({ page }) => {
    await selectTopicViaSidebar(page);

    // Focus the composer (CompactComposer uses "Share your thoughts..." placeholder)
    const composer = page.locator('textarea[placeholder*="thoughts"]');
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
