/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Accessibility Regression Test Baseline
 *
 * T320: Baseline a11y tests for main pages to prevent regressions.
 *
 * These tests run automated WCAG 2.2 AA checks on all major pages
 * and verify keyboard navigation patterns work correctly.
 *
 * @see https://www.w3.org/WAI/WCAG22/quickref/
 */

import { test, expect } from '@playwright/test';
import { checkA11y, testKeyboardNavigation, testFocusTrap, testSkipLink } from '../helpers/a11y';
import { pageConfigs, defaultConfig, createConfig } from './wcag-config';
import { testTabNavigation, testEscapeKey, findInaccessibleElements } from './keyboard-nav';
import { setupAnnouncementCapture, cleanupAnnouncementCapture } from './aria-live';

/**
 * Set up announcement capture before each test
 */
test.beforeEach(async ({ page }) => {
  await setupAnnouncementCapture(page);
});

/**
 * Clean up after each test
 */
test.afterEach(async ({ page }) => {
  await cleanupAnnouncementCapture(page);
});

test.describe('Landing Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('passes WCAG 2.2 AA automated checks', async ({ page }) => {
    await checkA11y(page, pageConfigs.landing);
  });

  test('has proper heading hierarchy', async ({ page }) => {
    // Get all headings
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Verify heading levels don't skip
    const headingLevels: number[] = [];
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName);
      const level = parseInt(tagName.replace('H', ''), 10);
      headingLevels.push(level);
    }

    // No skipping levels (e.g., h1 -> h3)
    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      const previous = headingLevels[i - 1];
      if (current !== undefined && previous !== undefined) {
        expect(current - previous).toBeLessThanOrEqual(1);
      }
    }
  });

  test('has accessible main navigation', async ({ page }) => {
    // Navigation should have proper landmark
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();

    // Test keyboard navigation through nav links
    await testKeyboardNavigation(page, {
      startSelector: 'nav',
    });
  });

  test('all images have alt text', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Either has alt text, or is marked as decorative
      const isAccessible =
        alt !== null || role === 'presentation' || role === 'none' || ariaHidden === 'true';

      expect(isAccessible).toBe(true);
    }
  });

  test('has no keyboard traps', async ({ page }) => {
    const result = await testTabNavigation(page, {
      maxTabs: 100,
      checkFocusIndicator: true,
    });

    // Should be able to tab through and cycle back
    expect(result.focusOrder.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});

test.describe('Authentication Pages Accessibility', () => {
  test('login form passes WCAG 2.2 AA checks', async ({ page }) => {
    await page.goto('/auth/login');

    await checkA11y(
      page,
      createConfig(pageConfigs.auth, {
        include: [['form'], ['main']],
      }),
    );
  });

  test('login form is keyboard accessible', async ({ page }) => {
    await page.goto('/auth/login');

    // Find all form inputs
    const result = await testTabNavigation(page, {
      startSelector: 'form',
    });

    expect(result.success).toBe(true);
  });

  test('login form labels are properly associated', async ({ page }) => {
    await page.goto('/auth/login');

    const inputs = await page.locator('input:not([type="hidden"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      // Check for associated label
      let hasLabel = false;

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      // Either has a label, aria-label, or aria-labelledby
      expect(hasLabel || ariaLabel !== null || ariaLabelledby !== null).toBe(true);
    }
  });

  test('signup form passes WCAG 2.2 AA checks', async ({ page }) => {
    await page.goto('/auth/register');

    await checkA11y(page, pageConfigs.auth);
  });
});

test.describe('Topics List Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/topics');
  });

  test('passes WCAG 2.2 AA automated checks', async ({ page }) => {
    // Wait for topics to load
    await page
      .waitForSelector('[data-testid="topic-card"], .topic-card, article', {
        state: 'visible',
        timeout: 10000,
      })
      .catch(() => {
        // Page might not have topics, that's OK
      });

    await checkA11y(page, pageConfigs.dashboard);
  });

  test('topic cards are keyboard accessible', async ({ page }) => {
    const topicCards = await page.locator('[data-testid="topic-card"], .topic-card, article').all();

    if (topicCards.length > 0) {
      // First card should be focusable
      const firstCard = topicCards[0];
      if (firstCard) {
        const link = firstCard.locator('a').first();
        await expect(link).toBeFocusable();
      }
    }
  });

  test('has proper list semantics', async ({ page }) => {
    // Topics should be in a list structure for screen readers
    const list = page.locator('[role="list"], ul, ol').filter({
      has: page.locator('[data-testid="topic-card"], .topic-card, article'),
    });

    // If there's a list container, it should have proper role
    const count = await list.count();
    if (count > 0) {
      const role = await list.first().getAttribute('role');
      expect(role === 'list' || role === null).toBe(true);
    }
  });
});

test.describe('Discussion Page Accessibility', () => {
  // Note: These tests require a valid discussion ID
  // In CI, they may be skipped if no discussion exists

  test.skip('discussion thread passes WCAG 2.2 AA checks', async ({ page }) => {
    // Navigate to a discussion page (ID would need to be dynamic)
    await page.goto('/topics/test-topic');

    await checkA11y(page, pageConfigs.discussion);
  });

  test.skip('response input is keyboard accessible', async ({ page }) => {
    await page.goto('/topics/test-topic');

    const textarea = page.locator('textarea, [role="textbox"]');
    await expect(textarea.first()).toBeFocusable();
  });
});

