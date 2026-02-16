/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Keyboard Navigation Test Helper
 *
 * T318: Test keyboard navigation patterns for accessibility compliance.
 *
 * Tests:
 * - Tab navigation order
 * - Enter/Space activation
 * - Arrow key navigation (for widgets like menus, tabs, listboxes)
 * - Escape key handling (close modals, cancel actions)
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Result of a keyboard navigation test
 */
export interface KeyboardNavResult {
  success: boolean;
  focusOrder: string[];
  errors: string[];
}

/**
 * Options for Tab navigation testing
 */
export interface TabNavigationOptions {
  /**
   * Starting element selector (default: 'body')
   */
  startSelector?: string;

  /**
   * Maximum number of Tab presses before stopping
   */
  maxTabs?: number;

  /**
   * Expected focus order (array of selectors)
   */
  expectedOrder?: string[];

  /**
   * Whether to verify focus indicators are visible
   */
  checkFocusIndicator?: boolean;
}

/**
 * Options for arrow key navigation testing
 */
export interface ArrowNavigationOptions {
  /**
   * Container selector for the widget
   */
  containerSelector: string;

  /**
   * Item selector within the container
   */
  itemSelector: string;

  /**
   * Navigation orientation ('horizontal' | 'vertical' | 'both')
   */
  orientation?: 'horizontal' | 'vertical' | 'both';

  /**
   * Whether navigation should wrap around
   */
  wrapsAround?: boolean;
}

/**
 * CSS selector for all focusable elements
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * Test Tab navigation through focusable elements
 *
 * Verifies that Tab key moves focus through elements in a logical order
 * and that all interactive elements are reachable.
 *
 * @param page - Playwright Page object
 * @param options - Tab navigation options
 * @returns Navigation test result
 *
 * @example
 * ```ts
 * test('Tab through form fields', async ({ page }) => {
 *   await page.goto('/signup');
 *   const result = await testTabNavigation(page, {
 *     startSelector: 'form',
 *     expectedOrder: ['#email', '#password', '#submit'],
 *   });
 *   expect(result.success).toBe(true);
 * });
 * ```
 */
export async function testTabNavigation(
  page: Page,
  options: TabNavigationOptions = {},
): Promise<KeyboardNavResult> {
  const {
    startSelector = 'body',
    maxTabs = 50,
    expectedOrder,
    checkFocusIndicator = false,
  } = options;

  const focusOrder: string[] = [];
  const errors: string[] = [];

  // Get all focusable elements in the container
  const container = page.locator(startSelector);
  const focusableElements = await container.locator(FOCUSABLE_SELECTOR).all();

  if (focusableElements.length === 0) {
    errors.push(`No focusable elements found in ${startSelector}`);
    return { success: false, focusOrder, errors };
  }

  // Reset focus to start of document
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
  });

  // Tab through elements and record focus order
  let tabCount = 0;
  const visitedElements = new Set<string>();

  while (tabCount < maxTabs) {
    await page.keyboard.press('Tab');
    tabCount++;

    // Get currently focused element info
    const focusedInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        testId: el.getAttribute('data-testid') || undefined,
        text: el.textContent?.trim().slice(0, 30) || undefined,
        selector: el.id
          ? `#${el.id}`
          : el.getAttribute('data-testid')
            ? `[data-testid="${el.getAttribute('data-testid')}"]`
            : el.tagName.toLowerCase(),
      };
    });

    if (!focusedInfo) {
      // Focus left the document or went to body
      break;
    }

    // Check for focus indicator if requested
    if (checkFocusIndicator) {
      const hasFocusIndicator = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;

        const styles = getComputedStyle(el);
        const outline = styles.outline;
        const boxShadow = styles.boxShadow;

        // Check for visible focus indicator
        return (
          (outline && outline !== 'none' && !outline.includes('0px')) ||
          (boxShadow && boxShadow !== 'none')
        );
      });

      if (!hasFocusIndicator) {
        errors.push(`No visible focus indicator on ${focusedInfo.selector}`);
      }
    }

    // Track visited elements to detect cycles
    const elementKey = `${focusedInfo.tagName}:${focusedInfo.id || focusedInfo.testId || focusedInfo.text}`;
    if (visitedElements.has(elementKey)) {
      // Completed a full cycle
      break;
    }
    visitedElements.add(elementKey);
    focusOrder.push(focusedInfo.selector);
  }

  // Validate against expected order if provided
  if (expectedOrder) {
    for (let i = 0; i < expectedOrder.length; i++) {
      const expected = expectedOrder[i];
      if (!expected) continue;

      const found = focusOrder.some((selector) =>
        selector.includes(
          expected.replace('#', '').replace('[data-testid="', '').replace('"]', ''),
        ),
      );
      if (!found) {
        errors.push(`Expected element ${expected} not found in focus order`);
      }
    }
  }

  return {
    success: errors.length === 0,
    focusOrder,
    errors,
  };
}

