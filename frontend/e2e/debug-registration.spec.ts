/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Debug Test: Registration Network Debugging
 *
 * This test captures all network requests and responses during registration
 * to diagnose why registration hangs in E2E tests.
 */

import { test, expect } from '@playwright/test';

const isE2EDocker = process.env['E2E_DOCKER'] === 'true';

test.describe('Debug: Registration Network Investigation', () => {
  test.skip(!isE2EDocker, 'Requires backend - E2E Docker only');

  test('should capture registration request/response details', async ({ page }) => {
    // Capture all console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture all network requests
    const networkRequests: Array<{ url: string; method: string; status?: number; timing: number }> =
      [];

    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timing: Date.now(),
      });
      console.log(`→ REQUEST: ${request.method()} ${request.url()}`);
    });

    page.on('response', async (response) => {
      const request = networkRequests.find(
        (req) => req.url === response.url() && req.status === undefined,
      );
      if (request) {
        request.status = response.status();
        request.timing = Date.now() - request.timing;
      }
      console.log(
        `← RESPONSE: ${response.status()} ${response.url()} (${request?.timing || '?'}ms)`,
      );

      // Log body for /auth/register
      if (response.url().includes('/auth/register')) {
        try {
          const body = await response.text();
          console.log(`  Body: ${body.substring(0, 500)}`);
        } catch (e) {
          console.log(`  Body: (failed to read - ${e})`);
        }
      }
    });

    page.on('requestfailed', (request) => {
      console.log(
        `✗ REQUEST FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
      );
    });

    // Navigate to registration page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Generate test user
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const testUser = {
      email: `debug-${timestamp}-${random}@example.com`,
      displayName: `DebugUser${timestamp}${random}`,
      password: 'SecurePassword123!',
    };

    console.log(`Test user: ${JSON.stringify(testUser)}`);

    // Fill registration form
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/display name/i).fill(testUser.displayName);
    await page
      .getByLabel(/^password/i)
      .first()
      .fill(testUser.password);
    await page.getByLabel(/confirm password/i).fill(testUser.password);

    // Click register button
    const registerButton = page.getByRole('button', { name: /sign up|register|create account/i });
    console.log('Clicking register button...');
    await registerButton.click();

    // Wait up to 30 seconds for EITHER:
    // 1. Navigation away from /register (success)
    // 2. Error message appears (validation error)
    // 3. Timeout (request hanging)
    try {
      await page.waitForFunction(
        () => {
          return (
            !window.location.pathname.includes('/register') ||
            document.querySelector('[role="alert"]') !== null ||
            document.querySelector('[class*="error"]') !== null
          );
        },
        { timeout: 30000 },
      );
    } catch (e) {
      console.log('Timeout waiting for registration response');
    }

    // Report findings
    console.log('\n=== NETWORK REQUESTS ===');
    networkRequests.forEach((req) => {
      console.log(`${req.method} ${req.url} → ${req.status || 'NO RESPONSE'} (${req.timing}ms)`);
    });

    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg) => console.log(msg));

    console.log('\n=== FINAL STATE ===');
    console.log(`Current URL: ${page.url()}`);
    console.log(`Button text: ${await registerButton.textContent()}`);
    console.log(`Button disabled: ${await registerButton.isDisabled()}`);

    // Check for register request
    const registerRequest = networkRequests.find((req) => req.url.includes('/auth/register'));
    if (!registerRequest) {
      throw new Error('No /auth/register request found!');
    }

    console.log(`\nRegistration request: ${JSON.stringify(registerRequest, null, 2)}`);

    // This test is just for debugging - we expect it to reveal the issue
    expect(registerRequest.status).toBeDefined();
    expect(registerRequest.status).toBe(201);
  });
});
