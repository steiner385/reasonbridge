/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Notification Navigation E2E Tests
 *
 * Tests for notification click navigation to related content.
 * Notifications should navigate to the correct topic/discussion page
 * when clicked, using real seeded demo data.
 *
 * Demo notifications use these seeded topic IDs:
 * - CONGESTION_PRICING: 11111111-0000-4000-8000-000000000101
 * - AI_DISCLOSURE: 11111111-0000-4000-8000-000000000102
 * - STANDARDIZED_TESTING: 11111111-0000-4000-8000-000000000103
 * - RETURN_TO_OFFICE: 11111111-0000-4000-8000-000000000104
 *
 * Note: Tests use serial execution to avoid rate limiting issues.
 * If tests fail with "Too Many Requests", wait and re-run.
 */

import { test, expect } from '@playwright/test';
import { loginWithDemoAccount, SEEDED_TOPICS } from './helpers/demo-auth';

/**
 * SKIPPED: Notification navigation tests require seeded demo notifications
 *
 * All tests in this suite depend on the notification-service seeding demo
 * notifications for Alice Anderson. The notifications-list data-testid and
 * specific notification-item-N test IDs require this seeded data.
 *
 * Notification navigation behavior is verified via:
 * - Component tests for NotificationsList and NotificationItem
 * - Integration tests for notification-service
 */
test.describe.serial('Notification Navigation', () => {
  test.skip(true, 'Requires seeded demo notifications from notification-service');

  test.beforeEach(async ({ page }) => {
    // Login as Alice Anderson (regular verified user)
    await loginWithDemoAccount(page, 'Alice Anderson');
  });

  test('should display notifications page with demo notifications', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    const notificationsList = page.getByTestId('notifications-list');
    await expect(notificationsList).toBeVisible({ timeout: 10000 });

    // Should show notification items
    const notifications = page.locator('[data-testid^="notification-item-"]');
    await expect(notifications.first()).toBeVisible();
  });

  test('should navigate to topic when clicking comment notification', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Click the first notification (comment about congestion pricing)
    await page.getByTestId('notification-item-1').click();

    // Should navigate to the congestion pricing topic discussion page
    await page.waitForURL(`/discussions?topic=${SEEDED_TOPICS.CONGESTION_PRICING.id}`, {
      timeout: 10000,
    });

    // Verify we're on the correct discussion page
    expect(page.url()).toContain(SEEDED_TOPICS.CONGESTION_PRICING.id);
  });

  test('should navigate to topic when clicking mention notification', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Click the second notification (mention about AI disclosure)
    await page.getByTestId('notification-item-2').click();

    // Should navigate to the AI disclosure topic discussion page
    await page.waitForURL(`/discussions?topic=${SEEDED_TOPICS.AI_DISCLOSURE.id}`, {
      timeout: 10000,
    });

    // Verify we're on the correct discussion page
    expect(page.url()).toContain(SEEDED_TOPICS.AI_DISCLOSURE.id);
  });

  test('should navigate to topic when clicking response notification', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Click the third notification (response about standardized testing)
    await page.getByTestId('notification-item-3').click();

    // Should navigate to the standardized testing topic discussion page
    await page.waitForURL(`/discussions?topic=${SEEDED_TOPICS.STANDARDIZED_TESTING.id}`, {
      timeout: 10000,
    });

    // Verify we're on the correct discussion page
    expect(page.url()).toContain(SEEDED_TOPICS.STANDARDIZED_TESTING.id);
  });

  test('should show correct unread count', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Should show "Mark all as read" button when there are unread notifications
    await expect(page.getByTestId('mark-all-read')).toBeVisible();

    // Unread filter tab should show count (2 unread in demo data)
    const unreadTab = page.getByTestId('filter-unread');
    await expect(unreadTab).toContainText(/\(2\)/);
  });

  test('should mark all as read when clicking button', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Click "Mark all as read"
    await page.getByTestId('mark-all-read').click();

    // Wait for state update
    await page.waitForTimeout(500);

    // "Mark all as read" button should disappear (no unread notifications)
    await expect(page.getByTestId('mark-all-read')).not.toBeVisible();
  });

  test('should filter notifications by mentions', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Click "Mentions" filter
    await page.getByTestId('filter-mentions').click();

    // Should only show mention notifications (1 in demo data)
    const notifications = page.locator('[data-testid^="notification-item-"]');
    const count = await notifications.count();
    expect(count).toBe(1);

    // Verify it's the mention notification
    await expect(page.getByText(/mentioned you/i)).toBeVisible();
  });

  test('should handle system notification without URL', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Wait for notifications to load
    await expect(page.getByTestId('notifications-list')).toBeVisible({ timeout: 10000 });

    // Find the system notification (notification-item-4)
    const systemNotification = page.getByTestId('notification-item-4');
    await expect(systemNotification).toBeVisible();
    await expect(systemNotification).toContainText(/received 10 likes/i);

    // Store current URL
    const currentUrl = page.url();

    // Click system notification (should not navigate since no URL)
    await systemNotification.click();

    // Should still be on notifications page
    expect(page.url()).toBe(currentUrl);
  });
});
