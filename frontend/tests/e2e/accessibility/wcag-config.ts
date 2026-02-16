/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * WCAG 2.2 AA Test Configuration
 *
 * T317: Configure axe-core for WCAG 2.2 AA compliance testing.
 *
 * This module provides:
 * - Predefined rule configurations for different page types
 * - Exclusion patterns for known limitations
 * - Reusable configuration presets
 *
 * @see https://www.w3.org/WAI/WCAG22/quickref/
 * @see https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
 */

import type { A11yCheckOptions } from '../helpers/a11y';

/**
 * WCAG 2.2 AA rule tags
 *
 * These tags enable all rules that map to WCAG 2.2 Level AA criteria.
 */
export const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

/**
 * Best practice tags (optional, stricter checks)
 */
export const BEST_PRACTICE_TAGS = ['best-practice'] as const;

/**
 * Rule configuration for specific axe-core rules
 *
 * Enable/disable individual rules based on project needs.
 */
export interface RuleConfig {
  [ruleId: string]: { enabled: boolean };
}

/**
 * Common exclusion patterns for elements that may have
 * known limitations or are handled by third-party libraries
 */
export const commonExclusions = {
  /**
   * Third-party widgets that we don't control
   */
  thirdParty: [
    ['[data-third-party]'],
    ['iframe:not([title])'], // Third-party iframes without titles
    ['.grecaptcha-badge'], // Google reCAPTCHA
  ],

  /**
   * Elements that are visually hidden but used for screen readers
   */
  visuallyHidden: [['.sr-only'], ['.visually-hidden']],

  /**
   * Dynamic content that changes rapidly (e.g., live updates)
   */
  dynamicContent: [['[aria-live="polite"]'], ['[aria-live="assertive"]']],

  /**
   * SVG icons that are decorative
   */
  decorativeIcons: [['svg[aria-hidden="true"]'], ['[role="presentation"]']],
};

/**
 * Page-specific configurations for different parts of the application
 */
export const pageConfigs = {
  /**
   * Landing/marketing pages - full compliance check
   */
  landing: {
    wcagLevel: 'wcag22aa',
    exclude: [...commonExclusions.thirdParty],
    failOnViolations: true,
  } satisfies A11yCheckOptions,

  /**
   * Authentication pages - critical for accessibility
   */
  auth: {
    wcagLevel: 'wcag22aa',
    include: [['form'], ['main']],
    exclude: [...commonExclusions.thirdParty],
    failOnViolations: true,
  } satisfies A11yCheckOptions,

  /**
   * Dashboard/app pages - may have complex widgets
   */
  dashboard: {
    wcagLevel: 'wcag22aa',
    exclude: [...commonExclusions.thirdParty, ...commonExclusions.dynamicContent],
    failOnViolations: true,
  } satisfies A11yCheckOptions,

  /**
   * Discussion pages - main content area
   */
  discussion: {
    wcagLevel: 'wcag22aa',
    include: [['main'], ['[role="main"]']],
    exclude: [...commonExclusions.dynamicContent],
    failOnViolations: true,
  } satisfies A11yCheckOptions,

  /**
   * Modal/dialog pages - focus management is critical
   */
  modal: {
    wcagLevel: 'wcag22aa',
    include: [['[role="dialog"]'], ['[role="alertdialog"]']],
    failOnViolations: true,
  } satisfies A11yCheckOptions,

  /**
   * Form-heavy pages - validation and error handling
   */
  forms: {
    wcagLevel: 'wcag22aa',
    include: [['form']],
    failOnViolations: true,
    rules: {
      // Ensure form labels are properly associated
      label: { enabled: true },
      // Ensure form elements have accessible names
      'form-field-multiple-labels': { enabled: true },
    },
  } satisfies A11yCheckOptions,

  /**
   * Progressive/gradual compliance - for legacy pages
   * Use this to track violations without failing tests
   */
  gradual: {
    wcagLevel: 'wcag22aa',
    failOnViolations: false,
  } satisfies A11yCheckOptions,
};

/**
 * Rules that are critical and should always be enabled
 */
