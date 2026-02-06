import { test, expect } from '@playwright/test';

/**
 * E2E tests for the consolidated landing page
 *
 * Tests cover:
 * - T032: Unauthenticated user flow (landing page renders correctly)
 * - T033: Authenticated user redirect flow (redirects to /topics)
 * - T034: Topics section interactions (real API data)
 */

test.describe('Landing Page - Unauthenticated User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth tokens before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    });
  });

  test('should display landing page at root URL', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Verify key sections are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('should display hero section with brand gradient', async ({ page }) => {
    await page.goto('/');

    // Verify hero section content
    const heroSection = page.locator('section').first();
    await expect(heroSection).toContainText('Find Common Ground Through Thoughtful Discussion');
    await expect(heroSection).toContainText('Get Started Free');
    await expect(heroSection).toContainText('See How It Works');
  });

  test('should display value proposition cards', async ({ page }) => {
    await page.goto('/');

    // Verify the three value propositions using headings (more specific)
    await expect(page.getByRole('heading', { name: 'AI-Guided Insight' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Diverse Perspectives' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proven Results' })).toBeVisible();
  });

  test('should display call-to-action section', async ({ page }) => {
    await page.goto('/');

    // Scroll to CTA section (replaces mission section in current design)
    const ctaSection = page.getByRole('heading', { name: 'Ready to Join the Conversation?' });
    await expect(ctaSection).toBeVisible();
    await expect(page.getByText(/Create your free account in 30 seconds/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Get Started Free/i }).last()).toBeVisible();
  });

  test('should display footer with copyright', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('ReasonBridge');
    await expect(footer).toContainText('Building bridges through rational discussion');
  });

  test('should navigate to signup page when clicking Sign Up button', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('button', { name: /sign up free/i })
      .first()
      .click();
    await expect(page).toHaveURL('/signup');
  });

  test('should open login modal when clicking Log In button', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /log in/i }).click();

    // Login modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();

    // Demo credentials should be displayed
    await expect(page.getByText('Quick Login with Demo Accounts')).toBeVisible();
    await expect(page.getByText('Admin Adams')).toBeVisible();
  });

  test('should display ReasonBridge branding in header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for React app to hydrate
    await page.waitForLoadState('domcontentloaded');

    // Header shows ReasonBridge logo image with "Beta" badge
    await expect(page.locator('header img[alt="ReasonBridge"]')).toBeVisible();
    await expect(page.locator('header').getByText('Beta')).toBeVisible();
  });
});

test.describe('Landing Page - Authenticated User Redirect', () => {
  test.beforeEach(async ({ page }) => {
    // Start at /about to load the React app and clear auth state
    await page.goto('/about');
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('reasonbridge_welcome_banner_dismissed');
    });
  });

  test('should redirect authenticated user to topics page', async ({ page }) => {
    // Set up auth token
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'test-token-12345');
    });

    // Navigate to landing page via "Home" link (will trigger redirect)
    await page.getByRole('link', { name: /home/i }).click();

    // Should be redirected to topics with welcome param
    await expect(page).toHaveURL(/\/topics\?welcome=true/);
  });

  test('should show welcome banner on topics page after redirect', async ({ page }) => {
    // Set auth token (welcome banner dismissed state already cleared in beforeEach)
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'test-token-12345');
    });

    // Navigate to landing page via "Home" link (will redirect)
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/topics\?welcome=true/);

    // Welcome banner should be visible
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test('should dismiss welcome banner and persist state', async ({ page }) => {
    // Set auth token (welcome banner dismissed state already cleared in beforeEach)
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'test-token-12345');
    });

    // Navigate to landing via "Home" link - should redirect to /topics?welcome=true
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/topics\?welcome=true/);

    // Banner should be visible
    const banner = page.getByRole('status');
    await expect(banner).toBeVisible();

    // Dismiss banner
    await page.getByRole('button', { name: /dismiss/i }).click();

    // Banner should be hidden
    await expect(banner).not.toBeVisible();

    // Navigate away by clicking the ReasonBridge logo (goes to landing, redirects back)
    await page.getByRole('link', { name: /reasonbridge/i }).click();

    // Should redirect back to topics (still authenticated)
    await expect(page).toHaveURL(/\/topics\?welcome=true/);

    // Banner should remain hidden because localStorage remembers dismissal
    await expect(page.getByRole('status')).not.toBeVisible();
  });
});

