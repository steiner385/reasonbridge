import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * WCAG 2.2 AA accessibility testing utilities for Playwright E2E tests.
 *
 * This module provides configured axe-core integration for comprehensive
 * accessibility testing following WCAG 2.2 Level AA guidelines.
 *
 * @example
 * ```ts
 * import { checkAccessibility } from './helpers/accessibility';
 *
 * test('page is accessible', async ({ page }) => {
 *   await page.goto('/');
 *   await checkAccessibility(page);
 * });
 * ```
 */

/**
 * WCAG 2.2 AA tag configuration.
 * Includes all Level A and AA rules from WCAG 2.0, 2.1, and 2.2.
 */
export const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

/**
 * Best practice tags for additional accessibility checks beyond WCAG.
 */
export const BEST_PRACTICE_TAGS = ['best-practice'] as const;

/**
 * Result interface for accessibility scans.
 */
export interface AccessibilityResult {
  /** Array of accessibility violations found */
  violations: AccessibilityViolation[];
  /** Number of violations found */
  violationCount: number;
  /** Whether the page passes accessibility checks */
  passes: boolean;
}

/**
 * Detailed violation information from axe-core.
 */
export interface AccessibilityViolation {
  /** Rule ID (e.g., 'color-contrast', 'button-name') */
  id: string;
  /** Impact level: minor, moderate, serious, critical */
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  /** Human-readable description of the violation */
  description: string;
  /** Help text explaining how to fix the violation */
  help: string;
  /** URL to axe documentation for this rule */
  helpUrl: string;
  /** CSS selectors of elements that violate this rule */
  nodes: string[];
}

/**
 * Options for accessibility checking.
 */
export interface AccessibilityOptions {
  /**
   * Include best practice rules beyond WCAG requirements.
   * @default false
   */
  includeBestPractices?: boolean;

  /**
   * CSS selector to scope the accessibility check.
   * @default undefined (checks entire page)
   */
  include?: string[];

  /**
   * CSS selectors to exclude from accessibility checking.
   * Useful for known third-party components that can't be fixed.
   * @default undefined
   */
  exclude?: string[];

  /**
   * Specific rule IDs to disable.
   * Use sparingly and document why each rule is disabled.
   * @default undefined
   */
  disableRules?: string[];
}

/**
 * Create a configured AxeBuilder instance for WCAG 2.2 AA testing.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @returns Configured AxeBuilder instance
 */
export function createAxeBuilder(page: Page, options: AccessibilityOptions = {}): AxeBuilder {
  const tags = options.includeBestPractices
    ? [...WCAG_22_AA_TAGS, ...BEST_PRACTICE_TAGS]
    : [...WCAG_22_AA_TAGS];

  let builder = new AxeBuilder({ page }).withTags(tags);

  if (options.include?.length) {
    builder = builder.include(options.include);
  }

  if (options.exclude?.length) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }

  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }

  return builder;
}

/**
 * Run accessibility checks and return detailed results.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @returns Accessibility scan results
 *
 * @example
 * ```ts
 * const results = await scanAccessibility(page);
 * // results.violationCount contains the total count
 * // results.violations array contains violation details
 * ```
 */
export async function scanAccessibility(
  page: Page,
  options: AccessibilityOptions = {},
): Promise<AccessibilityResult> {
  const results = await createAxeBuilder(page, options).analyze();

  const violations: AccessibilityViolation[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact as AccessibilityViolation['impact'],
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));

  return {
    violations,
    violationCount: violations.length,
    passes: violations.length === 0,
  };
}

/**
 * Format violations into a readable error message.
 */
function formatViolations(violations: AccessibilityViolation[]): string {
  if (violations.length === 0) {
    return 'No accessibility violations found';
  }

  const lines: string[] = [
    `Found ${violations.length} accessibility violation${violations.length === 1 ? '' : 's'}:`,
    '',
  ];

  for (const violation of violations) {
    lines.push(`  [${violation.impact?.toUpperCase() || 'UNKNOWN'}] ${violation.id}`);
    lines.push(`    ${violation.description}`);
    lines.push(`    Help: ${violation.help}`);
    lines.push(
      `    Elements: ${violation.nodes.slice(0, 3).join(', ')}${violation.nodes.length > 3 ? ` (+${violation.nodes.length - 3} more)` : ''}`,
    );
    lines.push(`    Docs: ${violation.helpUrl}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Assert that a page has no accessibility violations.
 * Throws an assertion error if violations are found.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * test('login page is accessible', async ({ page }) => {
 *   await page.goto('/login');
 *   await checkAccessibility(page);
 * });
 * ```
 */
export async function checkAccessibility(
  page: Page,
  options: AccessibilityOptions = {},
): Promise<void> {
  const results = await scanAccessibility(page, options);

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
}

/**
 * Assert that a page has no critical or serious accessibility violations.
 * Minor and moderate violations are logged but don't fail the test.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * test('page has no critical accessibility issues', async ({ page }) => {
 *   await page.goto('/');
 *   await checkCriticalAccessibility(page);
 * });
 * ```
 */
export async function checkCriticalAccessibility(
  page: Page,
  options: AccessibilityOptions = {},
): Promise<void> {
  const results = await scanAccessibility(page, options);

  const criticalViolations = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  const minorViolations = results.violations.filter(
    (v) => v.impact === 'minor' || v.impact === 'moderate',
  );

  if (minorViolations.length > 0) {
    console.warn(
      `[Accessibility] ${minorViolations.length} minor/moderate violation(s) found (not failing test):\n${formatViolations(minorViolations)}`,
    );
  }

  expect(criticalViolations, formatViolations(criticalViolations)).toHaveLength(0);
}

/**
 * Get accessibility statistics for a page without failing on violations.
 * Useful for generating accessibility reports.
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 * @returns Statistics about accessibility issues
 *
 * @example
 * ```ts
 * const stats = await getAccessibilityStats(page);
 * // Access: stats.critical, stats.serious, stats.moderate, stats.minor
 * ```
 */
export async function getAccessibilityStats(
  page: Page,
  options: AccessibilityOptions = {},
): Promise<{
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  violations: AccessibilityViolation[];
}> {
  const results = await scanAccessibility(page, options);

  return {
    total: results.violationCount,
    critical: results.violations.filter((v) => v.impact === 'critical').length,
    serious: results.violations.filter((v) => v.impact === 'serious').length,
    moderate: results.violations.filter((v) => v.impact === 'moderate').length,
    minor: results.violations.filter((v) => v.impact === 'minor').length,
    violations: results.violations,
  };
}
