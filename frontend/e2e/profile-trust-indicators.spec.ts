import { test, expect, Page } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/demo-auth';

/**
 * E2E test suite for User Story 4: Verify Human Authenticity
 *
 * Tests the trust indicators and verification display including:
 * - Trust badge display on user profiles
 * - Trust score display (Mayer ABI: ability, benevolence, integrity)
 * - Verification status indicators
 * - Phone verification flow (implemented)
 * - Profile integration with trust indicators
 *
 * Features NOT YET IMPLEMENTED (backend exists, frontend UI missing):
 * - Government ID verification upload flow (VerificationPage shows "not yet available")
 * - Bot detection indicator UI (backend: services/user-service/src/services/bot-detector.service.ts)
 * - CAPTCHA for suspicious account activity
 *
 * When these features are built, add E2E tests for:
 * - ID upload and document type selection
 * - Warning badges on suspicious accounts
 * - CAPTCHA triggering for rapid account creation
 */

// Demo account name used for testing
const DEMO_ACCOUNT_NAME = 'Admin Adams';

test.describe('User Story 4: Trust Indicators and Human Authenticity', () => {
  // Run tests sequentially for consistent profile state
  test.describe.configure({ mode: 'serial' });

  // Helper to login with demo account and navigate to profile
  const loginAndGoToProfile = async (page: Page) => {
    // Login with demo account (uses pre-seeded user to avoid rate limiting)
    await loginWithDemoAccount(page, DEMO_ACCOUNT_NAME);

    // Navigate to profile page
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(500);

    // Wait for the profile page to finish loading user data
    const profileHeading = page.getByRole('heading', { name: /my profile/i });
    await expect(profileHeading).toBeVisible({ timeout: 15000 });

    // Wait for trust score display to be visible
    const trustScoreDisplay = page.locator('[data-testid="trust-score-display"]');
    await expect(trustScoreDisplay).toBeVisible({ timeout: 10000 });

    // Allow profile state to stabilize
    await page.waitForTimeout(500);
  };

  test.describe('TrustBadge Component Display', () => {
    test('should display verification level on user profiles', async ({ page }) => {
      // Firefox can be significantly slower (31.4s+ observed) for this multi-step flow
      test.setTimeout(60000);
      await loginAndGoToProfile(page);

      // Verify verification level is displayed
      const verificationLevel = page.locator('[data-testid="verification-level"]');
      await expect(verificationLevel).toBeVisible({ timeout: 10000 });

      const levelText = await verificationLevel.textContent();
      expect(levelText).toMatch(/BASIC|ENHANCED|VERIFIED HUMAN/i);
    });

    test('should display verified human badge only for verified users', async ({ page }) => {
      // Firefox can be significantly slower (31.5s+ observed) for this multi-step flow
      test.setTimeout(60000);
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
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
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
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const scoreText = await scoreDisplay.textContent();
      // Check for percentage format (e.g., "75%")
      expect(scoreText).toMatch(/\d+%/);
    });

    test('should display all three trust dimensions with labels', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
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
      // Register and login first (verification page requires authentication)
      await loginAndGoToProfile(page);

      // Navigate to verification page
      await page.goto('/verification');

      // Should load verification page
      const verificationHeader = page.locator('text=/verification|verify/i');
      await expect(verificationHeader.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('PhoneVerificationForm', () => {
    test('should display phone verification option', async ({ page }) => {
      test.setTimeout(90000);
      await loginAndGoToProfile(page);

      // Navigate to verification page
      await page.goto('/verification');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Look for phone verification button/option
      const phoneOption = page.locator('button:has-text("Phone Verification")');
      await expect(phoneOption).toBeVisible({ timeout: 10000 });

      // The verification page should show verification options
      await expect(page.getByRole('heading', { name: /verification options/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('should show phone verification form when clicking phone option', async ({ page }) => {
      test.setTimeout(90000);
      await loginAndGoToProfile(page);

      // Navigate to verification page
      await page.goto('/verification');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Click phone verification option
      const phoneOption = page.locator('button:has-text("Phone Verification")');
      await expect(phoneOption).toBeVisible({ timeout: 10000 });
      await phoneOption.click();

      // After clicking, either a phone input appears OR we see a form/dialog
      // The UI might show a modal or expand the section
      const phoneInputOrForm = page
        .locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]')
        .first()
        .or(page.locator('text=/enter.*phone|phone.*number/i').first());
      await expect(phoneInputOrForm).toBeVisible({ timeout: 10000 });
    });

    test('should show verification status for already verified user', async ({ page }) => {
      test.setTimeout(90000);
      await loginAndGoToProfile(page);

      // Navigate to verification page
      await page.goto('/verification');
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForTimeout(500);

      // Check for current verification level display
      const verificationLevel = page
        .locator('text=/VERIFIED_HUMAN|VERIFIED HUMAN|ENHANCED|current.*verification/i')
        .first();
      await expect(verificationLevel).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('ProfilePage Integration with Trust Indicators', () => {
    test('should display user profile with trust information', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await loginAndGoToProfile(page);

      // Check page structure - should have profile header
      const profileHeader = page.getByRole('heading', { name: /my profile/i });
      await expect(profileHeader).toBeVisible({ timeout: 10000 });

      // Should include trust elements
      const trustScores = page.locator('[data-testid="trust-score-display"]');
      await expect(trustScores).toBeVisible();
    });

    test('should display member since date', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await loginAndGoToProfile(page);

      // Should show member since date
      const memberSince = page.locator('text=Member Since');
      await expect(memberSince).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility of Trust Indicators', () => {
    test('trust score display should have accessible content', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await loginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      // Should have meaningful text content
      const textContent = await scoreDisplay.textContent();
      expect(textContent).toBeTruthy();
      expect(textContent!.trim().length).toBeGreaterThan(0);
    });

    test('verification badge should have accessible title when visible', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
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
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
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
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
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
