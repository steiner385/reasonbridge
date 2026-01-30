/**
 * Playwright Accessibility Testing Helpers
 *
 * Provides reusable utilities for automated accessibility testing with axe-core.
 * Supports WCAG 2.2 Level AA compliance checks and keyboard navigation testing.
 *
 * @see https://github.com/dequelabs/axe-core
 * @see https://www.w3.org/WAI/WCAG22/quickref/
 */

import { Page, expect } from '@playwright/test';
import AxeBuilder from 'axe-playwright';
import type { AxeResults, Result } from 'axe-core';

/**
 * Configuration options for accessibility checks
 */
export interface A11yCheckOptions {
  /**
   * Custom axe-core rules to enable/disable
   */
  rules?: Record<string, { enabled: boolean }>;

  /**
   * CSS selectors for elements to include in testing
   */
  include?: string[][];

  /**
   * CSS selectors for elements to exclude from testing
   */
  exclude?: string[][];

  /**
   * WCAG level to test against (default: 'wcag2aa')
   * - 'wcag2a': WCAG 2.0 Level A
   * - 'wcag2aa': WCAG 2.0 Level AA (recommended)
   * - 'wcag21a': WCAG 2.1 Level A
   * - 'wcag21aa': WCAG 2.1 Level AA
   * - 'wcag22aa': WCAG 2.2 Level AA (most current)
   */
  wcagLevel?: 'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa' | 'wcag22aa';

  /**
   * Whether to fail the test on violations (default: true)
   */
  failOnViolations?: boolean;
}

/**
 * Default WCAG 2.2 Level AA tags
 */
const DEFAULT_WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Check page for WCAG 2.2 Level AA accessibility violations
 *
 * @param page - Playwright Page object
 * @param options - Configuration options for the accessibility check
 *
 * @example
 * ```ts
 * test('landing page should be accessible', async ({ page }) => {
 *   await page.goto('/');
 *   await checkA11y(page);
 * });
 * ```
 *
 * @example
 * ```ts
 * test('form should be accessible', async ({ page }) => {
 *   await page.goto('/signup');
 *   await checkA11y(page, {
 *     include: [['#signup-form']],
 *     wcagLevel: 'wcag22aa'
 *   });
 * });
 * ```
 */
export async function checkA11y(page: Page, options: A11yCheckOptions = {}): Promise<void> {
  const { rules, include, exclude, wcagLevel = 'wcag22aa', failOnViolations = true } = options;

  // Build axe configuration
  const builder = new AxeBuilder({ page });

  // Set WCAG level tags
  const wcagTags = getWcagTags(wcagLevel);
  builder.withTags(wcagTags);

  // Apply custom rules if provided
  if (rules) {
    builder.options({ rules });
  }

  // Apply include/exclude selectors
  if (include) {
    builder.include(include);
  }
  if (exclude) {
    builder.exclude(exclude);
  }

  // Run accessibility scan
  const results = await builder.analyze();

  // Report violations
  if (results.violations.length > 0) {
    reportViolations(results);

    if (failOnViolations) {
      throw new Error(
        `Found ${results.violations.length} accessibility violation(s). See console output for details.`,
      );
    }
  }
}

/**
 * Get WCAG tags for a given level
 */
function getWcagTags(level: string): string[] {
  const tagMap: Record<string, string[]> = {
    wcag2a: ['wcag2a'],
    wcag2aa: ['wcag2a', 'wcag2aa'],
    wcag21a: ['wcag2a', 'wcag21a'],
    wcag21aa: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    wcag22aa: DEFAULT_WCAG_TAGS,
  };

  return tagMap[level] || DEFAULT_WCAG_TAGS;
}

/**
 * Format and report accessibility violations with actionable guidance
 *
 * @param results - Axe test results containing violations
 */
export function reportViolations(results: AxeResults): void {
  const { violations } = results;

  console.error('\n❌ Accessibility Violations Found:\n');
  console.error(`Total violations: ${violations.length}\n`);

  violations.forEach((violation, index) => {
    console.error(`\n[${index + 1}] ${violation.id.toUpperCase()}`);
    console.error(`Impact: ${violation.impact?.toUpperCase() || 'UNKNOWN'}`);
    console.error(`Description: ${violation.description}`);
    console.error(`Help: ${violation.help}`);
    console.error(`WCAG: ${violation.tags.filter((t) => t.startsWith('wcag')).join(', ')}`);
    console.error(`Learn more: ${violation.helpUrl}\n`);

    violation.nodes.forEach((node, nodeIndex) => {
      console.error(`  Element ${nodeIndex + 1}:`);
      console.error(`    Target: ${node.target.join(' > ')}`);
      console.error(`    HTML: ${node.html}`);

      if (node.failureSummary) {
        console.error(`    Issue: ${node.failureSummary}`);
      }

      // Show actionable fix suggestions
      if (node.any.length > 0) {
        console.error(`    Fix any of:`);
        node.any.forEach((check) => {
          console.error(`      - ${check.message}`);
        });
      }

      if (node.all.length > 0) {
        console.error(`    Fix all of:`);
        node.all.forEach((check) => {
          console.error(`      - ${check.message}`);
        });
      }

      console.error('');
    });
  });

  console.error('\n📊 Summary:');
  console.error(`  Critical: ${countByImpact(violations, 'critical')}`);
  console.error(`  Serious: ${countByImpact(violations, 'serious')}`);
  console.error(`  Moderate: ${countByImpact(violations, 'moderate')}`);
  console.error(`  Minor: ${countByImpact(violations, 'minor')}`);
  console.error('\n');
}

