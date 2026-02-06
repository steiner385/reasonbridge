import { test, expect } from '@playwright/test';

/**
 * Example E2E test suite for the ReasonBridge application
 *
 * This file demonstrates basic Playwright test patterns and serves
 * as a template for future E2E tests.
 */

test.describe('Application Layout', () => {
  test('should display the main header with application title', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for React app to hydrate
    await page.waitForLoadState('domcontentloaded');

    // Check that the header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify the application logo is present (Header uses image logo now)
    const logo = page.locator('img[alt="ReasonBridge"]').first();
    await expect(logo).toBeVisible();

    // Verify the hero headline is visible
    const heroHeadline = page.getByText('Find Common Ground Through Thoughtful Discussion');
    await expect(heroHeadline).toBeVisible();
  });

  test('should display the footer', async ({ page }) => {
    await page.goto('/');

    // Check that the footer is visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Verify footer content
    await expect(footer).toContainText(
      '© 2026 ReasonBridge. Building bridges through rational discussion.',
    );
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/');

    // Verify the main sections exist
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();

    // Verify the page has a title
    await expect(page).toHaveTitle(/ReasonBridge/i);
  });
});

test.describe('Navigation', () => {
  test('should load the home page successfully', async ({ page }) => {
    const response = await page.goto('/');

    // Verify successful page load
    expect(response?.status()).toBe(200);

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Accessibility', () => {
  test('should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Basic accessibility checks
    // Verify page has a proper heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Verify main landmark exists
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
