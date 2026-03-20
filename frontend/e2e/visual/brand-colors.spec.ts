import { test, expect } from '@playwright/test';

test.describe('Brand Identity - Color Palette', () => {
  test('Primary buttons use brand-primary color (Teal)', async ({ page }) => {
    await page.goto('/');

    // Find the primary Login button in header - it has bg-primary-600 class
    // Use a more specific selector to find buttons with the primary background
    const primaryButton = page.locator(
      'header button.bg-primary-600, header button[class*="bg-primary"]',
    );

    if ((await primaryButton.count()) > 0) {
      await expect(primaryButton.first()).toBeVisible();

      // Check that background color is primary-600 (#227e72 = rgb(34, 126, 114))
      await expect(primaryButton.first()).toHaveCSS('background-color', 'rgb(34, 126, 114)');

      // Visual snapshot of primary button
      await expect(primaryButton.first()).toHaveScreenshot('primary-button.png');
    }
  });

  test('Page uses warm white background (#FAFBFC)', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(250, 251, 252)');
  });
});