test.describe('Landing Page - Topics Section Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
    });
  });

  test('should scroll to topics section when clicking See How It Works', async ({ page }) => {
    await page.goto('/');

    // Click the "See How It Works" button
    await page.getByRole('button', { name: /see how it works/i }).click();

    // Topics section should be in view
    const topicsSection = page.locator('#topics-section');
    await expect(topicsSection).toBeInViewport();
  });

  test('should display topics section with real seeded topics', async ({ page }) => {
    await page.goto('/');

    // Scroll to topics section
    const topicsSection = page.locator('#topics-section');
    await topicsSection.scrollIntoViewIfNeeded();

    // Wait for topics to load (real API with seeded data)
    // Should show "Current Discussions" heading when data loads
    await expect(page.getByRole('heading', { name: 'Current Discussions' })).toBeVisible({
      timeout: 10000,
    });

    // Verify topic cards are rendered with "Join Discussion" buttons
    const joinButtons = page.getByRole('button', { name: /join discussion/i });
    await expect(joinButtons.first()).toBeVisible();

    // Verify at least one seeded topic title is visible
    // The seeded topics include titles like "Remote Work", "Universal Basic Income", etc.
    const hasSeededTopic = await page
      .getByText(/Remote Work|Universal Basic Income|Climate Change|Healthcare|Immigration/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasSeededTopic).toBeTruthy();
  });

  test('should show join modal when clicking Join Discussion button', async ({ page }) => {
    await page.goto('/');

    // Scroll to topics section and wait for content to load
    const topicsSection = page.locator('#topics-section');
    await topicsSection.scrollIntoViewIfNeeded();

    // Wait for topics to load from real API
    await expect(page.getByRole('heading', { name: 'Current Discussions' })).toBeVisible({
      timeout: 10000,
    });

    // Click the "Join Discussion" button
    const joinButton = page.getByRole('button', { name: /join discussion/i }).first();
    await expect(joinButton).toBeVisible({ timeout: 5000 });
    await joinButton.click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Join to Participate')).toBeVisible();
  });

  test('should close join modal when clicking Continue Browsing', async ({ page }) => {
    await page.goto('/');

    // Scroll to topics section and wait for content to load
    const topicsSection = page.locator('#topics-section');
    await topicsSection.scrollIntoViewIfNeeded();

    // Wait for topics to load from real API
    await expect(page.getByRole('heading', { name: 'Current Discussions' })).toBeVisible({
      timeout: 10000,
    });

    // Click the "Join Discussion" button to open modal
    const joinButton = page.getByRole('button', { name: /join discussion/i }).first();
    await expect(joinButton).toBeVisible({ timeout: 5000 });
    await joinButton.click();

    // Modal should be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click continue browsing
    await page.getByRole('button', { name: /continue browsing/i }).click();

    // Modal should close
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Landing Page - Accessibility and Responsiveness', () => {
  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check header navigation has proper roles
    const nav = page.locator('header nav');
    await expect(nav).toBeVisible();

    // Buttons should be keyboard accessible
    const signUpButton = page.getByRole('button', { name: /sign up free/i }).first();
    await signUpButton.focus();
    await expect(signUpButton).toBeFocused();
  });

  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Key elements should still be visible on mobile
    await expect(page.getByRole('button', { name: /sign up free/i }).first()).toBeVisible();
    await expect(page.getByText('Find Common Ground')).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Verify full layout displays
    await expect(page.getByRole('button', { name: /sign up free/i }).first()).toBeVisible();
    await expect(page.getByText('Find Common Ground')).toBeVisible();
  });
});
