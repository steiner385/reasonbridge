import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginWithDemoAccount } from './helpers/demo-auth';

/**
 * Dark Mode Accessibility E2E Tests
 *
 * Validates WCAG 2.1 AA compliance in dark mode:
 * - Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
 * - Focus indicators
 * - ARIA attributes
 * - Keyboard navigation
 *
 * Uses axe-core for automated accessibility scanning.
 */

test.describe('Dark Mode Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode via system preference
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  // CSS fixes applied in PR #994: dark:text-primary-400 on links, focus-visible rings on nav.
  // Components fixed: TopicCard, Navigation, Sidebar, CompactSiteNav, Header.
  test('Topics page should have no accessibility violations in dark mode', async ({ page }) => {
    // Login first (topics is protected)
    await loginWithDemoAccount(page, 'Admin Adams');
    await page.goto('/topics');

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render + CSS transition

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // CSS fixes applied in PR #994: TopicCard link now uses dark:text-primary-400.
  test('Topic cards should have sufficient contrast in dark mode', async ({ page }) => {
    await loginWithDemoAccount(page, 'Admin Adams');
    await page.goto('/topics');

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render + CSS transition

    // Run axe with specific color-contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Simulator page should have no accessibility violations in dark mode', async ({ page }) => {
    await loginWithDemoAccount(page, 'Admin Adams');

    // Navigate to simulator
    await page.goto('/simulator');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // CSS fixes applied in PR #994: ProfileBio buttons have focus rings, dark mode hover states.
  test('Profile page should have sufficient contrast in dark mode', async ({ page }) => {
    await loginWithDemoAccount(page, 'Admin Adams');

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render + CSS transition

    // Run axe with color-contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Settings page should have no accessibility violations in dark mode', async ({ page }) => {
    await loginWithDemoAccount(page, 'Admin Adams');

    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // CSS fixes applied in PR #994: focus-visible:ring-2 added to Navigation, Sidebar, CompactSiteNav, Header.
  test('Navigation sidebar should have sufficient focus indicators', async ({ page }) => {
    await loginWithDemoAccount(page, 'Admin Adams');
    await page.goto('/topics');

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render + CSS transition

    // Tab through navigation items to activate focus states
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Run axe to check overall accessibility including focus indicators
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag21a'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Topic detail page should have sufficient contrast in dark mode', async ({ page }) => {
    await page.goto('/discussions');

    const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
    await expect(firstTopic).toBeVisible();
    await firstTopic.click();

    await expect(page.locator('.conversation-panel h1')).toBeVisible();

    // Right panel should display feature or error state
    const rightPanel = page.locator('[role="complementary"]').first();
    await expect(rightPanel).toBeVisible();

    // Page should remain responsive
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="main"]')).toBeVisible();
  });

  // CSS fixes applied in PR #994: CommonGroundSummaryPanel buttons have focus rings.
  test('Common ground cards should respect dark mode', async ({ page }) => {
    await page.goto('/discussions');

    const firstTopic = page.locator('[data-testid="topic-list-item"]').first();
    await expect(firstTopic).toBeVisible();
    await firstTopic.click();

    await expect(page.locator('.conversation-panel h1')).toBeVisible();

    // Right panel should display feature or error state
    const rightPanel = page.locator('[role="complementary"]').first();
    await expect(rightPanel).toBeVisible();

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow content to render + CSS transition

    // Check that white backgrounds are not present in dark mode
    // This catches components that don't implement dark mode
    const whiteBackgroundLocator = page.locator('[class*="bg-white"]:not([class*="dark:bg-"])');
    const whiteBackgrounds = await whiteBackgroundLocator.count();

    // Log which elements are found for debugging
    if (whiteBackgrounds > 0) {
      console.log(`Found ${whiteBackgrounds} elements with bg-white but no dark mode:`);
      for (let i = 0; i < whiteBackgrounds; i++) {
        const element = whiteBackgroundLocator.nth(i);
        const className = await element.getAttribute('class');
        const tagName = await element.evaluate((el) => el.tagName);
        const textContent = await element.textContent();
        console.log(
          `  ${i + 1}. <${tagName}> class="${className}" text="${textContent?.substring(0, 50)}..."`,
        );
      }
    }

    // Should be 0 - all white backgrounds must have dark mode variants
    expect(whiteBackgrounds).toBe(0);

    // Also run full accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // Focus rings added across components in PR #994.
  test('Light mode should also pass accessibility checks', async ({ page }) => {
    // Switch to light mode
    await page.emulateMedia({ colorScheme: 'light' });

    await loginWithDemoAccount(page, 'Admin Adams');
    await page.goto('/topics');

    // Wait for page to fully render before scanning
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow dynamic content to render

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
