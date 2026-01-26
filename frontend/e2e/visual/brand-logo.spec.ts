import { test, expect } from '@playwright/test';

test.describe('Brand Identity - Logo Display', () => {
  test('ReasonBridge logo displays correctly in header', async ({ page }) => {
    await page.goto('/');

    // Verify header logo exists and uses ReasonBridge branding
    const headerLogo = page.locator('header img[alt*="ReasonBridge"]').first();
    await expect(headerLogo).toBeVisible();

    // Verify logo source uses reasonbridge-logo
    const logoSrc = await headerLogo.getAttribute('src');
    expect(logoSrc).toMatch(/reasonbridge-logo/);

    // Visual snapshot of header with logo
    await expect(page.locator('header')).toHaveScreenshot('header-with-logo.png');
  });

  test('Favicon uses ReasonBridge icon', async ({ page }) => {
    await page.goto('/');

    // Check that favicon link exists in head
    const faviconLink = page.locator('link[rel="icon"]').first();
    await expect(faviconLink).toHaveAttribute('href', /reasonbridge-icon/);
  });
});