/**
 * Count violations by impact level
 */
function countByImpact(violations: Result[], impact: string): number {
  return violations.filter((v) => v.impact === impact).length;
}

/**
 * Test keyboard navigation for a specific element or route
 *
 * @param page - Playwright Page object
 * @param options - Keyboard navigation test options
 *
 * @example
 * ```ts
 * test('modal should be keyboard accessible', async ({ page }) => {
 *   await page.goto('/');
 *   await page.click('[data-testid="open-modal"]');
 *
 *   await testKeyboardNavigation(page, {
 *     startSelector: '[role="dialog"]',
 *     expectedFocusableElements: ['button:has-text("Close")', 'button:has-text("Submit")'],
 *   });
 * });
 * ```
 */
export async function testKeyboardNavigation(
  page: Page,
  options: {
    /**
     * CSS selector for the container to test (default: 'body')
     */
    startSelector?: string;

    /**
     * Expected number of focusable elements (optional)
     */
    expectedCount?: number;

    /**
     * Array of CSS selectors for expected focusable elements
     */
    expectedFocusableElements?: string[];
  } = {},
): Promise<void> {
  const { startSelector = 'body', expectedCount, expectedFocusableElements } = options;

  // Get all focusable elements in the container
  const focusableElements = await page
    .locator(
      `${startSelector} >> a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])`,
    )
    .all();

  if (expectedCount !== undefined) {
    expect(focusableElements.length).toBe(expectedCount);
  }

  // Test Tab navigation through all elements
  for (let i = 0; i < focusableElements.length; i++) {
    await page.keyboard.press('Tab');

    // Get currently focused element
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const tagName = await focusedElement.evaluate((el) => el?.tagName.toLowerCase());

    // Verify focus moved to a focusable element
    expect(['a', 'button', 'input', 'select', 'textarea']).toContain(tagName);
  }

  // If specific elements are expected, verify they can be focused
  if (expectedFocusableElements) {
    for (const selector of expectedFocusableElements) {
      const element = page.locator(selector);
      await expect(element).toBeFocusable();
    }
  }
}

/**
 * Test focus trap (e.g., for modals, dialogs)
 *
 * Verifies that focus cycles within a container and doesn't escape
 *
 * @param page - Playwright Page object
 * @param containerSelector - CSS selector for the focus trap container
 *
 * @example
 * ```ts
 * test('modal should trap focus', async ({ page }) => {
 *   await page.goto('/');
 *   await page.click('[data-testid="open-modal"]');
 *
 *   await testFocusTrap(page, '[role="dialog"]');
 * });
 * ```
 */
export async function testFocusTrap(page: Page, containerSelector: string): Promise<void> {
  const container = page.locator(containerSelector);
  await expect(container).toBeVisible();

  // Get all focusable elements in the container
  const focusableElements = await page
    .locator(
      `${containerSelector} >> a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])`,
    )
    .all();

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Focus the first element
  await firstElement.focus();

  // Tab through all elements to reach the last one
  for (let i = 0; i < focusableElements.length - 1; i++) {
    await page.keyboard.press('Tab');
  }

  // Press Tab one more time - focus should cycle back to first element
  await page.keyboard.press('Tab');

  // Verify focus returned to first element
  const focusedElement = await page.evaluateHandle(() => document.activeElement);
  const isFirstFocused = await firstElement.evaluateHandle(
    (el, focused) => el === focused,
    focusedElement,
  );

  expect(await isFirstFocused.jsonValue()).toBe(true);

  // Test reverse tabbing (Shift+Tab) from first element should go to last
  await page.keyboard.press('Shift+Tab');

  const focusedAfterShiftTab = await page.evaluateHandle(() => document.activeElement);
  const isLastFocused = await lastElement.evaluateHandle(
    (el, focused) => el === focused,
    focusedAfterShiftTab,
  );

  expect(await isLastFocused.jsonValue()).toBe(true);
}

/**
 * Test skip navigation link
 *
 * Verifies that a "Skip to main content" link is present and functional
 *
 * @param page - Playwright Page object
 * @param options - Skip link test options
 *
 * @example
 * ```ts
 * test('should have functional skip link', async ({ page }) => {
 *   await page.goto('/');
 *   await testSkipLink(page, {
 *     skipLinkSelector: 'a[href="#main-content"]',
 *     mainContentSelector: '#main-content'
 *   });
 * });
 * ```
 */
export async function testSkipLink(
  page: Page,
  options: {
    skipLinkSelector?: string;
    mainContentSelector?: string;
  } = {},
): Promise<void> {
  const {
    skipLinkSelector = 'a:has-text("Skip to")',
    mainContentSelector = 'main, #main-content, [role="main"]',
  } = options;

  // Press Tab to focus skip link (usually first focusable element)
  await page.keyboard.press('Tab');

  // Verify skip link is focused or visible
  const skipLink = page.locator(skipLinkSelector).first();
  await expect(skipLink).toBeFocusable();

  // Activate skip link
  await skipLink.click();

  // Verify focus moved to main content
  const mainContent = page.locator(mainContentSelector).first();
  const isFocused = await mainContent.evaluate(
    (el) => el === document.activeElement || el.contains(document.activeElement),
  );

  expect(isFocused).toBe(true);
}

/**
 * Custom Playwright matcher to check if element is focusable
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R> {
      toBeFocusable(): R;
    }
  }
}

/**
 * Export helper for use in Playwright tests
 */
export const a11yHelpers = {
  checkA11y,
  testKeyboardNavigation,
  testFocusTrap,
  testSkipLink,
  reportViolations,
};
