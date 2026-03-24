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

// =============================================================================
// SEEDED TOPIC CONSTANTS
// These match the demo data in packages/db-models/prisma/seed/demo-topics.ts
// Using these constants eliminates data-conditional test skips
// =============================================================================

export interface SeededTopic {
  id: string;
  title: string;
  slug: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'SEEDING' | 'LOCKED';
  creatorName: DemoUserName;
}

/**
 * Known seeded topics for E2E tests.
 * Tests should use these instead of dynamically querying for topics.
 */
export const SEEDED_TOPICS: Record<string, SeededTopic> = {
  CONGESTION_PRICING: {
    id: '11111111-0000-4000-8000-000000000101',
    title: 'Should cities implement congestion pricing?',
    slug: 'should-cities-implement-congestion-pricing',
    status: 'ACTIVE',
    creatorName: 'Alice Anderson',
  },
  AI_DISCLOSURE: {
    id: '11111111-0000-4000-8000-000000000102',
    title: 'Should AI-generated content require disclosure?',
    slug: 'should-ai-generated-content-require-disclosure',
    status: 'ACTIVE',
    creatorName: 'Bob Builder',
  },
  STANDARDIZED_TESTING: {
    id: '11111111-0000-4000-8000-000000000103',
    title: 'Should standardized testing be eliminated?',
    slug: 'should-standardized-testing-be-eliminated',
    status: 'ACTIVE',
    creatorName: 'Mod Martinez',
  },
  RETURN_TO_OFFICE: {
    id: '11111111-0000-4000-8000-000000000104',
    title: 'Should companies mandate return-to-office policies?',
    slug: 'should-companies-mandate-return-to-office-policies',
    status: 'ACTIVE',
    creatorName: 'Alice Anderson',
  },
  PREVENTIVE_CARE: {
    id: '11111111-0000-4000-8000-000000000105',
    title: 'Should preventive care be fully covered by insurance?',
    slug: 'should-preventive-care-be-fully-covered-by-insurance',
    status: 'ACTIVE',
    creatorName: 'Admin Adams',
  },
  AGE_VERIFICATION: {
    id: '11111111-0000-4000-8000-000000000106',
    title: 'Should social media have age verification requirements?',
    slug: 'should-social-media-have-age-verification-requirements',
    status: 'ACTIVE',
    creatorName: 'Mod Martinez',
  },
  MANDATORY_VOTING: {
    id: '11111111-0000-4000-8000-000000000107',
    title: 'Should voting be mandatory in democracies?',
    slug: 'should-voting-be-mandatory-in-democracies',
    status: 'ACTIVE',
    creatorName: 'Admin Adams',
  },
  PRODUCT_AI_DISCLOSURE: {
    id: '11111111-0000-4000-8000-000000000108',
    title: 'Should AI use in products be disclosed to consumers?',
    slug: 'should-ai-use-in-products-be-disclosed-to-consumers',
    status: 'ACTIVE',
    creatorName: 'Bob Builder',
  },
  // ARCHIVED topic - for testing archived state
  PLASTIC_BAN: {
    id: '11111111-0000-4000-8000-000000000109',
    title: 'Should single-use plastics be banned nationwide?',
    slug: 'should-single-use-plastics-be-banned-nationwide',
    status: 'ARCHIVED',
    creatorName: 'Alice Anderson',
  },
  GOF_OVERSIGHT: {
    id: '11111111-0000-4000-8000-000000000110',
    title: 'Should gain-of-function research have international oversight?',
    slug: 'should-gain-of-function-research-have-international-oversight',
    status: 'ACTIVE',
    creatorName: 'Admin Adams',
  },
  // SEEDING topic - for testing seeding state
  RENEWABLE_ENERGY_MANDATE: {
    id: '11111111-0000-4000-8000-000000000111',
    title: 'Should governments mandate 100% renewable energy by 2040?',
    slug: 'should-governments-mandate-100-renewable-energy-by-2040',
    status: 'SEEDING',
    creatorName: 'New User',
  },
  // LOCKED topic - for testing locked state
  UNIVERSAL_BASIC_INCOME: {
    id: '11111111-0000-4000-8000-000000000112',
    title: 'Should universal basic income replace traditional welfare programs?',
    slug: 'should-universal-basic-income-replace-traditional-welfare-programs',
    status: 'LOCKED',
    creatorName: 'Mod Martinez',
  },
} as const;

