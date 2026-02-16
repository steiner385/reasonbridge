/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Screen Reader Announcement Test Helper
 *
 * T319: Test ARIA live regions and dynamic announcements for screen readers.
 *
 * Tests:
 * - ARIA live region updates
 * - Announcements for dynamic content
 * - AI feedback announcements
 * - Status messages and alerts
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
 * @see https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA22
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Types of ARIA live regions
 */
export type LiveRegionType = 'polite' | 'assertive' | 'off';

/**
 * Captured announcement from a live region
 */
export interface Announcement {
  /**
   * The text content of the announcement
   */
  text: string;

  /**
   * The politeness level (polite, assertive, off)
   */
  politeness: LiveRegionType;

  /**
   * Timestamp when the announcement was made
   */
  timestamp: number;

  /**
   * The element's role (status, alert, log, etc.)
   */
  role?: string;

  /**
   * The element's selector for debugging
   */
  selector: string;
}

/**
 * Options for announcement monitoring
 */
export interface MonitorOptions {
  /**
   * Timeout for waiting for announcements (ms)
   */
  timeout?: number;

  /**
   * Filter by politeness level
   */
  politeness?: LiveRegionType;

  /**
   * Filter by role
   */
  role?: string;

  /**
   * Text pattern to match (string or regex)
   */
  textPattern?: string | RegExp;
}

/**
 * Inject announcement capture script into the page
 *
 * Sets up a MutationObserver to track changes to ARIA live regions.
 *
 * @param page - Playwright Page object
 */
export async function setupAnnouncementCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Store captured announcements on window object
    const announcements: Announcement[] = [];
    (window as unknown as { __ariaAnnouncements: Announcement[] }).__ariaAnnouncements =
      announcements;

    // Find all live regions
    const liveRegionSelectors = [
      '[aria-live]',
      '[role="alert"]',
      '[role="status"]',
      '[role="log"]',
      '[role="marquee"]',
      '[role="timer"]',
    ];

    // Create observer for live regions
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target as HTMLElement;

        // Check if target or parent is a live region
        let liveRegion: HTMLElement | null = null;
        let element: HTMLElement | null = target;

        while (element && element !== document.body) {
          const ariaLive = element.getAttribute('aria-live');
          const role = element.getAttribute('role');

          if (ariaLive || ['alert', 'status', 'log', 'marquee', 'timer'].includes(role || '')) {
            liveRegion = element;
            break;
          }
          element = element.parentElement;
        }

        if (liveRegion) {
          const text = liveRegion.textContent?.trim();
          if (text) {
            const ariaLive = liveRegion.getAttribute('aria-live') as LiveRegionType;
            const role = liveRegion.getAttribute('role');

            // Determine politeness
            let politeness: LiveRegionType = ariaLive || 'polite';
            if (role === 'alert') {
              politeness = 'assertive';
            } else if (role === 'status') {
              politeness = 'polite';
            }

            // Create selector for the element
            const selector = liveRegion.id
              ? `#${liveRegion.id}`
              : liveRegion.getAttribute('data-testid')
                ? `[data-testid="${liveRegion.getAttribute('data-testid')}"]`
                : `[role="${role}"]` || '[aria-live]';

            announcements.push({
              text,
              politeness,
              timestamp: Date.now(),
              role: role || undefined,
              selector,
            });
          }
        }
      }
    });

    // Observe the entire document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Store observer reference for cleanup
    (window as unknown as { __ariaObserver: MutationObserver }).__ariaObserver = observer;
  });
}

/**
 * Get all captured announcements
 *
 * @param page - Playwright Page object
 * @returns Array of captured announcements
 */
export async function getAnnouncements(page: Page): Promise<Announcement[]> {
  return await page.evaluate(() => {
    return (window as unknown as { __ariaAnnouncements: Announcement[] }).__ariaAnnouncements || [];
  });
}

/**
 * Clear captured announcements
 *
 * @param page - Playwright Page object
 */
export async function clearAnnouncements(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __ariaAnnouncements: Announcement[] }).__ariaAnnouncements = [];
  });
}

