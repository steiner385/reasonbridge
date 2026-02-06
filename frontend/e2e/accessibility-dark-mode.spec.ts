import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

  test('Topics page should have no accessibility violations in dark mode', async ({ page }) => {
    // Login first (topics is protected)
    await page.goto('/');
    await page.click('button:has-text("Log In")');

    // Select demo account (auto-fills credentials)
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Wait for navigation to topics
    await page.waitForURL('/topics?welcome=true');

    // Wait for network requests to complete and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Topic cards should have sufficient contrast in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    await page.waitForURL('/topics?welcome=true');

    // Wait for network requests to complete and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

    // Run axe with specific color-contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Simulator page should have no accessibility violations in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Navigate to simulator
    await page.goto('/simulator');

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Profile page should have sufficient contrast in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Navigate to profile
    await page.goto('/profile');

    // Wait for network requests to complete and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

    // Run axe with color-contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Settings page should have no accessibility violations in dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Navigate to settings
    await page.goto('/settings');

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Navigation sidebar should have sufficient focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    await page.waitForURL('/topics?welcome=true');

    // Wait for network requests to complete and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

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
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Navigate directly to a mock topic detail page
    // Using UUID from mock data (common in E2E tests)
    await page.goto('/topics/11111111-0000-4000-8000-000000000109');

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

    // Run axe with color-contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Common ground cards should respect dark mode', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Log In")');
    await page.click('button:has-text("Admin Adams")');

    // Submit login form
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Navigate to topic detail page with common ground analysis
    await page.goto('/topics/11111111-0000-4000-8000-000000000109');

    // Wait for page to load and theme to fully apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300); // Allow 200ms CSS transition + buffer

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

  test('Light mode should also pass accessibility checks', async ({ page }) => {
    // Switch to light mode
    await page.emulateMedia({ colorScheme: 'light' });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open login modal
    await page.click('button:has-text("Log In")');

    // Wait for dialog to be visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select demo user
    await page.click('button:has-text("Admin Adams")');
    await page.waitForTimeout(300); // Allow form to update

    // Submit login form
    await dialog.getByRole('button', { name: /^log in$/i }).click();

    // Wait for redirect to topics page
    await page.waitForURL('/topics?welcome=true', { timeout: 10000 });

    // Wait for page to fully render before scanning
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Allow dynamic content to render

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
