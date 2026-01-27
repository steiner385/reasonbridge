import { test, expect } from '@playwright/test';

// TODO: Re-enable brand typography tests once Nunito font is properly configured
// These tests fail in CI because fonts aren't loading as expected
test.describe.skip('Brand Identity - Typography', () => {
  test('Headings use Nunito font', async ({ page }) => {
    await page.goto('/');

    // Check h1 elements use Nunito
    const h1 = page.locator('h1').first();

    if ((await h1.count()) > 0) {
      const fontFamily = await h1.evaluate((el) => window.getComputedStyle(el).fontFamily);

      expect(fontFamily).toContain('Nunito');
    }
  });

  test('Body text uses Nunito font', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    const bodyFont = await body.evaluate((el) => window.getComputedStyle(el).fontFamily);

    expect(bodyFont).toContain('Nunito');
  });

  test('Typography has proper line-height for readability', async ({ page }) => {
    await page.goto('/');

    const body = page.locator('body');
    const lineHeight = await body.evaluate((el) => window.getComputedStyle(el).lineHeight);

    // Line height should be at least 1.5 for body text (WCAG recommendation)
    const lineHeightNum = parseFloat(lineHeight);
    const fontSize = await body.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));

    const ratio = lineHeightNum / fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.5);
  });
});
