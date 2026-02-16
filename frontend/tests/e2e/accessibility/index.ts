/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Accessibility Testing Utilities
 *
 * Centralized export of all accessibility testing helpers.
 *
 * @example
 * ```ts
 * import {
 *   checkA11y,
 *   pageConfigs,
 *   testTabNavigation,
 *   setupAnnouncementCapture,
 * } from './accessibility';
 *
 * test('page is accessible', async ({ page }) => {
 *   await setupAnnouncementCapture(page);
 *   await page.goto('/');
 *   await checkA11y(page, pageConfigs.landing);
 * });
 * ```
 */

// WCAG 2.2 AA Configuration (T317)
export {
  WCAG_22_AA_TAGS,
  BEST_PRACTICE_TAGS,
  pageConfigs,
  commonExclusions,
  criticalRules,
  wcag22SpecificRules,
  cautionRules,
  createConfig,
  getCriticalRuleIds,
  isCriticalViolation,
  wcagCriteriaMapping,
  defaultConfig,
  type RuleConfig,
} from './wcag-config';

// Keyboard Navigation (T318)
export {
  testTabNavigation,
  testEnterSpaceActivation,
  testArrowNavigation,
  testEscapeKey,
  testFocusManagement,
  findInaccessibleElements,
  keyboardNavHelpers,
  FOCUSABLE_SELECTOR,
  type KeyboardNavResult,
  type TabNavigationOptions,
  type ArrowNavigationOptions,
} from './keyboard-nav';

// ARIA Live Regions / Screen Reader (T319)
export {
  setupAnnouncementCapture,
  getAnnouncements,
  clearAnnouncements,
  waitForAnnouncement,
  testLiveRegion,
  testDynamicAnnouncement,
  testAIFeedbackAnnouncement,
  findInaccessibleStatusMessages,
  cleanupAnnouncementCapture,
  ariaLiveHelpers,
  type LiveRegionType,
  type Announcement,
  type MonitorOptions,
} from './aria-live';

// Re-export base a11y helpers from parent
export {
  checkA11y,
  testKeyboardNavigation,
  testFocusTrap,
  testSkipLink,
  reportViolations,
  a11yHelpers,
  type A11yCheckOptions,
} from '../helpers/a11y';