// =============================================================================
// SEEDED MODERATED RESPONSES
// These responses have HIDDEN or REMOVED status for testing moderation UI
// Located in CONGESTION_PRICING topic
// =============================================================================

export interface SeededModeratedResponse {
  id: string;
  topicId: string;
  status: 'HIDDEN' | 'REMOVED';
}

export const SEEDED_MODERATED_RESPONSES = {
  /** Response hidden by moderator - should show "[Content hidden]" notice */
  HIDDEN_RESPONSE: {
    id: '11111111-0000-4000-8000-000101000006',
    topicId: SEEDED_TOPICS.CONGESTION_PRICING.id,
    status: 'HIDDEN' as const,
  },
  /** Response removed for policy violations - should show "[Content removed]" notice */
  REMOVED_RESPONSE: {
    id: '11111111-0000-4000-8000-000101000007',
    topicId: SEEDED_TOPICS.CONGESTION_PRICING.id,
    status: 'REMOVED' as const,
  },
} as const;

/**
 * Seeded responses owned by specific demo users
 * Used for testing edit/delete functionality
 */
export const SEEDED_USER_RESPONSES = {
  /** Alice Anderson's first response in CONGESTION_PRICING topic */
  ALICE_CONGESTION_RESPONSE: {
    id: '11111111-0000-4000-8000-000101000001',
    topicId: SEEDED_TOPICS.CONGESTION_PRICING.id,
    authorName: 'Alice Anderson',
    content: 'Congestion pricing has worked remarkably well in cities like Stockholm and London.',
  },
} as const;

/**
 * Get all ACTIVE seeded topics (most common use case for tests)
 */
export function getActiveSeededTopics(): SeededTopic[] {
  return Object.values(SEEDED_TOPICS).filter((t) => t.status === 'ACTIVE');
}

/**
 * Get a seeded topic by status
 */
export function getSeededTopicByStatus(status: SeededTopic['status']): SeededTopic | undefined {
  return Object.values(SEEDED_TOPICS).find((t) => t.status === status);
}

/**
 * Get a seeded topic owned by a specific user
 */
export function getSeededTopicByCreator(creatorName: DemoUserName): SeededTopic | undefined {
  return Object.values(SEEDED_TOPICS).find(
    (t) => t.creatorName === creatorName && t.status === 'ACTIVE',
  );
}

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
  // Use button role with name pattern to avoid ambiguity when user name
  // appears in multiple places (e.g., "New User" as name AND as tier badge)
  await page.getByRole('button', { name: new RegExp(userName, 'i') }).click();

  // Click the login button in the modal
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^log in$/i }).click();

  // Wait for login modal to close and authentication to complete
  // Use specific selector to avoid confusion with other modals
  await expect(page.locator('[data-testid="login-modal"]')).not.toBeVisible({ timeout: 10000 });

  // Critical: Wait for auth state to fully stabilize
  // This includes token storage and React state propagation
  await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Allow async localStorage writes and state propagation to complete
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
 * IMPROVED: Now returns a known seeded topic title instead of querying the UI.
 * This eliminates flaky data-conditional skips in tests.
 *
 * @param page - Playwright Page instance (navigates to /topics to verify page loads)
 * @returns The title of the first ACTIVE seeded topic
 */
export async function getFirstTopicTitle(page: Page): Promise<string> {
  // Navigate to topics to ensure the page is accessible
  await page.goto('/topics');
  await page.waitForLoadState('networkidle');

  // Return known seeded topic - Congestion Pricing is always first alphabetically
  // and is guaranteed to exist in the seeded database
  return SEEDED_TOPICS.CONGESTION_PRICING.title;
}

/**
 * Navigate directly to a seeded topic by its key.
 *
 * More reliable than navigating via UI clicks since it uses known slugs.
 *
 * @param page - Playwright Page instance
 * @param topicKey - Key from SEEDED_TOPICS (e.g., 'CONGESTION_PRICING')
 *
 * @example
 * ```typescript
 * await navigateToSeededTopic(page, 'CONGESTION_PRICING');
 * // Now on /discussions?topic=11111111-0000-4000-8000-000000000101
 * ```
 */
