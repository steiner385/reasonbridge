/**
 * Example: Using accessibility helpers in E2E tests
 *
 * This demonstrates how to import and use the a11y helpers from
 * tests that live in the e2e/ directory.
 */

import { test } from '@playwright/test';
import { checkAccessibility } from './helpers/accessibility';

test.describe('Accessibility Testing Example', () => {
  test.skip('landing page should pass WCAG 2.2 AA checks', async ({ page }) => {
    await page.goto('/');

    // Run comprehensive accessibility scan
    await checkAccessibility(page, {
      wcagLevel: 'wcag22aa',
    });
  });

  test.skip('check specific component accessibility', async ({ page }) => {
    await page.goto('/');

    // Only check navigation accessibility
    await checkAccessibility(page, {
      include: [['nav'], ['header']],
      wcagLevel: 'wcag22aa',
    });
  });
});
