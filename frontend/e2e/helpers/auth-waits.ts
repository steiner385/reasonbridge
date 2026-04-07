/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication Wait Helpers for E2E Tests
 *
 * Provides utilities to wait for authentication state to stabilize.
 * These replace `waitForLoadState('networkidle')` which hangs forever
 * because WebSocket connections keep the network active.
 *
 * @remarks
 * **Why 'networkidle' fails:**
 * When a user logs in, the frontend establishes a WebSocket connection
 * (Socket.io) for real-time updates. This persistent connection means
 * Playwright's 'networkidle' condition is never satisfied.
 *
 * **The solution:**
 * Wait for specific UI elements that indicate the desired state instead
 * of waiting for network to be idle.
 */

import { expect, type Page } from '@playwright/test';

/**
 * Wait for authentication state to stabilize after login.
 *
 * Use instead of `waitForLoadState('networkidle')` which hangs due to WebSocket.
 * This waits for the Profile link to appear (only visible when authenticated)
 * and allows time for async localStorage writes and React state propagation.
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * // REPLACE:
 * await page.waitForLoadState('networkidle');
 *
 * // WITH:
 * await waitForAuthState(page);
 * ```
 */
export async function waitForAuthState(
  page: Page,
  options: {
    /** Timeout for waiting for Profile link (default: 10000ms) */
    timeout?: number;
    /** Additional wait time for async operations (default: 200ms) */
    settleTime?: number;
  } = {},
): Promise<void> {
  const { timeout = 10000, settleTime = 200 } = options;

  await expect(page.getByRole('link', { name: 'Profile', exact: true })).toBeVisible({
    timeout,
  });

  // Brief wait for async localStorage writes and React state propagation
  await page.waitForTimeout(settleTime);
}

/**
 * Wait for page content to stabilize without relying on 'networkidle'.
 *
 * Use after navigation or actions that trigger API calls but don't involve
 * authentication state changes.
 *
 * @param page - Playwright Page instance
 * @param selector - CSS selector or data-testid to wait for
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * // After voting, wait for UI to update
 * await waitForUIStable(page, '[data-testid="vote-count"]');
 * ```
 */
export async function waitForUIStable(
  page: Page,
  selector: string,
  options: {
    /** Timeout for waiting for selector (default: 10000ms) */
    timeout?: number;
    /** Additional settle time (default: 300ms) */
    settleTime?: number;
  } = {},
): Promise<void> {
  const { timeout = 10000, settleTime = 300 } = options;

  await page.waitForSelector(selector, { timeout });
  await page.waitForTimeout(settleTime);
}

/**
 * Wait after an action that triggers an API call.
 *
 * Use instead of `waitForLoadState('networkidle')` after clicks
 * that trigger mutations (votes, posts, etc.)
 *
 * @param page - Playwright Page instance
 * @param waitTime - Time to wait in milliseconds (default: 500ms)
 *
 * @example
 * ```typescript
 * // REPLACE:
 * await upvoteButton.click();
 * await page.waitForLoadState('networkidle');
 * await page.waitForTimeout(300);
 *
 * // WITH:
 * await upvoteButton.click();
 * await waitForAPIAction(page);
 * ```
 */
export async function waitForAPIAction(page: Page, waitTime = 500): Promise<void> {
  await page.waitForTimeout(waitTime);
}

/**
 * Wait for logout state (Profile link disappears).
 *
 * Use instead of 'networkidle' after logout actions.
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 */
export async function waitForLogoutState(
  page: Page,
  options: {
    timeout?: number;
    settleTime?: number;
  } = {},
): Promise<void> {
  const { timeout = 10000, settleTime = 200 } = options;

  await expect(page.getByRole('link', { name: 'Profile', exact: true })).not.toBeVisible({
    timeout,
  });

  await page.waitForTimeout(settleTime);
}
