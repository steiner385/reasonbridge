import { test, expect } from '@playwright/test';

test('debug discussion page with console logging', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  // Navigate to discussions page
  await page.goto('/discussions');

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Try to select first topic
  try {
    await page.locator('[data-testid="topic-list-item"]').first().click({ timeout: 5000 });
  } catch (e) {
    console.log('Failed to click topic:', e);
  }

  // Wait a bit more
  await page.waitForTimeout(3000);

  // Print all captured errors
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach((msg) => console.log(msg));

  console.log('\n=== PAGE ERRORS ===');
  pageErrors.forEach((err) => console.log(err));

  // Fail test to see output
  expect(pageErrors.length).toBe(0);
});