/**
 * Test Enter/Space key activation on interactive elements
 *
 * Verifies that buttons and links can be activated with Enter and Space keys.
 *
 * @param page - Playwright Page object
 * @param element - Element to test
 * @param expectedAction - What should happen on activation ('click' | 'submit' | 'navigate')
 *
 * @example
 * ```ts
 * test('Button activates with Enter', async ({ page }) => {
 *   await page.goto('/');
 *   const button = page.getByRole('button', { name: 'Submit' });
 *   await testEnterSpaceActivation(page, button, 'click');
 * });
 * ```
 */
export async function testEnterSpaceActivation(
  page: Page,
  element: Locator,
  expectedAction: 'click' | 'submit' | 'navigate' = 'click',
): Promise<void> {
  // Track if action was triggered
  let actionTriggered = false;

  if (expectedAction === 'click') {
    // Listen for click event
    await element.evaluate((el) => {
      el.addEventListener('click', () => {
        (el as HTMLElement & { _clickTriggered?: boolean })._clickTriggered = true;
      });
    });
  }

  // Focus the element
  await element.focus();
  await expect(element).toBeFocused();

  // Test Enter key
  await page.keyboard.press('Enter');

  if (expectedAction === 'click') {
    actionTriggered = await element.evaluate((el) => {
      return (el as HTMLElement & { _clickTriggered?: boolean })._clickTriggered === true;
    });
    expect(actionTriggered).toBe(true);

    // Reset for Space test
    await element.evaluate((el) => {
      (el as HTMLElement & { _clickTriggered?: boolean })._clickTriggered = false;
    });
  }

  // Get element type to determine if Space should work
  const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
  const role = await element.getAttribute('role');

  // Space should activate buttons but not links
  if (tagName === 'button' || role === 'button') {
    await element.focus();
    await page.keyboard.press('Space');

    if (expectedAction === 'click') {
      actionTriggered = await element.evaluate((el) => {
        return (el as HTMLElement & { _clickTriggered?: boolean })._clickTriggered === true;
      });
      expect(actionTriggered).toBe(true);
    }
  }
}

/**
 * Test arrow key navigation within a widget
 *
 * For components like tabs, menus, listboxes, and radio groups,
 * arrow keys should move focus between options.
 *
 * @param page - Playwright Page object
 * @param options - Arrow navigation options
 *
 * @example
 * ```ts
 * test('Tab list arrow navigation', async ({ page }) => {
 *   await page.goto('/settings');
 *   await testArrowNavigation(page, {
 *     containerSelector: '[role="tablist"]',
 *     itemSelector: '[role="tab"]',
 *     orientation: 'horizontal',
 *   });
 * });
 * ```
 */
export async function testArrowNavigation(
  page: Page,
  options: ArrowNavigationOptions,
): Promise<void> {
  const {
    containerSelector,
    itemSelector,
    orientation = 'horizontal',
    wrapsAround = true,
  } = options;

  const container = page.locator(containerSelector);
  const items = await container.locator(itemSelector).all();

  if (items.length < 2) {
    throw new Error(`Need at least 2 items to test arrow navigation, found ${items.length}`);
  }

  // Focus the first item
  const firstItem = items[0];
  if (!firstItem) {
    throw new Error('First item not found');
  }
  await firstItem.focus();
  await expect(firstItem).toBeFocused();

  // Determine which arrow keys to use based on orientation
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

  // Test forward navigation
  for (let i = 1; i < items.length; i++) {
    await page.keyboard.press(nextKey);
    const currentItem = items[i];
    if (currentItem) {
      await expect(currentItem).toBeFocused();
    }
  }

  // Test wrap-around (if enabled)
  if (wrapsAround) {
    await page.keyboard.press(nextKey);
    await expect(firstItem).toBeFocused();
  }

  // Test backward navigation
  if (wrapsAround) {
    await page.keyboard.press(prevKey);
    const lastItem = items[items.length - 1];
    if (lastItem) {
      await expect(lastItem).toBeFocused();
    }
  }
}

