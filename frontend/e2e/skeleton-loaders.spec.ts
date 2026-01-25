import { test, expect } from '@playwright/test';

/**
 * E2E test suite for skeleton loaders
 *
 * Tests verify that skeleton loaders:
 * - Appear during initial page load
 * - Have correct data-testid attributes for automated testing
 * - Disappear once content loads (or error/empty states show)
 * - Don't cause layout shift (skeletons match content dimensions)
 */

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('Skeleton Loaders', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test.describe('Topics Page Skeleton', () => {
    test('should display topic card skeletons during loading', async ({ page }) => {
      // Throttle network to ensure skeleton is visible
      await page.route('**/api/topics**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/topics');

      // Verify skeleton loaders appear
      const skeletons = page.locator('[data-testid="topic-card-skeleton"]');
      await expect(skeletons.first()).toBeVisible({ timeout: 2000 });

      // Should show 3 skeleton cards (default count)
      expect(await skeletons.count()).toBeGreaterThanOrEqual(1);

      // Wait for skeletons to disappear and content to load
      await expect(skeletons.first()).not.toBeVisible({ timeout: 10000 });
    });

    test('should have accessible skeleton loaders on topics page', async ({ page }) => {
      await page.route('**/api/topics**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/topics');

      const skeleton = page.locator('[data-testid="topic-card-skeleton"]').first();
      await expect(skeleton).toBeVisible({ timeout: 2000 });

      // Verify accessibility attributes
      const statusElement = skeleton.locator('[role="status"]').first();
      await expect(statusElement).toHaveAttribute('aria-busy', 'true');
    });

    test('should transition from skeleton to real content without layout shift', async ({
      page,
    }) => {
      await page.route('**/api/topics**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/topics');

      // Get skeleton dimensions
      const skeleton = page.locator('[data-testid="topic-card-skeleton"]').first();
      await expect(skeleton).toBeVisible({ timeout: 2000 });
      const skeletonBox = await skeleton.boundingBox();

      // Wait for content to load
      await page.waitForSelector('[data-testid="topic-card-skeleton"]', {
        state: 'hidden',
        timeout: 10000,
      });

      // Check if real topic card exists
      const topicCard = page
        .locator('[data-testid="topic-card"], article a[href^="/topics/"]')
        .first();
      const hasTopicCards = (await topicCard.count()) > 0;

      if (hasTopicCards && skeletonBox) {
        const contentBox = await topicCard.boundingBox();
        if (contentBox) {
          // Allow some tolerance for layout differences
          const widthDiff = Math.abs((contentBox.width - skeletonBox.width) / skeletonBox.width);
          // Width should be similar (within 20% tolerance)
          expect(widthDiff).toBeLessThan(0.2);
        }
      }
    });
  });

  test.describe('Topic Detail Page Skeleton', () => {
    test('should display topic detail skeleton during loading', async ({ page }) => {
      await page.goto('/topics');

      // Wait for topics to load first
      await page.waitForSelector('[data-testid="topic-card-skeleton"]', {
        state: 'hidden',
        timeout: 10000,
      });

      // Find and click first topic
      const topicLink = page.locator('a[href^="/topics/"]').first();
      const hasTopics = (await topicLink.count()) > 0;

      if (hasTopics) {
        const href = await topicLink.getAttribute('href');
        const topicId = href?.split('/topics/')[1];

        // Throttle topic detail API
        await page.route(`**/api/topics/${topicId}`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.continue();
        });

        await topicLink.click();

        // Verify skeleton appears
        const skeleton = page.locator('[data-testid="topic-detail-skeleton"]');
        await expect(skeleton).toBeVisible({ timeout: 3000 });

        // Verify skeleton sections
        await expect(page.locator('[data-testid="topic-detail-skeleton-main-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="topic-detail-skeleton-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="topic-detail-skeleton-stats"]')).toBeVisible();

        // Wait for content to load
        await expect(skeleton).not.toBeVisible({ timeout: 10000 });
      }
    });

    test('should display response skeletons in topic detail', async ({ page }) => {
      await page.goto('/topics');

      await page.waitForSelector('[data-testid="topic-card-skeleton"]', {
        state: 'hidden',
        timeout: 10000,
      });

      const topicLink = page.locator('a[href^="/topics/"]').first();
      const hasTopics = (await topicLink.count()) > 0;

      if (hasTopics) {
        const href = await topicLink.getAttribute('href');
        const topicId = href?.split('/topics/')[1];

        await page.route(`**/api/topics/${topicId}`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.continue();
        });

        await topicLink.click();

        // Check for response skeletons
        const responseSkeleton = page.locator('[data-testid="topic-detail-skeleton-responses"]');
        await expect(responseSkeleton).toBeVisible({ timeout: 3000 });

        // Should have multiple response item skeletons
        const responseItems = page.locator('[data-testid^="topic-detail-skeleton-response-"]');
        expect(await responseItems.count()).toBeGreaterThanOrEqual(1);
      }
    });

    test('should have accessible skeleton loaders on topic detail page', async ({ page }) => {
      await page.goto('/topics');

      await page.waitForSelector('[data-testid="topic-card-skeleton"]', {
        state: 'hidden',
        timeout: 10000,
      });

      const topicLink = page.locator('a[href^="/topics/"]').first();
      const hasTopics = (await topicLink.count()) > 0;

      if (hasTopics) {
        const href = await topicLink.getAttribute('href');
        const topicId = href?.split('/topics/')[1];

        await page.route(`**/api/topics/${topicId}`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await route.continue();
        });

        await topicLink.click();

        const skeleton = page.locator('[data-testid="topic-detail-skeleton"]');
        await expect(skeleton).toBeVisible({ timeout: 3000 });

        // Verify accessibility
        const statusElements = skeleton.locator('[role="status"]');
        expect(await statusElements.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Profile Page Skeleton', () => {
    test('should display profile skeleton during loading', async ({ page }) => {
      // Throttle profile API
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      // Verify skeleton appears
      const skeleton = page.locator('[data-testid="profile-skeleton"]');
      await expect(skeleton).toBeVisible({ timeout: 3000 });

      // Verify skeleton sections
      await expect(page.locator('[data-testid="profile-skeleton-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-skeleton-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-skeleton-trust-scores"]')).toBeVisible();
    });

    test('should display circular avatar skeleton', async ({ page }) => {
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      const avatar = page.locator('[data-testid="profile-skeleton-avatar"]');
      await expect(avatar).toBeVisible({ timeout: 3000 });

      // Verify it has circular styling
      await expect(avatar).toHaveClass(/rounded-full/);
    });

    test('should display trust score progress bar skeletons', async ({ page }) => {
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      // Verify all three trust score sections
      await expect(page.locator('[data-testid="profile-skeleton-trust-ability"]')).toBeVisible({
        timeout: 3000,
      });
      await expect(
        page.locator('[data-testid="profile-skeleton-trust-benevolence"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="profile-skeleton-trust-integrity"]')).toBeVisible();
    });

    test('should display activity section skeleton by default', async ({ page }) => {
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      const activity = page.locator('[data-testid="profile-skeleton-activity"]');
      await expect(activity).toBeVisible({ timeout: 3000 });

      // Should have 4 stat items
      const statItems = activity.locator('.text-center');
      expect(await statItems.count()).toBe(4);
    });

    test('should have accessible skeleton loaders on profile page', async ({ page }) => {
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      const skeleton = page.locator('[data-testid="profile-skeleton"]');
      await expect(skeleton).toBeVisible({ timeout: 3000 });

      // Verify accessibility attributes
      const statusElements = skeleton.locator('[role="status"]');
      expect(await statusElements.count()).toBeGreaterThan(0);
    });

    test('should transition from skeleton to real profile content', async ({ page }) => {
      await page.route('**/api/users/me**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/profile');

      const skeleton = page.locator('[data-testid="profile-skeleton"]');
      await expect(skeleton).toBeVisible({ timeout: 3000 });

      // Wait for skeleton to disappear (either content loads or auth required)
      await expect(skeleton).not.toBeVisible({ timeout: 10000 });

      // Page should show either profile content or login prompt
      const profileContent = page.getByRole('heading', { name: /my profile/i });
      const notLoggedIn = page.getByText(/not logged in|please log in/i);
      const errorMessage = page.getByText(/unable to load profile/i);

      const hasContent =
        (await profileContent.isVisible().catch(() => false)) ||
        (await notLoggedIn.isVisible().catch(() => false)) ||
        (await errorMessage.isVisible().catch(() => false));

      expect(hasContent).toBeTruthy();
    });
  });
});
