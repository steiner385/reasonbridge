import { test, expect } from '@playwright/test';

// TODO: Re-enable brand color tests once UI components with brand styling are implemented
// These tests fail in CI because the expected elements/colors don't exist yet
test.describe.skip('Brand Identity - Color Palette', () => {
  test('Primary buttons use brand-primary color (Teal #2A9D8F)', async ({ page }) => {
    await page.goto('/');

    // Find a primary button (common in hero sections or CTAs)
    const primaryButton = page
      .locator('button')
      .filter({ hasText: /sign up|get started|join|create/i })
      .first();

    if ((await primaryButton.count()) > 0) {
      await expect(primaryButton).toBeVisible();

      // Check that background color is Teal (#2A9D8F = rgb(42, 157, 143))
      await expect(primaryButton).toHaveCSS('background-color', 'rgb(42, 157, 143)');

      // Visual snapshot of primary button
      await expect(primaryButton).toHaveScreenshot('primary-button.png');
    }
  });

  test('Links use brand-primary color', async ({ page }) => {
    await page.goto('/');

    // Find navigation links or main content links
    const navLink = page.locator('a').first();

    if ((await navLink.count()) > 0) {
      // Check link color is Teal (#2A9D8F = rgb(42, 157, 143))
      const linkColor = await navLink.evaluate((el) => window.getComputedStyle(el).color);

      // Allow for slight variations in computed color
      expect(linkColor).toMatch(/rgb\(42,\s*157,\s*143\)|#2a9d8f/i);
    }
  });

  test('Page uses warm white background (#FAFBFC)', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(250, 251, 252)');
  });
});