/**
 * Test Escape key behavior
 *
 * Verifies that Escape key closes modals, cancels actions, or clears selections.
 *
 * @param page - Playwright Page object
 * @param options - Escape key test options
 *
 * @example
 * ```ts
 * test('Escape closes modal', async ({ page }) => {
 *   await page.goto('/');
 *   await page.click('[data-testid="open-modal"]');
 *
 *   await testEscapeKey(page, {
 *     dismissibleSelector: '[role="dialog"]',
 *     shouldClose: true,
 *   });
 * });
 * ```
 */
export async function testEscapeKey(
  page: Page,
  options: {
    /**
     * Selector for the element that should be dismissed
     */
    dismissibleSelector: string;

    /**
     * Whether the element should close on Escape
     */
    shouldClose: boolean;

    /**
     * Where focus should return after dismissal
     */
    expectedFocusReturn?: string;
  },
): Promise<void> {
  const { dismissibleSelector, shouldClose, expectedFocusReturn } = options;

  const dismissible = page.locator(dismissibleSelector);
  await expect(dismissible).toBeVisible();

  // Press Escape
  await page.keyboard.press('Escape');

  if (shouldClose) {
    await expect(dismissible).not.toBeVisible();

    // Check focus return if specified
    if (expectedFocusReturn) {
      const returnElement = page.locator(expectedFocusReturn);
      await expect(returnElement).toBeFocused();
    }
  } else {
    // Element should still be visible
    await expect(dismissible).toBeVisible();
  }
}

/**
 * Test that focus is managed correctly when content changes
 *
 * Verifies focus management for dynamic content updates, SPA navigation, etc.
 *
 * @param page - Playwright Page object
 * @param options - Focus management test options
 */
export async function testFocusManagement(
  page: Page,
  options: {
    /**
     * Action that triggers content change
     */
    triggerAction: () => Promise<void>;

    /**
     * Where focus should be after the action
     */
    expectedFocusAfter: string;

    /**
     * Optional: selector for loading indicator
     */
    loadingIndicator?: string;
  },
): Promise<void> {
  const { triggerAction, expectedFocusAfter, loadingIndicator } = options;

  // Trigger the content change
  await triggerAction();

  // Wait for loading to complete if indicator provided
  if (loadingIndicator) {
    await page.locator(loadingIndicator).waitFor({ state: 'hidden' });
  }

  // Verify focus moved to expected element
  const expectedElement = page.locator(expectedFocusAfter);
  await expect(expectedElement).toBeFocused();
}

/**
 * Verify all interactive elements are keyboard accessible
 *
 * Scans a container for interactive elements and verifies each can be focused.
 *
 * @param page - Playwright Page object
 * @param containerSelector - Container to scan
 * @returns List of inaccessible elements
 */
export async function findInaccessibleElements(
  page: Page,
  containerSelector: string = 'body',
): Promise<string[]> {
  const inaccessible: string[] = [];

  const container = page.locator(containerSelector);
  const interactiveElements = await container
    .locator('button, a, input, select, textarea, [onclick], [role="button"], [role="link"]')
    .all();

  for (const element of interactiveElements) {
    const isDisabled = await element.isDisabled().catch(() => false);
    if (isDisabled) continue;

    const isVisible = await element.isVisible();
    if (!isVisible) continue;

    // Try to focus the element
    try {
      await element.focus();
      const isFocused = await element.evaluate((el) => document.activeElement === el);

      if (!isFocused) {
        const selector = await element.evaluate((el) => {
          return el.id ? `#${el.id}` : el.getAttribute('data-testid') || el.tagName.toLowerCase();
        });
        inaccessible.push(selector);
      }
    } catch {
      // Element couldn't be focused
      const selector = await element
        .evaluate((el) => {
          return el.id ? `#${el.id}` : el.getAttribute('data-testid') || el.tagName.toLowerCase();
        })
        .catch(() => 'unknown');
      inaccessible.push(selector);
    }
  }

  return inaccessible;
}

/**
 * Export all keyboard navigation helpers
 */
export const keyboardNavHelpers = {
  testTabNavigation,
  testEnterSpaceActivation,
  testArrowNavigation,
  testEscapeKey,
  testFocusManagement,
  findInaccessibleElements,
  FOCUSABLE_SELECTOR,
};

export default keyboardNavHelpers;
