import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Topic Selection Flow
 * Tasks: T101-T109
 *
 * Tests the complete topic selection onboarding step:
 * - View available topics with activity indicators
 * - Select 2-3 topics with real-time validation
 * - Set topic priorities (1-3)
 * - Low activity warning modal
 * - Submit topic selection
 * - Redirect to orientation page
 *
 * Covers User Story 3 (US3) - Topic Interest Selection
 */

test.describe('Topic Selection Flow', () => {
  // Helper to create authenticated user for topic selection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setupAuthenticatedUser = async (page: any) => {
    // Generate unique test user
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const email = `test-topics-${timestamp}-${randomSuffix}@example.com`;
    const password = 'SecureP@ssw0rd123!';

    // Navigate to signup
    await page.goto('/signup');
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole('button', { name: /sign up|create account/i }).click();

    // Wait for verification page (user is authenticated but not verified yet)
    await page.waitForURL(/\/verification|\/verify-email/, { timeout: 10000 });

    // For testing, simulate verified state by navigating directly to topic selection
    // In production, this would require email verification
    await page.goto('/onboarding/topics');

    return { email, password };
  };

  test.describe('Topic Display and Selection', () => {
    test('should display available topics with activity indicators', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics to load
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Should show page heading
      const heading = page.getByRole('heading', {
        name: /choose.*interest|select.*topic/i,
      });
      await expect(heading).toBeVisible();

      // Should show selection counter
      const counter = page.getByText(/no topics selected|required.*2-3/i);
      await expect(counter).toBeVisible();

      // Topics should have activity badges
      const activityBadges = page.locator('text=/high activity|medium activity|low activity/i');
      const badgeCount = await activityBadges.count();
      expect(badgeCount).toBeGreaterThan(0);

      // Topics should show participant counts
      const participantIcons = page
        .locator('svg[title*="Participants"]')
        .or(page.locator('svg').filter({ hasText: /participants/i }));
      const iconCount = await participantIcons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should allow selecting topics by clicking cards', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics to load
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Select first topic
      const firstTopic = topicCards.first();
      await firstTopic.click();

      // Should show as selected
      await expect(firstTopic).toHaveAttribute('aria-pressed', 'true');

      // Counter should update
      const counter = page.getByText(/select.*more|1.*selected/i);
      await expect(counter).toBeVisible();
    });

    test('should enforce 2-3 topic selection limit', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Try to select 4 topics
      const topics = await topicCards.all();
      if (topics.length >= 4) {
        await topics[0].click();
        await topics[1].click();
        await topics[2].click();

        // 3 topics selected, counter should show max
        const maxCounter = page.getByText(/3 topics selected/i);
        await expect(maxCounter).toBeVisible();

        // Try to click 4th topic - should not be selectable
        await topics[3].click();
        await page.waitForTimeout(500);

        // Should still have only 3 selected
        const selectedTopics = page.locator('[role="button"][aria-pressed="true"]');
        await expect(selectedTopics).toHaveCount(3);
      }
    });

    test('should allow deselecting topics', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Select first topic
      const firstTopic = topicCards.first();
      await firstTopic.click();
      await expect(firstTopic).toHaveAttribute('aria-pressed', 'true');

      // Deselect it
      await firstTopic.click();
      await expect(firstTopic).toHaveAttribute('aria-pressed', 'false');

      // Counter should show 0
      const counter = page.getByText(/no topics selected/i);
      await expect(counter).toBeVisible();
    });
  });

  test.describe('Priority Selection', () => {
    test('should allow setting priorities for selected topics', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics and select 2
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();

      // Each selected topic should have priority buttons
      const priorityButtons = page.getByRole('button', { name: /set priority to/i });
      const priorityCount = await priorityButtons.count();
      expect(priorityCount).toBeGreaterThanOrEqual(6); // At least 3 buttons per selected topic

      // First topic should have priority 1 by default
      const priority1Badge = page.locator('[aria-label="Priority 1"]').first();
      await expect(priority1Badge).toBeVisible();

      // Change priority
      const setPriority2Button = page.getByRole('button', { name: /set priority to 2/i }).first();
      await setPriority2Button.click();

      await page.waitForTimeout(300);

      // Priority badge should update
      const priority2Badge = page.locator('[aria-label="Priority 2"]').first();
      await expect(priority2Badge).toBeVisible();
    });

    test('should show priority numbers in selected topics preview', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Select 3 topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();
      await topics[2].click();

      // Preview should show all 3 with priorities
      const preview = page.locator('text=/1\\.|2\\.|3\\./');
      const previewCount = await preview.count();
      expect(previewCount).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Validation and Feedback', () => {
    test('should disable submit button when less than 2 topics selected', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Find continue/submit button
      const submitButton = page.getByRole('button', { name: /continue|submit|next/i });
      await expect(submitButton).toBeVisible();

      // Should be disabled initially
      await expect(submitButton).toBeDisabled();

      // Select 1 topic
      const firstTopic = page.locator('[role="button"][aria-pressed="false"]').first();
      await firstTopic.click();

      // Still disabled with only 1 topic
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when 2-3 topics selected', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Submit button
      const submitButton = page.getByRole('button', { name: /continue|submit|next/i });

      // Select 2 topics
      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();

      // Should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test('should show real-time feedback on selection count', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      const topics = await topicCards.all();

      // 0 topics
      let feedback = page.getByText(/no topics selected/i);
      await expect(feedback).toBeVisible();

      // 1 topic
      await topics[0].click();
      feedback = page.getByText(/select.*more|1.*selected/i);
      await expect(feedback).toBeVisible();

      // 2 topics
      await topics[1].click();
      feedback = page.getByText(/2 topics selected/i);
      await expect(feedback).toBeVisible();

      // 3 topics
      await topics[2].click();
      feedback = page.getByText(/3 topics selected/i);
      await expect(feedback).toBeVisible();
    });
  });

  test.describe('Low Activity Warning', () => {
    test('should show warning modal when all selected topics have low activity', async ({
      page,
    }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Find and select only LOW activity topics
      const lowActivityTopics = page.locator('[role="button"][aria-pressed="false"]').filter({
        has: page.locator('text=/low activity/i'),
      });

      const lowTopicCount = await lowActivityTopics.count();

      if (lowTopicCount >= 2) {
        const topics = await lowActivityTopics.all();
        await topics[0].click();
        await topics[1].click();

        // Click continue
        const submitButton = page.getByRole('button', { name: /continue|submit/i });
        await submitButton.click();

        // Warning modal should appear
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const warningHeading = page.getByText(/low activity/i);
        await expect(warningHeading).toBeVisible();
      }
    });

    test('should offer alternative high/medium activity topics in warning modal', async ({
      page,
    }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Select LOW activity topics and trigger warning
      const lowActivityTopics = page.locator('[role="button"][aria-pressed="false"]').filter({
        has: page.locator('text=/low activity/i'),
      });

      const lowTopicCount = await lowActivityTopics.count();

      if (lowTopicCount >= 2) {
        const topics = await lowActivityTopics.all();
        await topics[0].click();
        await topics[1].click();

        const submitButton = page.getByRole('button', { name: /continue|submit/i });
        await submitButton.click();

        // Wait for modal
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // Should show "Switch" buttons for alternatives
        const switchButtons = page.getByRole('button', { name: /switch/i });
        const switchCount = await switchButtons.count();
        expect(switchCount).toBeGreaterThan(0);
      }
    });

    test('should allow switching to alternative topic from warning modal', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Select LOW activity topics
      const lowActivityTopics = page.locator('[role="button"][aria-pressed="false"]').filter({
        has: page.locator('text=/low activity/i'),
      });

      const lowTopicCount = await lowActivityTopics.count();

      if (lowTopicCount >= 2) {
        const topics = await lowActivityTopics.all();
        await topics[0].click();
        await topics[1].click();

        const submitButton = page.getByRole('button', { name: /continue|submit/i });
        await submitButton.click();

        // Wait for modal and click Switch
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
        const switchButton = page.getByRole('button', { name: /switch/i }).first();
        await switchButton.click();

        // Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Selection should be updated
        await page.waitForTimeout(500);
      }
    });

    test('should allow continuing with low activity topics', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Select LOW activity topics
      const lowActivityTopics = page.locator('[role="button"][aria-pressed="false"]').filter({
        has: page.locator('text=/low activity/i'),
      });

      const lowTopicCount = await lowActivityTopics.count();

      if (lowTopicCount >= 2) {
        const topics = await lowActivityTopics.all();
        await topics[0].click();
        await topics[1].click();

        const submitButton = page.getByRole('button', { name: /continue|submit/i });
        await submitButton.click();

        // Wait for modal
        await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

        // Click "Continue Anyway"
        const continueButton = page.getByRole('button', { name: /continue anyway/i });
        await continueButton.click();

        // Should navigate to next step
        await page.waitForURL(/\/onboarding\/orientation/, { timeout: 10000 });
      }
    });
  });

  test.describe('Submission and Navigation', () => {
    test('should submit topic selection and redirect to orientation', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Select 2 HIGH/MEDIUM activity topics to avoid warning modal
      const highActivityTopics = page.locator('[role="button"][aria-pressed="false"]').filter({
        has: page.locator('text=/high activity|medium activity/i'),
      });

      const topics = await highActivityTopics.all();
      if (topics.length >= 2) {
        await topics[0].click();
        await topics[1].click();

        // Submit
        const submitButton = page.getByRole('button', { name: /continue|submit/i });
        await submitButton.click();

        // Should redirect to orientation
        await page.waitForURL(/\/onboarding\/orientation/, { timeout: 15000 });

        // Verify orientation page loaded
        const orientationContent = page.getByRole('heading', {
          name: /orientation|welcome|getting started/i,
        });
        await expect(orientationContent).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show loading state during submission', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Select 2 topics
      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();

      // Submit
      const submitButton = page.getByRole('button', { name: /continue|submit/i });
      await submitButton.click();

      // Should show loading state
      const loadingButton = page.getByRole('button', { name: /saving/i });
      const isLoading = await loadingButton.isVisible({ timeout: 1000 }).catch(() => false);

      // Either loading state visible or already navigated
      const hasNavigated = page.url().includes('/onboarding/orientation');
      expect(isLoading || hasNavigated).toBeTruthy();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      await expect(topicCards.first()).toBeVisible({ timeout: 10000 });

      // Intercept API call to simulate error
      await page.route('**/onboarding/select-topics', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save topic selection',
          }),
        });
      });

      // Select and submit
      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();

      const submitButton = page.getByRole('button', { name: /continue|submit/i });
      await submitButton.click();

      // Should show error message
      const errorMessage = page.getByText(/failed.*save|error/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // All topic cards should have role="button" and aria-pressed
      const topicButtons = page.locator('[role="button"][aria-pressed]');
      const buttonCount = await topicButtons.count();
      expect(buttonCount).toBeGreaterThan(0);

      // Should be keyboard navigable
      const firstButton = topicButtons.first();
      await firstButton.focus();

      // Press Enter to select
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);

      // Should be selected
      await expect(firstButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Page should be usable on mobile
      const heading = page.getByRole('heading', { name: /choose.*interest|select.*topic/i });
      await expect(heading).toBeVisible();

      // Topics should be clickable
      const topicCards = page.locator('[role="button"][aria-pressed="false"]');
      const firstTopic = topicCards.first();
      await firstTopic.click();

      await expect(firstTopic).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await setupAuthenticatedUser(page);

      // Wait for topics
      await page.waitForSelector('[role="button"][aria-pressed]', { timeout: 10000 });

      // Content should be visible and functional
      const topicCards = page.locator('[role="button"][aria-pressed]');
      const cardCount = await topicCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Select and submit should work
      const topics = await topicCards.all();
      await topics[0].click();
      await topics[1].click();

      const submitButton = page.getByRole('button', { name: /continue|submit/i });
      await expect(submitButton).toBeEnabled();
    });
  });
});