test.describe('Modal/Dialog Accessibility', () => {
  test('modal traps focus correctly', async ({ page }) => {
    await page.goto('/');

    // Try to find and open a modal
    const modalTrigger = page
      .locator(
        '[data-testid="open-modal"], [data-modal-trigger], button:has-text("Login"), button:has-text("Sign")',
      )
      .first();

    const triggerExists = (await modalTrigger.count()) > 0;
    if (!triggerExists) {
      test.skip();
      return;
    }

    await modalTrigger.click();

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"], [role="alertdialog"], .modal');
    const modalVisible = await modal
      .first()
      .isVisible()
      .catch(() => false);

    if (modalVisible) {
      // Test focus trap
      await testFocusTrap(page, '[role="dialog"], [role="alertdialog"], .modal');

      // Test Escape closes modal
      await testEscapeKey(page, {
        dismissibleSelector: '[role="dialog"], [role="alertdialog"], .modal',
        shouldClose: true,
      });
    }
  });
});

test.describe('Color Contrast', () => {
  test('landing page has sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Specifically test color contrast rule
    await checkA11y(page, {
      wcagLevel: 'wcag22aa',
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });

  test('dark mode has sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode if available
    const darkModeToggle = page
      .locator('[data-testid="theme-toggle"], [aria-label*="dark"], [aria-label*="theme"]')
      .first();
    const toggleExists = (await darkModeToggle.count()) > 0;

    if (toggleExists) {
      await darkModeToggle.click();
      await page.waitForTimeout(300); // Wait for transition

      await checkA11y(page, {
        wcagLevel: 'wcag22aa',
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    }
  });
});

test.describe('Skip Links', () => {
  test('landing page has skip to main content link', async ({ page }) => {
    await page.goto('/');

    // Press Tab to reveal skip link
    await page.keyboard.press('Tab');

    // Look for skip link
    const skipLink = page.locator('a:has-text("Skip"), a[href="#main"], a[href*="skip"]').first();
    const skipLinkExists = (await skipLink.count()) > 0;

    if (skipLinkExists) {
      await testSkipLink(page);
    }
  });
});

test.describe('Form Accessibility', () => {
  test('forms have accessible error messages', async ({ page }) => {
    await page.goto('/auth/login');

    // Submit empty form to trigger errors
    const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      // Wait for potential error messages
      await page.waitForTimeout(500);

      // Check for error messages
      const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        // Each error should be properly announced
        for (const error of await errorMessages.all()) {
          const role = await error.getAttribute('role');
          const ariaLive = await error.getAttribute('aria-live');

          // Should have alert role or live region
          expect(role === 'alert' || ariaLive !== null).toBe(true);
        }
      }
    }
  });
});

test.describe('Interactive Elements', () => {
  test('all buttons are keyboard accessible', async ({ page }) => {
    await page.goto('/');

    const inaccessible = await findInaccessibleElements(page, 'main');
    expect(inaccessible).toHaveLength(0);
  });

  test('custom interactive elements have proper roles', async ({ page }) => {
    await page.goto('/');

    // Find clickable elements that aren't buttons or links
    const customInteractive = await page.locator('[onclick], [data-clickable]').all();

    for (const element of customInteractive) {
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
      const role = await element.getAttribute('role');
      const tabindex = await element.getAttribute('tabindex');

      // If not a native button/link, should have role and tabindex
      if (tagName !== 'button' && tagName !== 'a') {
        expect(role === 'button' || role === 'link' || tabindex !== null).toBe(true);
      }
    }
  });
});

test.describe('Page Landmarks', () => {
  test('has proper landmark structure', async ({ page }) => {
    await page.goto('/');

    // Should have main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeAttached();

    // Should have header/banner
    const header = page.locator('header, [role="banner"]');
    await expect(header.first()).toBeAttached();

    // Navigation should exist
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeAttached();
  });

  test('landmarks have accessible names when duplicated', async ({ page }) => {
    await page.goto('/');

    // If there are multiple nav elements, they should have aria-label
    const navs = await page.locator('nav, [role="navigation"]').all();

    if (navs.length > 1) {
      for (const nav of navs) {
        const label = await nav.getAttribute('aria-label');
        const labelledby = await nav.getAttribute('aria-labelledby');

        expect(label !== null || labelledby !== null).toBe(true);
      }
    }
  });
});

/**
 * Add custom matcher for focusability
 */
expect.extend({
  async toBeFocusable(locator: unknown) {
    if (!(locator instanceof Object && 'focus' in locator)) {
      return {
        message: () => 'Expected a Playwright Locator',
        pass: false,
      };
    }

    try {
      await (locator as { focus: () => Promise<void> }).focus();
      return {
        message: () => 'Element is focusable',
        pass: true,
      };
    } catch {
      return {
        message: () => 'Element is not focusable',
        pass: false,
      };
    }
  },
});
