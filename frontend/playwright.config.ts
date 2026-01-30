import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Global setup to wait for frontend readiness in E2E Docker mode */
  globalSetup: './global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry disabled to prevent crash from accumulated timeout failures */
  retries: 0,
  /* Serialize tests in CI to prevent OOM - single worker uses less peak memory */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['junit', { outputFile: '../coverage/e2e-junit.xml' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ||
      (process.env.E2E_DOCKER
        ? `http://localhost:${process.env.E2E_FRONTEND_PORT || '9080'}` // Containerized frontend for E2E tests (configurable port)
        : process.env.CI
          ? 'http://localhost:4173' // Vite preview for CI
          : 'http://localhost:3000'), // Dev server for local development

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot strategy:
     * - Capture only on failure to reduce memory usage in CI
     */
    screenshot: 'only-on-failure',

    /* Capture video on first retry */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.E2E_DOCKER
    ? undefined // Don't start dev server when using Docker Compose
    : {
        command: process.env.CI ? 'npm run preview' : 'npm run dev',
        url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 180000, // 3 minutes to allow dev server to start
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
