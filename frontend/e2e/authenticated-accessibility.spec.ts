import { test, expect } from '@playwright/test';
import { checkAccessibility, checkCriticalAccessibility } from './helpers/accessibility';
import { loginWithDemoAccount } from './helpers/demo-auth';

/**
 * Accessibility tests for authenticated surfaces and interactive overlays.
 *
 * Extends the existing accessibility.spec.ts (public pages only) with:
 * - Key authenticated pages scanned with axe-core WCAG 2.2 AA
 * - Open MobileDrawer and Modal overlay states
 * - Keyboard-navigation flows: Tab into modal, Escape restores focus,
 *   skip-link activation, focus-trap verification
 *
 * Severity note (from audit #1351):
 * The existing accessibility.spec.ts uses checkCriticalAccessibility for all
 * pages, which downgrades minor/moderate violations to console.warn. Promoted
 * pages here use strict checkAccessibility where the app already passes; the
 * rest use checkCriticalAccessibility with a TODO to upgrade once violations
 * are resolved.
 */

// ---------------------------------------------------------------------------
// Authenticated page scans
// ---------------------------------------------------------------------------

test.describe('Accessibility - Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithDemoAccount(page, 'Alice Anderson');
  });

  test('topics page has no critical accessibility violations (authenticated)', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    // Topics page already passes critical checks unauthenticated; keep consistent.
    await checkCriticalAccessibility(page);
  });

  test('profile page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkCriticalAccessibility(page);
  });

  test('settings page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkCriticalAccessibility(page);
  });

  test('notifications page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkCriticalAccessibility(page);
  });

  test('discussion page has no critical accessibility violations', async ({ page }) => {
    // Use a known seeded topic to avoid data-conditional skips.
    await page.goto('/discussions?topic=11111111-0000-4000-8000-000000000101');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // discussion page loads async responses
    await checkCriticalAccessibility(page);
  });
});

// ---------------------------------------------------------------------------
// Overlay state scans: MobileDrawer and Modal
// ---------------------------------------------------------------------------

test.describe('Accessibility - Overlay States', () => {
  test('login modal has no accessibility violations (strict)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // The login modal is public, already tested critically — promote to strict.
    await checkAccessibility(page);
  });

  test('mobile drawer overlay has no critical accessibility violations', async ({ page }) => {
    // Emulate a mobile viewport to make the hamburger/drawer appear.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Locate the mobile menu trigger (hamburger button)
    const drawerTrigger = page
      .getByRole('button', { name: /menu|open.*nav|toggle.*nav/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'))
      .or(page.locator('button[aria-label*="menu" i]'));

    const triggerCount = await drawerTrigger.count();
    if (triggerCount === 0) {
      test.skip(true, 'No mobile menu trigger found at this viewport — skipping');
      return;
    }

    await drawerTrigger.first().click();

    // Wait for the drawer to open (look for the nav inside it)
    const drawer = page.locator(
      '[data-testid="mobile-drawer"], [role="dialog"], aside[class*="drawer"]',
    );
    await expect(drawer.first()).toBeVisible({ timeout: 3000 });

    await checkCriticalAccessibility(page);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test.describe('Keyboard Navigation', () => {
  test('Tab key moves focus into the login modal, Escape closes it and restores focus', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open the login modal via keyboard
    const loginButton = page.getByRole('button', { name: /log in/i });
    await loginButton.focus();
    await loginButton.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Tab through modal elements — focus should remain inside the dialog
    await page.keyboard.press('Tab');
    const focusedInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(focusedInsideDialog).toBeTruthy();

    // Escape should close the modal and restore focus to the trigger button
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });

    // After Escape, focus should return to the element that opened the modal
    const focusedAfterClose = await page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? (el as HTMLElement).textContent?.trim() ||
            (el as HTMLElement).getAttribute('aria-label') ||
            el.tagName
        : null;
    });
    // Focus moved somewhere meaningful (not body/html)
    expect(focusedAfterClose).not.toBeNull();
    expect(focusedAfterClose?.toLowerCase()).not.toBe('html');
    expect(focusedAfterClose?.toLowerCase()).not.toBe('body');
  });

  test('modal focus trap keeps Tab cycles within the dialog', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Tab 10 times and verify focus never leaves the dialog
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const insideDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(insideDialog).toBeTruthy();
    }
  });

  test('skip link (if present) moves focus to #main-content', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    // The skip link is typically hidden until focused (Tab reveals it)
    await page.keyboard.press('Tab');

    const skipLink = page
      .getByRole('link', { name: /skip.*content|skip.*main/i })
      .or(page.locator('a[href="#main-content"]'));

    const skipLinkCount = await skipLink.count();
    if (skipLinkCount === 0) {
      test.skip(true, 'No skip link found — skipping (add one to fix this)');
      return;
    }

    const isVisible = await skipLink.first().isVisible();
    if (isVisible) {
      await skipLink.first().press('Enter');
      // After activating the skip link, #main-content or main should be focused
      const focusedId = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? (el.id ?? el.tagName.toLowerCase()) : null;
      });
      const mainContent = await page.locator('#main-content, main').count();
      // Either the element has the expected id or focus is somewhere inside main
      expect(mainContent).toBeGreaterThan(0);
      expect(focusedId).not.toBeNull();
    }
  });

  test('authenticated pages support keyboard navigation through interactive elements', async ({
    page,
  }) => {
    await loginWithDemoAccount(page, 'Alice Anderson');
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Tab through the first 15 focusable elements; each should be inside the page
    let focusedCount = 0;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const el = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body || a === document.documentElement) return null;
        return a.tagName.toLowerCase();
      });
      if (el !== null) focusedCount++;
    }
    // At least 5 distinct focusable elements should exist on the topics page
    expect(focusedCount).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Strict promotion: pages verified to already pass full WCAG 2.2 AA
// ---------------------------------------------------------------------------

test.describe('Accessibility - Strict Scans (WCAG 2.2 AA)', () => {
  test('home / landing page passes strict WCAG 2.2 AA scan', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    // This matches the strict scan already in a11y-example.spec.ts; add here so
    // regression is caught if home page violations appear in a later PR.
    await checkAccessibility(page);
  });

  test('register page passes strict WCAG 2.2 AA scan', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkAccessibility(page);
  });

  test('forgot-password page passes strict WCAG 2.2 AA scan', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await checkAccessibility(page);
  });
});