/**
 * Wait for a specific announcement to be made
 *
 * @param page - Playwright Page object
 * @param options - Options for matching the announcement
 * @returns The matching announcement
 *
 * @example
 * ```ts
 * test('shows success message', async ({ page }) => {
 *   await setupAnnouncementCapture(page);
 *   await page.click('#submit');
 *
 *   const announcement = await waitForAnnouncement(page, {
 *     textPattern: /success/i,
 *     timeout: 5000,
 *   });
 *
 *   expect(announcement.text).toContain('Successfully submitted');
 * });
 * ```
 */
export async function waitForAnnouncement(
  page: Page,
  options: MonitorOptions = {},
): Promise<Announcement> {
  const { timeout = 5000, politeness, role, textPattern } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const announcements = await getAnnouncements(page);

    for (const announcement of announcements) {
      // Apply filters
      if (politeness && announcement.politeness !== politeness) continue;
      if (role && announcement.role !== role) continue;

      if (textPattern) {
        const matches =
          typeof textPattern === 'string'
            ? announcement.text.includes(textPattern)
            : textPattern.test(announcement.text);
        if (!matches) continue;
      }

      return announcement;
    }

    // Wait before checking again
    await page.waitForTimeout(100);
  }

  throw new Error(
    `No matching announcement found within ${timeout}ms. ` +
      `Options: ${JSON.stringify({ politeness, role, textPattern: String(textPattern) })}`,
  );
}

/**
 * Test that a live region exists and is properly configured
 *
 * @param page - Playwright Page object
 * @param selector - Selector for the live region
 * @param expectedConfig - Expected ARIA attributes
 *
 * @example
 * ```ts
 * test('status region is configured correctly', async ({ page }) => {
 *   await testLiveRegion(page, '#status-message', {
 *     'aria-live': 'polite',
 *     'aria-atomic': 'true',
 *   });
 * });
 * ```
 */
export async function testLiveRegion(
  page: Page,
  selector: string,
  expectedConfig: {
    'aria-live'?: LiveRegionType;
    'aria-atomic'?: 'true' | 'false';
    'aria-relevant'?: string;
    role?: string;
  },
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeAttached();

  for (const [attr, value] of Object.entries(expectedConfig)) {
    const actualValue = await element.getAttribute(attr);
    expect(actualValue).toBe(value);
  }
}

/**
 * Test that dynamic content triggers an announcement
 *
 * @param page - Playwright Page object
 * @param options - Test options
 *
 * @example
 * ```ts
 * test('form error is announced', async ({ page }) => {
 *   await setupAnnouncementCapture(page);
 *
 *   await testDynamicAnnouncement(page, {
 *     triggerAction: async () => {
 *       await page.click('#submit');
 *     },
 *     expectedText: /error/i,
 *     expectedPoliteness: 'assertive',
 *   });
 * });
 * ```
 */
export async function testDynamicAnnouncement(
  page: Page,
  options: {
    /**
     * Action that triggers the announcement
     */
    triggerAction: () => Promise<void>;

    /**
     * Expected text (string or regex)
     */
    expectedText: string | RegExp;

    /**
     * Expected politeness level
     */
    expectedPoliteness?: LiveRegionType;

    /**
     * Timeout for waiting
     */
    timeout?: number;
  },
): Promise<Announcement> {
  const { triggerAction, expectedText, expectedPoliteness, timeout = 5000 } = options;

  // Clear previous announcements
  await clearAnnouncements(page);

  // Trigger the action
  await triggerAction();

  // Wait for the announcement
  const announcement = await waitForAnnouncement(page, {
    textPattern: expectedText,
    politeness: expectedPoliteness,
    timeout,
  });

  return announcement;
}

/**
 * Test AI feedback announcements
 *
 * Specific helper for testing AI feedback display to screen readers.
 *
 * @param page - Playwright Page object
 * @param options - AI feedback test options
 *
 * @example
 * ```ts
 * test('AI feedback is announced', async ({ page }) => {
 *   await setupAnnouncementCapture(page);
 *   await page.goto('/discussion/123');
 *
 *   // Submit a response
 *   await page.fill('#response-input', 'My argument...');
 *   await page.click('#submit-response');
 *
 *   await testAIFeedbackAnnouncement(page, {
 *     feedbackContainerSelector: '[data-testid="ai-feedback"]',
 *     expectedFeedbackTypes: ['fallacy', 'suggestion'],
 *   });
 * });
 * ```
 */
