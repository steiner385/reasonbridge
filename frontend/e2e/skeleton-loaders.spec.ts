import { test, expect } from '@playwright/test';

/**
 * E2E test suite for page loading states
 *
 * Note: Skeleton loader visual tests have been moved to unit tests because:
 * 1. Route interception doesn't work reliably in Docker E2E environment
 * 2. The useDelayedLoading hook's 100ms delay means skeletons rarely appear
 *    before data loads in a fast local/CI environment
 * 3. Unit tests in src/components/ui/skeletons/*.test.tsx verify skeleton
 *    components render correctly with proper accessibility attributes
 *
 * These E2E tests verify pages load successfully without errors.
 */

// Check if running in E2E Docker mode with full backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

test.describe('Page Loading States', () => {
  // Skip backend-dependent tests when not in E2E Docker mode
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  test.describe('Topics Page', () => {
    test('should load topics page without errors', async ({ page }) => {
      await page.goto('/topics');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Page should not show error state
      await expect(page.getByText(/error loading/i)).not.toBeVisible();
      await expect(page.getByText(/failed to load/i)).not.toBeVisible();

      // Should show either topic cards or empty state
      const hasTopics = (await page.locator('[data-testid="topic-card"]').count()) > 0;
      const hasEmptyState = await page
        .getByText(/no topics/i)
        .isVisible()
        .catch(() => false);
      const hasContent = hasTopics || hasEmptyState;
      expect(hasContent).toBe(true);
    });

    test('should have accessible page structure', async ({ page }) => {
      await page.goto('/topics');
      await page.waitForLoadState('networkidle');

      // Should have main heading
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading.first()).toBeVisible();

      // Should have navigation
      await expect(page.getByRole('navigation')).toBeVisible();
    });
  });

  test.describe('Topic Detail Page', () => {
    test('should load topic detail page without errors', async ({ page }) => {
      // First go to topics page
      await page.goto('/topics');
      await page.waitForLoadState('networkidle');

      // Click first topic if available
      const topicCard = page.locator('[data-testid="topic-card"]').first();
      const hasTopics = await topicCard.isVisible().catch(() => false);

      if (hasTopics) {
        await topicCard.click();
        await page.waitForLoadState('networkidle');

        // Should not show error state
        await expect(page.getByText(/error loading/i)).not.toBeVisible();
        await expect(page.getByText(/failed to load/i)).not.toBeVisible();

        // Should show topic content
        await expect(page.locator('.conversation-panel')).toBeVisible();
      } else {
        test.skip(true, 'No topics available for testing');
      }
    });

    test('should navigate to topic via URL', async ({ page }) => {
      // Get a topic ID from the topics page first
      await page.goto('/topics');
      await page.waitForLoadState('networkidle');

      const topicLink = page.locator('a[href^="/topics/"]').first();
      const hasTopics = await topicLink.isVisible().catch(() => false);

      if (hasTopics) {
        const href = await topicLink.getAttribute('href');
        if (href) {
          // Navigate directly to topic URL
          await page.goto(href);
          await page.waitForLoadState('networkidle');

          // Should load without errors
          await expect(page.getByText(/error loading/i)).not.toBeVisible();
        }
      } else {
        test.skip(true, 'No topics available for testing');
      }
    });
  });

  test.describe('Profile Page', () => {
    test.beforeEach(async ({ page }) => {
      // Login first (profile is protected)
      await page.goto('/');
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByText('Admin Adams').click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^log in$/i }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Wait for auth to complete
      await page.waitForURL(/(\/$$|\/topics)/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
    });

    test('should load profile page without errors', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Should not show error state
      await expect(page.getByText(/error loading/i)).not.toBeVisible();

      // Should show profile heading
      const heading = page.getByRole('heading', { name: /profile/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display user trust scores', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Should show trust score section (may use different text)
      const hasTrustSection =
        (await page
          .getByText(/trust/i)
          .first()
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/score/i)
          .first()
          .isVisible()
          .catch(() => false));

      expect(hasTrustSection).toBe(true);
    });
  });
});