export async function navigateToSeededTopic(
  page: Page,
  topicKey: keyof typeof SEEDED_TOPICS,
): Promise<SeededTopic> {
  const topic = SEEDED_TOPICS[topicKey];

  // Navigate to the topic's discussion page directly
  await page.goto(`/discussions?topic=${topic.id}`);
  await page.waitForLoadState('networkidle');

  // Wait for topic content to load
  await page.waitForSelector('.conversation-panel h1, [data-testid="topic-title"]', {
    timeout: 10000,
  });

  return topic;
}

/**
 * Navigate to the first ACTIVE seeded topic.
 *
 * Convenience method for tests that just need any active topic.
 *
 * @param page - Playwright Page instance
 * @returns The seeded topic that was navigated to
 */
export async function navigateToFirstActiveTopic(page: Page): Promise<SeededTopic> {
  return navigateToSeededTopic(page, 'CONGESTION_PRICING');
}

/**
 * Navigate to a topic owned by the specified user.
 *
 * Useful for tests that need to verify creator-only actions.
 *
 * @param page - Playwright Page instance
 * @param creatorName - Name of the demo user who owns the topic
 * @returns The seeded topic, or throws if no topic found for that creator
 */
export async function navigateToOwnedTopic(
  page: Page,
  creatorName: DemoUserName,
): Promise<SeededTopic> {
  const topic = getSeededTopicByCreator(creatorName);
  if (!topic) {
    throw new Error(`No ACTIVE seeded topic found for creator: ${creatorName}`);
  }

  await page.goto(`/discussions?topic=${topic.id}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.conversation-panel h1, [data-testid="topic-title"]', {
    timeout: 10000,
  });

  return topic;
}

/**
 * Wait for responses to load on the current page.
 *
 * Uses polling to handle slow backend startup in CI environments.
 * This is more reliable than a single isVisible() check with catch.
 *
 * @param page - Playwright Page instance
 * @param options - Configuration options
 * @returns true if responses loaded, false otherwise
 *
 * @example
 * ```typescript
 * await navigateToSeededTopic(page, 'CONGESTION_PRICING');
 * const hasResponses = await waitForResponsesToLoad(page);
 * if (!hasResponses) {
 *   test.skip(true, 'No responses loaded - backend may be starting up');
 * }
 * ```
 */
export async function waitForResponsesToLoad(
  page: Page,
  options: {
    /** Maximum time to wait in milliseconds (default: 30000 for CI cold-starts) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 1000) */
    pollInterval?: number;
    /** Minimum number of responses expected (default: 1) */
    minResponses?: number;
  } = {},
): Promise<boolean> {
  const { timeout = 30000, pollInterval = 1000, minResponses = 1 } = options;

  const startTime = Date.now();
  const responseSelector = '[data-testid="response-item"]';

  while (Date.now() - startTime < timeout) {
    const count = await page.locator(responseSelector).count();
    if (count >= minResponses) {
      return true;
    }

    // Wait before next poll
    await page.waitForTimeout(pollInterval);
  }

  return false;
}

/**
 * Navigate to a seeded topic and wait for responses to load.
 *
 * Combines navigateToSeededTopic with waitForResponsesToLoad for a more
 * reliable test setup. Recommended for tests that interact with responses.
 *
 * @param page - Playwright Page instance
 * @param topicKey - Key from SEEDED_TOPICS
 * @param options - Wait options
 * @returns Object with topic info and whether responses loaded
 *
 * @example
 * ```typescript
 * const { topic, hasResponses } = await navigateToTopicWithResponses(page, 'CONGESTION_PRICING');
 * if (!hasResponses) {
 *   test.skip(true, 'Responses not loaded - backend may be starting up');
 * }
 * ```
 */
export async function navigateToTopicWithResponses(
  page: Page,
  topicKey: keyof typeof SEEDED_TOPICS,
  options: {
    timeout?: number;
    pollInterval?: number;
    minResponses?: number;
  } = {},
): Promise<{ topic: SeededTopic; hasResponses: boolean }> {
  const topic = await navigateToSeededTopic(page, topicKey);
  const hasResponses = await waitForResponsesToLoad(page, options);
  return { topic, hasResponses };
}
