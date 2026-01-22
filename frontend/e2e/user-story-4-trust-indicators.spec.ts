import { test, expect, Page } from '@playwright/test';

/**
 * E2E test suite for User Story 4: Verify Human Authenticity
 *
 * Tests the trust indicators and verification display including:
 * - Trust badge display on user profiles
 * - Trust score display (Mayer ABI: ability, benevolence, integrity)
 * - Verification status indicators
 * - Profile integration with trust indicators
 *
 * Note: Phone/ID verification forms, bot detection, and CAPTCHA tests are skipped
 * as those features are not yet implemented.
 */

// Check if running in E2E Docker environment with backend
const isE2EDocker = process.env.E2E_DOCKER === 'true';

// Test user credentials (from seed data)
const TEST_USER = {
  email: 'testuser1@example.com',
  password: 'TestPassword123!',
};

test.describe('User Story 4: Trust Indicators and Human Authenticity', () => {
  // Skip all tests if not in E2E Docker mode (requires backend)
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  // Helper to login and navigate to own profile
  const loginAndGoToProfile = async (page: Page) => {
    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const loginButton = page.getByRole('button', { name: /sign in|log in|login/i });

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await loginButton.click();

    // Wait for login to complete
    await page.waitForURL(/\/(topics|profile|$)/, { timeout: 10000 });

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  };

  test.describe('TrustBadge Component Display', () => {
    test('should display verification level on user profiles', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Verify verification level is displayed
      const verificationLevel = page.locator('[data-testid="verification-level"]');
      await expect(verificationLevel).toBeVisible({ timeout: 10000 });

      const levelText = await verificationLevel.textContent();
      expect(levelText).toMatch(/BASIC|ENHANCED|VERIFIED HUMAN/i);
    });

    test('should display verified human badge only for verified users', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Check verification level
      const verificationLevel = page.locator('[data-testid="verification-level"]');
      await expect(verificationLevel).toBeVisible({ timeout: 10000 });
      const levelText = await verificationLevel.textContent();

      const trustBadge = page.locator('[data-testid="trust-badge"]');

      if (levelText?.includes('VERIFIED HUMAN')) {
        // Trust badge should be visible for verified users
        await expect(trustBadge).toBeVisible();
        const badgeText = await trustBadge.textContent();
        expect(badgeText).toMatch(/verified human|verified/i);
      } else {
        // Trust badge should NOT be visible for non-verified users
        await expect(trustBadge).not.toBeVisible();
      }
    });
  });

  test.describe('TrustScoreDisplay Component', () => {
    test('should display three trust score metrics on user profile', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Check for Mayer ABI three factors
      const abilityScore = page.locator('[data-testid="trust-score-ability"]');
      const benevolenceScore = page.locator('[data-testid="trust-score-benevolence"]');
      const integrityScore = page.locator('[data-testid="trust-score-integrity"]');

      await expect(abilityScore).toBeVisible({ timeout: 10000 });
      await expect(benevolenceScore).toBeVisible();
      await expect(integrityScore).toBeVisible();
    });

    test('should display trust scores as percentages (0-100)', async ({ page }) => {
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const scoreText = await scoreDisplay.textContent();
      // Check for percentage format (e.g., "75%")
      expect(scoreText).toMatch(/\d+%/);
    });

    test('should display all three trust dimensions with labels', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Check for dimension labels
      const abilityLabel = page.locator('text=Ability');
      const benevolenceLabel = page.locator('text=Benevolence');
      const integrityLabel = page.locator('text=Integrity');

      await expect(abilityLabel).toBeVisible({ timeout: 10000 });
      await expect(benevolenceLabel).toBeVisible();
      await expect(integrityLabel).toBeVisible();
    });
  });

  test.describe('VerificationPage Navigation and Access', () => {
    test('should navigate to verification page directly', async ({ page }) => {
      await page.goto('/verification');

      // Should load verification page
      const verificationHeader = page.locator('text=/verification|verify/i');
      await expect(verificationHeader.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // Skip verification form tests - features not implemented
  test.describe.skip('PhoneVerificationForm', () => {
    // TODO: Implement phone verification form tests when feature is built
    test('should accept phone number input', async () => {});
    test('should validate phone number format', async () => {});
    test('should show OTP confirmation step after phone submission', async () => {});
  });

  test.describe.skip('IDVerificationFlow', () => {
    // TODO: Implement ID verification flow tests when feature is built
    test('should provide government ID upload option', async () => {});
    test('should accept government ID document images', async () => {});
    test('should collect document type', async () => {});
  });

  test.describe.skip('Bot Detection Indicators', () => {
    // TODO: Implement bot detection tests when feature is built
    test('should show warning badge on suspicious accounts', async () => {});
    test('should show caution indicator on low trust score accounts', async () => {});
    test('should trigger CAPTCHA for rapid account creation attempts', async () => {});
  });

  test.describe('ProfilePage Integration with Trust Indicators', () => {
    test('should display user profile with trust information', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Check page structure - should have profile header
      const profileHeader = page.locator('h1');
      await expect(profileHeader).toBeVisible({ timeout: 10000 });

      // Should include trust elements
      const trustScores = page.locator('[data-testid="trust-score-display"]');
      await expect(trustScores).toBeVisible();
    });

    test('should display member since date', async ({ page }) => {
      await loginAndGoToProfile(page);

      // Should show member since date
      const memberSince = page.locator('text=Member Since');
      await expect(memberSince).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility of Trust Indicators', () => {
    test('trust score display should have accessible content', async ({ page }) => {
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      // Should have meaningful text content
      const textContent = await scoreDisplay.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent!.trim().length).toBeGreaterThan(0);
    });

    test('verification badge should have accessible title when visible', async ({ page }) => {
      await loginAndGoToProfile(page);

      const trustBadge = page.locator('[data-testid="trust-badge"]');
      if (await trustBadge.isVisible()) {
        // Should have title attribute for accessibility
        const title = await trustBadge.getAttribute('title');
        expect(title).toBeTruthy();
      }
      // If badge is not visible, test passes (user may not be verified)
    });
  });

  test.describe('Cross-browser Trust Indicator Consistency', () => {
    test('trust scores should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const box = await scoreDisplay.boundingBox();
      // Should be visible and within viewport
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
    });

    test('trust scores should render correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const box = await scoreDisplay.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
    });
  });
});
