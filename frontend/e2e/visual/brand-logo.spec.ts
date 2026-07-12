import { test, expect } from '@playwright/test';

test.describe('Brand Identity - Logo Display', () => {
  test('ReasonBridge logo displays correctly in header', async ({ page }) => {
    await page.goto('/');

    // Verify header logo exists and uses ReasonBridge branding
    const headerLogo = page.locator('header img[alt*="ReasonBridge"]').first();
    await expect(headerLogo).toBeVisible();

    // Verify logo source uses brand logo assets
    const logoSrc = await headerLogo.getAttribute('src');
    expect(logoSrc).toMatch(/logo-(icon|full)\.svg/);

    // Visual snapshot of header with logo. Font antialiasing differs slightly
    // across Linux environments (dev machines vs CI runners), so allow a small
    // pixel tolerance — a missing or wrong logo diffs far beyond 2%.
    await expect(page.locator('header')).toHaveScreenshot('header-with-logo.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Favicon uses ReasonBridge icon', async ({ page }) => {
    await page.goto('/');

    // Check that favicon link exists in head
    const faviconLink = page.locator('link[rel="icon"]').first();
    await expect(faviconLink).toHaveAttribute('href', /favicon/);
  });
});
