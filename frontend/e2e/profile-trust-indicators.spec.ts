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

// Generate unique test user credentials for each test run
// Uses timestamp + random suffix + process ID to avoid collisions across parallel workers
const generateTestUser = () => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const processId = process.pid || Math.floor(Math.random() * 10000);
  return {
    email: `trust-e2e-${timestamp}-${processId}-${randomSuffix}@example.com`,
    displayName: `TrustUser${timestamp}${randomSuffix.substring(0, 4)}`,
    password: 'SecurePassword123!',
  };
};

test.describe('User Story 4: Trust Indicators and Human Authenticity', () => {
  // Skip all tests if not in E2E Docker mode (requires backend)
  test.skip(!isE2EDocker, 'Requires backend - runs in E2E Docker mode only');

  // Helper to register a new user, login, and navigate to profile
  const registerLoginAndGoToProfile = async (page: Page) => {
    const testUser = generateTestUser();

    // Step 1: Register a new user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByLabel(/email/i);
    const displayNameInput = page.getByLabel(/display name/i);
    const passwordInput = page.getByLabel(/^password/i).first();
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await emailInput.fill(testUser.email);
    await displayNameInput.fill(testUser.displayName);
    await passwordInput.fill(testUser.password);
    await confirmPasswordInput.fill(testUser.password);

    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    await registerButton.click();

    // Wait for navigation away from /register page (indicates success)
    // Use waitForURL with regex to detect URL change (away from /register)
    try {
      await page.waitForURL(/^(?!.*\/register).*$/, { timeout: 10000 });
    } catch (e) {
      // If navigation didn't happen, check for error messages
      // (This is now a true failure, not a timeout waiting for networkidle)
    }

    // Check if still on registration page (indicates failure)
    if (page.url().includes('/register')) {
      // Look for ANY visible error message
      const errorEl = page.locator(
        '[class*="error"], [role="alert"], .text-red, .bg-red, .bg-fallacy-light p',
      );
      const errorCount = await errorEl.count();

      if (errorCount > 0) {
        const errorText = await errorEl.first().textContent();
        throw new Error(`Registration failed with visible error: ${errorText}`);
      }

      // No visible error but still on registration page - check for silent failure
      const pageContent = await page.textContent('body');
      throw new Error(
        `Registration may have failed silently - still on /register page. ` +
          `Page content (first 500 chars): ${pageContent?.substring(0, 500)}`,
      );
    }

    // Success: verify we redirected to an expected page (including email verification)
    await expect(page).toHaveURL(
      /(\/$|\/login|\/dashboard|\/home|\/profile|\/topics|\/verify-email)/,
      {
        timeout: 5000,
      },
    );

    // Step 2: Login after registration
    // Registration redirects to landing page (/) - use login modal
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open login modal by clicking Log In button
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill login form inside the modal
    const dialog = page.getByRole('dialog');
    const loginEmailInput = dialog.getByLabel(/email/i);
    const loginPasswordInput = dialog.getByLabel(/password/i);
    const loginButton = dialog.getByRole('button', { name: /^log in$/i });

    await loginEmailInput.fill(testUser.email);
    await loginPasswordInput.fill(testUser.password);
    await loginButton.click();

    // Wait for login to complete - use Promise.race to detect either success OR error
    const loginResult = await Promise.race([
      dialog.waitFor({ state: 'hidden', timeout: 15000 }).then(() => 'success' as const),
      dialog
        .locator('.bg-red-50 p, [class*="error"] p')
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => 'error' as const),
    ]);

    if (loginResult === 'error') {
      const errorText = await dialog
        .locator('.bg-red-50 p, [class*="error"] p')
        .first()
        .textContent();
      throw new Error(`Login failed with error: ${errorText}`);
    }

    // Wait for redirect to authenticated page (/ or /topics)
    await page.waitForURL(/(\/$|\/topics)/, { timeout: 10000 });

    // Step 3: Navigate to profile page and wait for user data to load
    await page.goto('/profile');
    // Firefox can be slower to reach networkidle state, use longer timeout
    await page.waitForLoadState('networkidle', { timeout: 45000 });

    // Wait for the profile page to finish loading user data
    // The "My Profile" heading indicates authenticated user profile is loaded
    const profileHeading = page.getByRole('heading', { name: /my profile/i });
    await expect(profileHeading).toBeVisible({ timeout: 15000 });

    // Also ensure API call has completed by waiting for trust score display
    const trustScoreDisplay = page.locator('[data-testid="trust-score-display"]');
    await expect(trustScoreDisplay).toBeVisible({ timeout: 10000 });

    // Allow profile state to fully stabilize (React re-renders, API calls)
    await page.waitForTimeout(500);
  };

  test.describe('TrustBadge Component Display', () => {
    test('should display verification level on user profiles', async ({ page }) => {
      // Firefox can be significantly slower (31.4s+ observed) for this multi-step flow
      test.setTimeout(60000);
      await registerLoginAndGoToProfile(page);

      // Verify verification level is displayed
      const verificationLevel = page.locator('[data-testid="verification-level"]');
      await expect(verificationLevel).toBeVisible({ timeout: 10000 });

      const levelText = await verificationLevel.textContent();
      expect(levelText).toMatch(/BASIC|ENHANCED|VERIFIED HUMAN/i);
    });

    test('should display verified human badge only for verified users', async ({ page }) => {
      // Firefox can be significantly slower (31.5s+ observed) for this multi-step flow
      test.setTimeout(60000);
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const scoreText = await scoreDisplay.textContent();
      // Check for percentage format (e.g., "75%")
      expect(scoreText).toMatch(/\d+%/);
    });

    test('should display all three trust dimensions with labels', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await registerLoginAndGoToProfile(page);

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
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

      // Should show member since date
      const memberSince = page.locator('text=Member Since');
      await expect(memberSince).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility of Trust Indicators', () => {
    test('trust score display should have accessible content', async ({ page }) => {
      // Firefox can be significantly slower for this multi-step flow
      test.setTimeout(60000);
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

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
      await registerLoginAndGoToProfile(page);

      const scoreDisplay = page.locator('[data-testid="trust-score-display"]');
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });

      const box = await scoreDisplay.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
    });
  });
});
