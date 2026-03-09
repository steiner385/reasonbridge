/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Demo Authentication Helper for E2E Tests
 *
 * Provides utilities for logging in with real demo accounts
 * instead of mocking authentication. This allows tests to use
 * the real backend and seeded data.
 *
 * Available demo accounts (from DEMO_CREDENTIALS):
 * - Admin Adams (admin@reasonbridge.demo) - Admin role
 * - Mod Martinez (mod@reasonbridge.demo) - Moderator role
 * - Alice Anderson (alice@reasonbridge.demo) - Power User
 * - Bob Builder (bob@reasonbridge.demo) - Regular User
 * - New User (new@reasonbridge.demo) - New User
 */

import { expect, type Page } from '@playwright/test';

export type DemoUserName =
  | 'Admin Adams'
  | 'Mod Martinez'
  | 'Alice Anderson'
  | 'Bob Builder'
  | 'New User';

/**
 * Login with a demo account using the login modal.
 *
 * Uses the quick-login buttons in the login modal to authenticate
 * with a seeded demo user. This interacts with the real backend
 * and sets up a real authenticated session.
 *
 * @param page - Playwright Page instance
 * @param userName - Display name of the demo user to login as
 *
 * @example
 * ```typescript
 * test('should post response as Alice', async ({ page }) => {
 *   await loginWithDemoAccount(page, 'Alice Anderson');
 *   await page.goto('/topics');
 *   // Now authenticated as Alice with real session
 * });
 * ```
 */
export async function loginWithDemoAccount(page: Page, userName: DemoUserName): Promise<void> {
  // Start at home page
  await page.goto('/');

  // Click Log In button
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for login modal to appear
  await expect(page.getByRole('dialog')).toBeVisible();

  // Click the demo user's quick-login button
  await page.getByText(userName).click();

  // Click the login button in the modal
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^log in$/i }).click();

  // Wait for modal to close and authentication to complete
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

  // Critical: Wait for auth state to fully stabilize
  // This includes token storage and React state propagation
  await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200); // Allow async localStorage writes to complete
}

/**
 * Logout the current user.
 *
 * Clicks the user menu and logs out, clearing the session.
 *
 * @param page - Playwright Page instance
 */
export async function logout(page: Page): Promise<void> {
  // Click user avatar/menu button
  const userMenu = page.getByRole('button', { name: /account|profile|user menu/i });
  if (await userMenu.isVisible()) {
    await userMenu.click();
    // Click logout option
    await page.getByRole('menuitem', { name: /log out|logout|sign out/i }).click();
    // Wait for logout to complete
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Check if the current page has an authenticated user.
 *
 * @param page - Playwright Page instance
 * @returns true if a user appears to be logged in
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for presence of user-specific elements
  const userIndicator = page.locator('[data-testid="user-avatar"], [aria-label*="Account"]');
  return await userIndicator.isVisible().catch(() => false);
}

/**
 * Navigate to a topic by its seeded title or slug.
 *
 * Useful for tests that need to interact with specific seeded topics.
 *
 * @param page - Playwright Page instance
 * @param topicTitle - Full or partial title of the topic to find
 */
export async function navigateToTopic(page: Page, topicTitle: string): Promise<void> {
  await page.goto('/topics');
  await page.waitForLoadState('networkidle');

  // Click on the topic card with matching title
  const topicCard = page.locator(`[data-testid="topic-card"]:has-text("${topicTitle}")`);
  await expect(topicCard.first()).toBeVisible({ timeout: 10000 });
  await topicCard.first().click();

  // Wait for topic page to load
  await page.waitForLoadState('networkidle');
}

/**
 * Get the first available topic from the topics list.
 *
 * Useful when you need any topic for testing, not a specific one.
 *
 * @param page - Playwright Page instance
 * @returns The title of the first topic, or null if none found
 */
export async function getFirstTopicTitle(page: Page): Promise<string | null> {
  await page.goto('/topics');
  await page.waitForLoadState('networkidle');

  const topicCard = page.locator('[data-testid="topic-card"]').first();
  if (await topicCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    const titleElement = topicCard.locator('h2, h3, [class*="title"]').first();
    return await titleElement.textContent();
  }
  return null;
}