export async function testAIFeedbackAnnouncement(
  page: Page,
  options: {
    /**
     * Selector for the AI feedback container
     */
    feedbackContainerSelector: string;

    /**
     * Expected types of feedback
     */
    expectedFeedbackTypes?: string[];

    /**
     * Timeout for waiting
     */
    timeout?: number;
  },
): Promise<void> {
  const { feedbackContainerSelector, expectedFeedbackTypes, timeout = 10000 } = options;

  // Wait for feedback container to appear
  const feedbackContainer = page.locator(feedbackContainerSelector);
  await expect(feedbackContainer).toBeVisible({ timeout });

  // Check that the container is a live region
  const ariaLive = await feedbackContainer.getAttribute('aria-live');
  const role = await feedbackContainer.getAttribute('role');

  expect(
    ariaLive === 'polite' || ariaLive === 'assertive' || role === 'status' || role === 'alert',
  ).toBe(true);

  // If specific feedback types expected, verify they're present
  if (expectedFeedbackTypes) {
    for (const type of expectedFeedbackTypes) {
      // Check for feedback type in text or data attributes
      const hasType = await feedbackContainer.evaluate((el, feedbackType) => {
        return (
          el.textContent?.toLowerCase().includes(feedbackType) ||
          el.querySelector(`[data-feedback-type="${feedbackType}"]`) !== null
        );
      }, type);

      expect(hasType).toBe(true);
    }
  }

  // Verify the announcement was captured
  const announcements = await getAnnouncements(page);
  const feedbackAnnouncement = announcements.find(
    (a) =>
      a.selector === feedbackContainerSelector ||
      a.text.toLowerCase().includes('feedback') ||
      a.text.toLowerCase().includes('suggestion'),
  );

  // There should be some announcement related to feedback
  expect(feedbackAnnouncement || announcements.length > 0).toBeTruthy();
}

/**
 * Verify all status messages are accessible
 *
 * Scans the page for status messages and verifies they use proper ARIA.
 *
 * @param page - Playwright Page object
 * @returns List of inaccessible status messages
 */
export async function findInaccessibleStatusMessages(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const issues: string[] = [];

    // Find elements that look like status messages
    const potentialStatusElements = document.querySelectorAll(
      '.status, .message, .alert, .notification, .toast, .error, .success, .warning, .info',
    );

    for (const el of potentialStatusElements) {
      const ariaLive = el.getAttribute('aria-live');
      const role = el.getAttribute('role');
      const isHidden = el.getAttribute('aria-hidden') === 'true';

      // Skip hidden elements
      if (isHidden) continue;

      // Check if element has proper ARIA
      const hasProperAria = ariaLive || ['alert', 'status', 'log'].includes(role || '');

      if (!hasProperAria) {
        const selector = (el as HTMLElement).id
          ? `#${(el as HTMLElement).id}`
          : el.className
            ? `.${el.className.split(' ')[0]}`
            : el.tagName.toLowerCase();

        issues.push(
          `${selector}: Missing aria-live or role="status/alert". Text: "${el.textContent?.trim().slice(0, 50)}"`,
        );
      }
    }

    return issues;
  });
}

/**
 * Cleanup announcement capture
 *
 * Disconnects the MutationObserver and clears captured announcements.
 *
 * @param page - Playwright Page object
 */
export async function cleanupAnnouncementCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const observer = (window as unknown as { __ariaObserver: MutationObserver }).__ariaObserver;
    if (observer) {
      observer.disconnect();
    }
    delete (window as unknown as { __ariaAnnouncements: Announcement[] | undefined })
      .__ariaAnnouncements;
    delete (window as unknown as { __ariaObserver: MutationObserver | undefined }).__ariaObserver;
  });
}

/**
 * Export all ARIA live helpers
 */
export const ariaLiveHelpers = {
  setupAnnouncementCapture,
  getAnnouncements,
  clearAnnouncements,
  waitForAnnouncement,
  testLiveRegion,
  testDynamicAnnouncement,
  testAIFeedbackAnnouncement,
  findInaccessibleStatusMessages,
  cleanupAnnouncementCapture,
};

export default ariaLiveHelpers;
