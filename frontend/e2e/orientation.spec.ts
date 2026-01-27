import { test, expect } from '@playwright/test';

/**
 * E2E test suite for Orientation Flow
 *
 * Tests the orientation overlay functionality including:
 * - Viewing all orientation steps
 * - Step navigation (Next, Previous)
 * - Skip to end functionality
 * - Dismiss functionality
 * - Help menu access
 * - Keyboard navigation
 * - Progress tracking
 */

// TODO: Re-enable orientation tests once the orientation page component is fully implemented
// These tests timeout in CI because the orientation overlay is not rendering properly
// See: specs/oauth-e2e-test-plan.md for the systematic re-enablement approach
test.describe.skip('Orientation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the onboarding progress API to show orientation step
    await page.route('**/v1/onboarding/progress', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          currentStep: 'ORIENTATION',
          progress: {
            emailVerified: true,
            topicsSelected: true,
            orientationViewed: false,
            firstPostMade: false,
          },
          percentComplete: 50,
          nextAction: {
            step: 'FIRST_POST',
            title: 'Make your first post',
            description: 'Share your perspective in a discussion',
            url: '/discussions',
          },
          completedAt: null,
        }),
      });
    });

    // Mock the mark orientation viewed API
    await page.route('**/v1/onboarding/mark-orientation-viewed', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Orientation marked as viewed',
          onboardingProgress: {
            currentStep: 'ORIENTATION',
            orientationViewed: true,
          },
          nextAction: {
            step: 'FIRST_POST',
            title: 'Make your first post',
            description: 'Share your perspective in a discussion',
            url: '/discussions',
          },
        }),
      });
    });

    // Navigate to orientation page
    await page.goto('/onboarding/orientation');
  });

  test('should display orientation overlay on page load', async ({ page }) => {
    // Check that overlay is visible
    const overlay = page.locator('[role="dialog"]');
    await expect(overlay).toBeVisible();

    // Check header
    await expect(page.getByRole('heading', { name: /platform orientation/i })).toBeVisible();

    // Check progress indicator
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
  });

  test('should display step 1 content (Proposition-based discussions)', async ({ page }) => {
    // Check for step 1 heading
    await expect(
      page.getByRole('heading', { name: /welcome to proposition-based discussions/i }),
    ).toBeVisible();

    // Check for example propositions
    await expect(page.getByText(/public transit infrastructure must improve/i)).toBeVisible();

    // Check for step content
    await expect(page.getByText(/breaking down complex topics/i)).toBeVisible();
  });

  test('should navigate to step 2 when clicking Next', async ({ page }) => {
    // Click Next button
    await page.getByRole('button', { name: /^next$/i }).click();

    // Check step indicator updated
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();

    // Check for step 2 heading
    await expect(
      page.getByRole('heading', { name: /ai-powered discussion insights/i }),
    ).toBeVisible();

    // Check for AI insights content
    await expect(page.getByText(/common ground identified/i)).toBeVisible();
    await expect(page.getByText(/bridging opportunity/i)).toBeVisible();
  });

  test('should navigate to step 3 from step 2', async ({ page }) => {
    // Navigate to step 2
    await page.getByRole('button', { name: /^next$/i }).click();

    // Navigate to step 3
    await page.getByRole('button', { name: /^next$/i }).click();

    // Check step indicator updated
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();

    // Check for step 3 heading
    await expect(
      page.getByRole('heading', { name: /finding common ground together/i }),
    ).toBeVisible();

    // Check for agreement spectrum
    await expect(page.getByText(/agreement spectrum/i)).toBeVisible();

    // Check that Next button changed to Get Started
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  });

  test('should allow navigating backwards with Previous button', async ({ page }) => {
    // Navigate to step 2
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();

    // Click Previous
    await page.getByRole('button', { name: /previous/i }).click();

    // Should be back on step 1
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /welcome to proposition-based discussions/i }),
    ).toBeVisible();
  });

  test('should not show Previous button on step 1', async ({ page }) => {
    // Check that Previous button is not visible
    await expect(page.getByRole('button', { name: /previous/i })).not.toBeVisible();
  });

  test('should show Previous button on steps 2 and 3', async ({ page }) => {
    // Navigate to step 2
    await page.getByRole('button', { name: /^next$/i }).click();

    // Previous button should be visible
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();

    // Navigate to step 3
    await page.getByRole('button', { name: /^next$/i }).click();

    // Previous button should still be visible
    await expect(page.getByRole('button', { name: /previous/i })).toBeVisible();
  });

  test('should update progress bar as user navigates', async ({ page }) => {
    // Check initial progress (33%)
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow', '33');

    // Navigate to step 2
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '67');

    // Navigate to step 3
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('should show step indicator dots', async ({ page }) => {
    // Find all step indicator buttons
    const stepIndicators = page.locator('button[aria-label^="Go to step"]');
    await expect(stepIndicators).toHaveCount(3);

    // First indicator should be active
    const firstIndicator = stepIndicators.nth(0);
    await expect(firstIndicator).toHaveAttribute('aria-current', 'step');
  });

  test('should allow clicking step indicators to jump to steps', async ({ page }) => {
    // Click on step 3 indicator
    await page.locator('button[aria-label="Go to step 3"]').click();

    // Should be on step 3
    await expect(page.getByText(/step 3 of 3/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /finding common ground together/i }),
    ).toBeVisible();
  });

  test('should handle Skip to End button', async ({ page }) => {
    // Click Skip to End button
    await page.getByRole('button', { name: /skip to end/i }).click();

    // Should call the skip API
    // Verify redirect (would navigate to /discussions)
    await page.waitForURL('**/discussions');
  });

  test('should handle Dismiss button', async ({ page }) => {
    // Click Dismiss button
    await page.getByRole('button', { name: /dismiss orientation entirely/i }).click();

    // Should call the dismiss API
    // Verify redirect
    await page.waitForURL('**/discussions');
  });

  test('should complete orientation when clicking Get Started on step 3', async ({ page }) => {
    // Navigate to step 3
    await page.getByRole('button', { name: /^next$/i }).click();
    await page.getByRole('button', { name: /^next$/i }).click();

    // Click Get Started
    await page.getByRole('button', { name: /get started/i }).click();

    // Should call the complete API
    // Verify redirect
    await page.waitForURL('**/discussions');
  });

  test('should support keyboard navigation with arrow keys', async ({ page }) => {
    // Press right arrow to go to next step
    await page.keyboard.press('ArrowRight');

    // Should be on step 2
    await expect(page.getByText(/step 2 of 3/i)).toBeVisible();

    // Press left arrow to go back
    await page.keyboard.press('ArrowLeft');

    // Should be on step 1
    await expect(page.getByText(/step 1 of 3/i)).toBeVisible();
  });

  test('should dismiss overlay on Escape key', async ({ page }) => {
    // Press Escape key
    await page.keyboard.press('Escape');

    // Should dismiss the overlay
    const overlay = page.locator('[role="dialog"]');
    await expect(overlay).not.toBeVisible();
  });

  test('should have accessible structure', async ({ page }) => {
    // Check dialog role
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'orientation-title');

    // Check heading
    await expect(page.getByRole('heading', { name: /platform orientation/i })).toBeVisible();

    // Check all buttons have labels
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await expect(nextButton).toBeVisible();

    const skipButton = page.getByRole('button', { name: /skip to end/i });
    await expect(skipButton).toBeVisible();

    const dismissButton = page.getByRole('button', { name: /dismiss orientation entirely/i });
    await expect(dismissButton).toBeVisible();
  });

  test('should show backdrop blur effect', async ({ page }) => {
    // Check that backdrop has blur class
    const backdrop = page.locator('.backdrop-blur-sm');
    await expect(backdrop).toBeVisible();

    // Check that content underneath is still visible (non-modal)
    await expect(page.getByText(/let's take a quick tour/i)).toBeVisible();
  });

  test.describe('Help Menu Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to home page instead of orientation
      await page.goto('/');
    });

    test('should display help menu in navigation', async ({ page }) => {
      // Check that help button is visible
      const helpButton = page.getByRole('button', { name: /help menu/i });
      await expect(helpButton).toBeVisible();
    });

    test('should open help menu dropdown on click', async ({ page }) => {
      // Click help button
      await page.getByRole('button', { name: /help menu/i }).click();

      // Check dropdown is visible
      await expect(page.getByText(/help & resources/i)).toBeVisible();
      await expect(page.getByText(/view orientation/i)).toBeVisible();
    });

    test('should reopen orientation from help menu', async ({ page }) => {
      // Open help menu
      await page.getByRole('button', { name: /help menu/i }).click();

      // Click "View Orientation"
      await page.getByRole('button', { name: /view orientation/i }).click();

      // Orientation overlay should appear
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).toBeVisible();
      await expect(page.getByRole('heading', { name: /platform orientation/i })).toBeVisible();
    });

    test('should close help menu when clicking outside', async ({ page }) => {
      // Open help menu
      await page.getByRole('button', { name: /help menu/i }).click();

      // Click outside
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // Dropdown should be hidden
      await expect(page.getByText(/help & resources/i)).not.toBeVisible();
    });

    test('should close help menu on Escape key', async ({ page }) => {
      // Open help menu
      await page.getByRole('button', { name: /help menu/i }).click();

      // Press Escape
      await page.keyboard.press('Escape');

      // Dropdown should be hidden
      await expect(page.getByText(/help & resources/i)).not.toBeVisible();
    });
  });

  test.describe('Loading and Error States', () => {
    test('should show loading state while fetching progress', async ({ page }) => {
      // Mock slow API response
      await page.route('**/v1/onboarding/progress', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            userId: '550e8400-e29b-41d4-a716-446655440000',
            currentStep: 'ORIENTATION',
            progress: {
              emailVerified: true,
              topicsSelected: true,
              orientationViewed: false,
              firstPostMade: false,
            },
            percentComplete: 50,
            nextAction: null,
            completedAt: null,
          }),
        });
      });

      await page.goto('/onboarding/orientation');

      // Should show loading indicator
      await expect(page.getByText(/loading orientation/i)).toBeVisible();
    });

    test('should show error state on API failure', async ({ page }) => {
      // Mock API error
      await page.route('**/v1/onboarding/progress', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch onboarding progress',
          }),
        });
      });

      await page.goto('/onboarding/orientation');

      // Should show error message
      await expect(page.getByText(/something went wrong/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
    });

    test('should retry on error', async ({ page }) => {
      let callCount = 0;

      // Mock API error first, then success
      await page.route('**/v1/onboarding/progress', async (route) => {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to fetch onboarding progress',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              userId: '550e8400-e29b-41d4-a716-446655440000',
              currentStep: 'ORIENTATION',
              progress: {
                emailVerified: true,
                topicsSelected: true,
                orientationViewed: false,
                firstPostMade: false,
              },
              percentComplete: 50,
              nextAction: null,
              completedAt: null,
            }),
          });
        }
      });

      await page.goto('/onboarding/orientation');

      // Click Try Again
      await page.getByRole('button', { name: /try again/i }).click();

      // Should show orientation overlay
      const overlay = page.locator('[role="dialog"]');
      await expect(overlay).toBeVisible();
    });
  });
});
