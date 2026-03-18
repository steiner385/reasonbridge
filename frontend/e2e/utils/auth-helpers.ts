/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Authentication helpers for E2E tests
 *
 * Provides utilities for logging in with test accounts
 * and managing authentication state during tests.
 */

import type { Page } from '@playwright/test';

/**
 * Test user credentials
 */
export interface TestUser {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Pre-defined test users
 */
export const TEST_USERS = {
  verified: {
    email: 'verified@test.com',
    password: 'TestPassword123!',
    displayName: 'Verified User',
  },
  basic: {
    email: 'basic@test.com',
    password: 'TestPassword123!',
    displayName: 'Basic User',
  },
  admin: {
    email: 'admin@test.com',
    password: 'AdminPassword123!',
    displayName: 'Admin User',
  },
} as const;

/**
 * Login with a test user using the login modal
 *
 * @param page - Playwright Page instance
 * @param user - Test user credentials
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  // Click login button in header
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for login modal (use specific selector to avoid confusion with other modals)
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'visible' });

  // Check if demo accounts are available
  const demoAccount = page.getByText(user.displayName);
  const dialog = page.locator('[data-testid="login-modal"]');
  if (await demoAccount.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Use demo account login
    await demoAccount.click();
    await dialog.getByRole('button', { name: /^log in$/i }).click();
  } else {
    // Use email/password login
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /^log in$/i }).click();
  }

  // Wait for login to complete
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'hidden', timeout: 10000 });

  // Wait for auth state to stabilize
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Login with a demo account by name
 *
 * @param page - Playwright Page instance
 * @param accountName - Display name of the demo account (e.g., "Admin Adams")
 */
export async function loginWithDemoAccount(
  page: Page,
  accountName: string = 'Admin Adams',
): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /log in/i }).click();

  // Wait for login modal (use specific selector to avoid confusion with other modals)
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'visible' });

  // Select demo account
  await page.getByText(accountName).click();
  const dialog = page.locator('[data-testid="login-modal"]');
  await dialog.getByRole('button', { name: /^log in$/i }).click();

  // Wait for login to complete
  await page.waitForSelector('[data-testid="login-modal"]', { state: 'hidden', timeout: 10000 });

  // Wait for navigation and auth state to stabilize
  await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

/**
 * Logout the current user
 *
 * @param page - Playwright Page instance
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu
  const userMenu = page.getByTestId('user-menu');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.getByRole('menuitem', { name: /log out|sign out/i }).click();

    // Wait for logout to complete
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright Page instance
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const userMenu = page.getByTestId('user-menu');
  return userMenu.isVisible({ timeout: 2000 }).catch(() => false);
}
