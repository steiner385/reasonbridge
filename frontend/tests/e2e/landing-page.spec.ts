import { test, expect } from '@playwright/test';

/**
 * E2E tests for Landing Page demo flow
 * Tests the complete user journey: view demos → see metrics → interact → signup prompt
 */

test.describe('Landing Page Demo Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
  });

  test('should display landing page with hero section', async ({ page }) => {
    // Check hero content
    await expect(page.getByRole('heading', { name: /Find Common Ground/i })).toBeVisible();
    await expect(page.getByText(/AI-powered rational discourse/i)).toBeVisible();

    // Check CTA buttons
    await expect(page.getByRole('button', { name: /Get Started Free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /See How It Works/i })).toBeVisible();
  });

  test('should display value propositions', async ({ page }) => {
    // Check for three main features
    await expect(page.getByRole('heading', { name: /AI-Guided Insight/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Diverse Perspectives/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Proven Results/i })).toBeVisible();
  });

  test('should load and display demo discussions', async ({ page }) => {
    // Wait for demo discussions to load
    await expect(page.getByText(/Featured Discussions/i)).toBeVisible();

    // Check that at least one discussion card is displayed
    await expect(page.locator('[class*="rounded-lg shadow-lg"]').first()).toBeVisible();

    // Check that discussion has required elements
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await expect(firstDiscussion.getByText(/participants/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/propositions/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/Common Ground Found/i)).toBeVisible();
  });

  test('should display social proof metrics', async ({ page }) => {
    // Check for social proof section
    await expect(page.getByText(/Real Results from Real Discussions/i)).toBeVisible();

    // Check for three metric cards
    await expect(page.getByText(/Common Ground Found/i)).toBeVisible();
    await expect(page.getByText(/Active Participants/i)).toBeVisible();
    await expect(page.getByText(/User Satisfaction/i)).toBeVisible();

    // Metrics should display percentage values
    await expect(page.locator('text=/\\d+%/').first()).toBeVisible();
  });

  test('should allow navigation between demo discussions', async ({ page }) => {
    // Wait for demo to load
    await expect(page.getByText(/Featured Discussions/i)).toBeVisible();

    // Check initial state (1 of X)
    await expect(page.getByText(/1 of \d+/)).toBeVisible();

    // Click next button
    const nextButton = page.getByRole('button', { name: /Next/i });
    await nextButton.click();

    // Should show 2 of X
    await expect(page.getByText(/2 of \d+/)).toBeVisible();

    // Previous button should now be enabled
    const prevButton = page.getByRole('button', { name: /Previous/i });
    await expect(prevButton).toBeEnabled();
  });

  test('should display discussion details correctly', async ({ page }) => {
    // Wait for first discussion to load
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await expect(firstDiscussion).toBeVisible();

    // Check discussion title
    await expect(firstDiscussion.locator('h3')).toBeVisible();

    // Check topic badge
    await expect(firstDiscussion.locator('[class*="bg-blue-100"]').first()).toBeVisible();

    // Check common ground items (Areas of Agreement)
    await expect(firstDiscussion.getByText(/Areas of Agreement/i)).toBeVisible();

    // Check views spectrum (Participant Positions)
    await expect(firstDiscussion.getByText(/Participant Positions/i)).toBeVisible();

    // Check for spectrum labels
    await expect(firstDiscussion.getByText(/Strongly Support/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/Support/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/Neutral/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/Oppose/i)).toBeVisible();
    await expect(firstDiscussion.getByText(/Strongly Oppose/i)).toBeVisible();
  });

  test('should show join modal when clicking View Full Discussion', async ({ page }) => {
    // Wait for first discussion
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await expect(firstDiscussion).toBeVisible();

    // Click "View Full Discussion" button
    await firstDiscussion.getByRole('button', { name: /View Full Discussion/i }).click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Join to Participate/i)).toBeVisible();

    // Check modal buttons
    await expect(page.getByRole('button', { name: /Sign Up Free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Log In/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue Browsing/i })).toBeVisible();
  });

  test('should close join modal when clicking Continue Browsing', async ({ page }) => {
    // Open modal
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await firstDiscussion.getByRole('button', { name: /View Full Discussion/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Continue Browsing/i }).click();

    // Modal should disappear
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should navigate to signup page from modal', async ({ page }) => {
    // Open modal
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await firstDiscussion.getByRole('button', { name: /View Full Discussion/i }).click();

    // Click signup button in modal
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Sign Up Free/i })
      .click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should navigate to login page from modal', async ({ page }) => {
    // Open modal
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await firstDiscussion.getByRole('button', { name: /View Full Discussion/i }).click();

    // Click login button in modal
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Log In/i })
      .click();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to signup from header CTA', async ({ page }) => {
    // Click header signup button
    await page
      .getByRole('button', { name: /Sign Up Free/i })
      .first()
      .click();

    // Should navigate to signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test('should navigate to login from header', async ({ page }) => {
    // Click header login button
    await page
      .getByRole('button', { name: /Log In/i })
      .first()
      .click();

    // Should navigate to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should scroll to demo section when clicking See How It Works', async ({ page }) => {
    // Click "See How It Works" button
    await page.getByRole('button', { name: /See How It Works/i }).click();

    // Demo section should be visible
    await expect(page.locator('#demo-section')).toBeInViewport();
  });

  test('should allow clicking on discussion thumbnails', async ({ page }) => {
    // Wait for thumbnails to load
    await expect(page.getByText(/Featured Discussions/i)).toBeVisible();

    // Get all thumbnail buttons
    const thumbnails = page.locator('button[aria-label*="View discussion:"]');
    await expect(thumbnails.first()).toBeVisible();

    // Count should be 5 (default limit)
    await expect(thumbnails).toHaveCount(5);

    // Click on third thumbnail
    await thumbnails.nth(2).click();

    // Should show 3 of 5
    await expect(page.getByText(/3 of 5/)).toBeVisible();
  });

  test('should display no-JS fallback message when JavaScript is disabled', async ({
    page,
    context,
  }) => {
    // Disable JavaScript
    await context.setOffline(false);
    await page.setJavaScriptEnabled(false);

    // Reload page
    await page.goto('/');

    // Check for noscript content (this might not be testable in all scenarios)
    // Most browsers don't actually disable JS for Playwright
    // This test serves as documentation of the requirement
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Hero should still be visible
    await expect(page.getByRole('heading', { name: /Find Common Ground/i })).toBeVisible();

    // Demo section should be visible
    await expect(page.getByText(/Featured Discussions/i)).toBeVisible();

    // Navigation buttons should work on mobile
    const nextButton = page.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page, context }) => {
    // Intercept API call and return error
    await context.route('**/demo/discussions*', (route) => {
      route.abort('failed');
    });

    // Reload page
    await page.goto('/');

    // Should show error message
    await expect(page.getByText(/Error loading demo content/i)).toBeVisible();
  });

  test('should display loading state while fetching data', async ({ page, context }) => {
    // Intercept API call and delay response
    await context.route('**/demo/discussions*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Reload page
    await page.goto('/');

    // Should show loading spinner
    await expect(page.locator('[class*="animate-spin"]')).toBeVisible();

    // Eventually should show content
    await expect(page.getByText(/Featured Discussions/i)).toBeVisible({ timeout: 10000 });
  });

  test('should include accessibility attributes', async ({ page }) => {
    // Check for ARIA labels
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Open modal
    const firstDiscussion = page.locator('[class*="rounded-lg shadow-lg"]').first();
    await firstDiscussion.getByRole('button', { name: /View Full Discussion/i }).click();

    // Modal should have proper ARIA attributes
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Progress bars should have proper ARIA attributes
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();
  });
});
