/**
 * Debug test to investigate why moderator role isn't recognized
 * This test is temporary and can be deleted once the issue is resolved
 */
import { test, expect } from '@playwright/test';
import { loginWithDemoAccount } from './helpers/demo-auth';

test.describe('Debug Moderator Role', () => {
  test('should verify Mod Martinez has MODERATOR role in API response', async ({ page }) => {
    // Intercept the /users/me API call
    let userResponse: { role?: string } | null = null;

    page.on('response', async (response) => {
      if (response.url().includes('/users/me') && response.status() === 200) {
        try {
          userResponse = await response.json();
          console.log('🔍 /users/me response:', JSON.stringify(userResponse, null, 2));
        } catch {
          console.log('Failed to parse /users/me response');
        }
      }
    });

    // Login as Mod Martinez
    await loginWithDemoAccount(page, 'Mod Martinez');

    // Navigate to topics page
    await page.goto('/topics');
    await page.waitForLoadState('networkidle');

    // Wait for auth state to be fully loaded - user avatar indicates auth complete
    console.log('⏳ Waiting for auth state to load...');
    try {
      await page.waitForSelector('[data-testid="user-avatar"], [aria-label*="Account"]', {
        timeout: 10000,
      });
      console.log('✅ Auth indicator found - user is logged in');
    } catch {
      console.log('⚠️ Auth indicator not found within 10s');
    }

    // Additional wait for any React state updates
    await page.waitForTimeout(500);

    // Log the intercepted response
    console.log('📋 Captured user response:', JSON.stringify(userResponse, null, 2));

    // Verify the role in the API response
    expect(userResponse).not.toBeNull();
    expect(userResponse?.role).toBe('MODERATOR');

    // Check if React has the correct user state
    const reactUserState = await page.evaluate(() => {
      // Access React internals to get user state (if available)
      const root = document.getElementById('root');
      if (root) {
        // @ts-expect-error - accessing React internals
        const reactRoot = root._reactRootContainer;
        console.log('React root found:', !!reactRoot);
      }
      return null;
    });
    console.log('🔧 React user state check:', reactUserState);

    // Also check if the Merge Topics button is visible
    const mergeButton = page.getByRole('button', { name: /merge topics/i });
    const buttonCount = await mergeButton.count();
    console.log(`🔘 Merge Topics button count: ${buttonCount}`);

    // Log if button is visible or not
    if (buttonCount === 0) {
      console.log('❌ Merge Topics button NOT visible - role check in UI is failing');

      // Check the auth state in the browser
      const authState = await page.evaluate(() => {
        // Try to get user from localStorage
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        return {
          hasToken: !!token,
          tokenPreview: token ? token.substring(0, 50) + '...' : null,
        };
      });
      console.log('🔐 Auth state:', JSON.stringify(authState, null, 2));

      // Log all buttons on the page for debugging
      const allButtons = await page.locator('button').allTextContents();
      console.log('📋 All buttons on page:', allButtons.join(', '));

      // Check for the Create Topic button to verify page loaded correctly
      const createButton = page.getByRole('button', { name: /create topic/i });
      const createButtonVisible = await createButton.isVisible();
      console.log(`📝 Create Topic button visible: ${createButtonVisible}`);
    } else {
      console.log('✅ Merge Topics button IS visible');
    }

    // Assert that the button should be visible for a moderator
    await expect(mergeButton).toBeVisible();
  });

  test('should compare regular user vs moderator button visibility', async ({ page }) => {
    // First, login as Alice (regular user) and check
    await loginWithDemoAccount(page, 'Alice Anderson');
    await page.goto('/topics');
    await page.waitForLoadState('networkidle');

    const mergeButtonAsAlice = page.getByRole('button', { name: /merge topics/i });
    const aliceButtonCount = await mergeButtonAsAlice.count();
    console.log(`👤 Alice (regular user) - Merge button count: ${aliceButtonCount}`);

    // Logout by clearing storage and navigating away
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Now login as Mod Martinez
    await loginWithDemoAccount(page, 'Mod Martinez');
    await page.goto('/topics');
    await page.waitForLoadState('networkidle');

    const mergeButtonAsMod = page.getByRole('button', { name: /merge topics/i });
    const modButtonCount = await mergeButtonAsMod.count();
    console.log(`👮 Mod Martinez (moderator) - Merge button count: ${modButtonCount}`);

    // Regular user should NOT see the button
    expect(aliceButtonCount).toBe(0);

    // Moderator SHOULD see the button
    expect(modButtonCount).toBeGreaterThan(0);
  });
});
