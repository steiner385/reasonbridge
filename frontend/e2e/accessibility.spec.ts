import { test, expect } from '@playwright/test';
import {
  checkAccessibility,
  checkCriticalAccessibility,
  scanAccessibility,
  getAccessibilityStats,
  WCAG_22_AA_TAGS,
} from './helpers/accessibility';

/**
 * Accessibility tests for reasonBridge using axe-core with WCAG 2.2 AA compliance.
 *
 * These tests verify that key pages meet accessibility standards.
 * The accessibility utilities are configured to check against:
 * - WCAG 2.0 Level A and AA
 * - WCAG 2.1 Level A and AA
 * - WCAG 2.2 Level AA
 */

test.describe('Accessibility - WCAG 2.2 AA Compliance', () => {
  test('accessibility utilities are configured for WCAG 2.2 AA', () => {
    // Verify the WCAG tags include all required standards
    expect(WCAG_22_AA_TAGS).toContain('wcag2a');
    expect(WCAG_22_AA_TAGS).toContain('wcag2aa');
    expect(WCAG_22_AA_TAGS).toContain('wcag21a');
    expect(WCAG_22_AA_TAGS).toContain('wcag21aa');
    expect(WCAG_22_AA_TAGS).toContain('wcag22aa');
  });

  test('home page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for critical/serious violations (minor ones logged but don't fail)
    await checkCriticalAccessibility(page);
  });

  test('login modal has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Open login modal
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Check for critical/serious violations
    await checkCriticalAccessibility(page);
  });

  test('registration page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/register');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for critical/serious violations
    await checkCriticalAccessibility(page);
  });

  test('can scan and retrieve accessibility statistics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const stats = await getAccessibilityStats(page);

    // Verify stats structure
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('critical');
    expect(stats).toHaveProperty('serious');
    expect(stats).toHaveProperty('moderate');
    expect(stats).toHaveProperty('minor');
    expect(stats).toHaveProperty('violations');
    expect(Array.isArray(stats.violations)).toBe(true);
  });

  test('can scan specific page regions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scan only the main content area if it exists
    const mainExists = await page.locator('main').count();
    if (mainExists > 0) {
      const results = await scanAccessibility(page, {
        include: ['main'],
      });

      // Verify scan completed and returned results
      expect(results).toHaveProperty('violations');
      expect(results).toHaveProperty('violationCount');
      expect(results).toHaveProperty('passes');
    }
  });

  test('can exclude third-party components from scan', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Example: exclude a hypothetical third-party widget
    const results = await scanAccessibility(page, {
      exclude: ['.third-party-widget', '[data-external]'],
    });

    // Verify scan completed
    expect(results).toHaveProperty('violationCount');
  });
});

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('Accessibility - Page-Specific Checks', () => {
  test.describe('Topics Page', () => {
    // Skip when backend is not available - topics page requires API data
    test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

    test('topics list page has no critical accessibility violations', async ({ page }) => {
      await page.goto('/topics');
      await page.waitForLoadState('networkidle');

      await checkCriticalAccessibility(page);
    });
  });

  test.describe('Interactive Elements', () => {
    test('modal dialogs are accessible when opened', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Open login modal
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Verify the modal is accessible
      await checkCriticalAccessibility(page);
    });
  });
});
