import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright E2E tests
 *
 * When running in Docker E2E mode, this waits for the frontend to be ready
 * before tests start, preventing ERR_CONNECTION_REFUSED errors.
 *
 * Set SKIP_GLOBAL_SETUP_WAIT=true to skip the wait (useful when CI pipeline
 * handles the wait externally).
 */
async function globalSetup(config: FullConfig) {
  // Only wait for frontend in E2E Docker mode
  if (!process.env.E2E_DOCKER) {
    console.log('Skipping frontend health check (not in E2E_DOCKER mode)');
    return;
  }

  // Skip if CI pipeline is handling the wait
  if (process.env.SKIP_GLOBAL_SETUP_WAIT === 'true') {
    console.log('Skipping frontend health check (SKIP_GLOBAL_SETUP_WAIT=true)');
    console.log('CI pipeline will verify frontend accessibility before tests');
    return;
  }

  const baseURL = config.use?.baseURL || 'http://localhost:9080';
  const maxAttempts = 60; // 60 attempts = 2 minutes max wait
  const retryDelay = 2000; // 2 seconds between attempts

  console.log(`\n🔍 Waiting for frontend at ${baseURL} to be ready...`);
  console.log(`Max wait time: ${(maxAttempts * retryDelay) / 1000} seconds\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await page.goto(baseURL, {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
      });

      if (response && response.ok()) {
        console.log(`✅ Frontend is ready! (attempt ${attempt}/${maxAttempts})`);
        await browser.close();
        return;
      }

      console.log(
        `⏳ Attempt ${attempt}/${maxAttempts}: Got HTTP ${response?.status()}, retrying...`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt === maxAttempts) {
        console.error(`\n❌ Frontend did not become ready after ${maxAttempts} attempts`);
        console.error(`Last error: ${errorMessage}\n`);
        await browser.close();
        throw new Error(
          `Frontend health check failed: ${baseURL} not accessible after ${maxAttempts} attempts`,
        );
      }

      console.log(
        `⏳ Attempt ${attempt}/${maxAttempts}: ${errorMessage.split('\n')[0]}, retrying in ${retryDelay / 1000}s...`,
      );
    }

    await page.waitForTimeout(retryDelay);
  }

  await browser.close();
}

export default globalSetup;
