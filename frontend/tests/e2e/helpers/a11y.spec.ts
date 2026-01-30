/**
 * Example tests demonstrating accessibility helper usage
 *
 * These tests show how to use the a11y helpers in E2E tests.
 * Copy these patterns to your own E2E test files.
 */

import { test, expect } from '@playwright/test';
import { checkA11y, testKeyboardNavigation } from './a11y';

test.describe('Accessibility Helper Examples', () => {
  test('basic WCAG 2.2 AA check on landing page', async ({ page }) => {
    await page.goto('/');

    // Run accessibility scan
    await checkA11y(page);

    // If this passes, the page has no WCAG 2.2 AA violations!
  });

  test('check accessibility of specific component', async ({ page }) => {
    await page.goto('/');

    // Only check a specific part of the page
    await checkA11y(page, {
      include: [['header'], ['main']],
      exclude: [['footer']], // Example: skip footer if it has known issues
    });
  });

  test('keyboard navigation through main interactive elements', async ({ page }) => {
    await page.goto('/');

    // Verify Tab navigation works correctly
    await testKeyboardNavigation(page, {
      startSelector: 'main',
      expectedFocusableElements: ['a[href="/signup"]', 'button:has-text("See How It Works")'],
    });
  });

  test('accessibility check with custom WCAG level', async ({ page }) => {
    await page.goto('/');

    // Test against WCAG 2.1 AA instead of 2.2 AA
    await checkA11y(page, {
      wcagLevel: 'wcag21aa',
    });
  });

  test('accessibility check that allows violations (for gradual improvement)', async ({ page }) => {
    await page.goto('/some-legacy-page');

    // Run scan but don't fail the test - just report violations
    await checkA11y(page, {
      failOnViolations: false,
    });

    // Continue with functional tests even if a11y violations exist
    await expect(page.getByRole('heading')).toBeVisible();
  });
});

test.describe('Usage Patterns for Different Page Types', () => {
  test.skip('form accessibility', async ({ page }) => {
    // Example pattern for testing forms
    await page.goto('/signup');

    await checkA11y(page, {
      include: [['form']],
    });

    // Also test keyboard-only form submission
    await page.keyboard.press('Tab'); // Focus first field
    await page.keyboard.type('user@example.com');
    await page.keyboard.press('Tab'); // Focus next field
    await page.keyboard.type('SecurePassword123!');
    await page.keyboard.press('Enter'); // Submit form

    await expect(page).toHaveURL(/dashboard/);
  });

  test.skip('modal/dialog accessibility', async ({ page }) => {
    // Example pattern for testing modals
    await page.goto('/');

    // Open modal
    await page.click('[data-testid="open-settings"]');

    // Check modal accessibility
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await checkA11y(page, {
      include: [['[role="dialog"]']],
    });

    // Test that Escape key closes modal
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test.skip('navigation menu accessibility', async ({ page }) => {
    // Example pattern for testing navigation
    await page.goto('/');

    // Test skip link
    await page.keyboard.press('Tab'); // Should focus skip link first
    const skipLink = page.locator('a:has-text("Skip to")').first();
    await expect(skipLink).toBeFocused();

    // Test main navigation
    await testKeyboardNavigation(page, {
      startSelector: 'nav',
    });

    // Check navigation accessibility
    await checkA11y(page, {
      include: [['nav'], ['header']],
    });
  });
});