export const criticalRules: RuleConfig = {
  // Color contrast (WCAG 1.4.3)
  'color-contrast': { enabled: true },

  // Keyboard accessibility (WCAG 2.1.1)
  keyboard: { enabled: true },

  // Focus visible (WCAG 2.4.7)
  'focus-visible': { enabled: true },

  // Name, role, value (WCAG 4.1.2)
  'aria-required-attr': { enabled: true },
  'aria-valid-attr': { enabled: true },
  'aria-valid-attr-value': { enabled: true },

  // Images have alt text (WCAG 1.1.1)
  'image-alt': { enabled: true },

  // Links have discernible text (WCAG 2.4.4)
  'link-name': { enabled: true },

  // Buttons have accessible names (WCAG 4.1.2)
  'button-name': { enabled: true },

  // Form inputs have labels (WCAG 1.3.1)
  label: { enabled: true },
};

/**
 * Rules specific to WCAG 2.2 (new in 2.2)
 */
export const wcag22SpecificRules: RuleConfig = {
  // Focus Not Obscured (2.4.11)
  'focus-not-obscured': { enabled: true },

  // Focus Appearance (2.4.12) - AAA but good practice
  // Note: May not be fully supported in axe-core yet

  // Dragging Movements (2.5.7)
  // Note: Manual testing often required

  // Target Size (2.5.8)
  'target-size': { enabled: true },

  // Consistent Help (3.2.6)
  // Note: Manual testing required

  // Redundant Entry (3.3.7)
  // Note: Manual testing required

  // Accessible Authentication (3.3.8)
  // Note: Manual testing required
};

/**
 * Rules that may generate false positives and need review
 */
export const cautionRules: RuleConfig = {
  // Sometimes triggers on legitimate uses of tabindex
  tabindex: { enabled: true },

  // May flag valid ARIA patterns
  'aria-allowed-role': { enabled: true },

  // Can be overly strict with nested interactive elements
  'nested-interactive': { enabled: true },
};

/**
 * Create a custom configuration by merging presets
 *
 * @param baseConfig - Base page configuration
 * @param overrides - Additional options to merge
 * @returns Merged configuration
 *
 * @example
 * ```ts
 * const config = createConfig(pageConfigs.dashboard, {
 *   exclude: [['.custom-widget']],
 * });
 * await checkA11y(page, config);
 * ```
 */
export function createConfig(
  baseConfig: A11yCheckOptions,
  overrides: Partial<A11yCheckOptions> = {},
): A11yCheckOptions {
  return {
    ...baseConfig,
    ...overrides,
    // Merge arrays rather than replace
    include: [...(baseConfig.include || []), ...(overrides.include || [])],
    exclude: [...(baseConfig.exclude || []), ...(overrides.exclude || [])],
    // Merge rules
    rules: { ...baseConfig.rules, ...overrides.rules },
  };
}

/**
 * Get all critical rule IDs for validation
 */
export function getCriticalRuleIds(): string[] {
  return Object.keys(criticalRules);
}

/**
 * Check if a violation is critical based on its impact
 *
 * @param impact - The impact level from axe-core
 * @returns true if the violation should block deployment
 */
export function isCriticalViolation(impact: string | undefined): boolean {
  return impact === 'critical' || impact === 'serious';
}

/**
 * WCAG success criteria mapping for reference
 *
 * Maps axe-core rules to WCAG 2.2 success criteria
 */
export const wcagCriteriaMapping: Record<string, string> = {
  'image-alt': '1.1.1 Non-text Content',
  'color-contrast': '1.4.3 Contrast (Minimum)',
  keyboard: '2.1.1 Keyboard',
  'focus-visible': '2.4.7 Focus Visible',
  'link-name': '2.4.4 Link Purpose (In Context)',
  'button-name': '4.1.2 Name, Role, Value',
  label: '1.3.1 Info and Relationships',
  'aria-required-attr': '4.1.2 Name, Role, Value',
  'target-size': '2.5.8 Target Size (Minimum)',
};

/**
 * Default configuration export for simple usage
 */
export const defaultConfig: A11yCheckOptions = {
  wcagLevel: 'wcag22aa',
  failOnViolations: true,
  rules: { ...criticalRules },
};

export default {
  WCAG_22_AA_TAGS,
  pageConfigs,
  criticalRules,
  wcag22SpecificRules,
  commonExclusions,
  createConfig,
  defaultConfig,
};
