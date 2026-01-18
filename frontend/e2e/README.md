# E2E Testing with Playwright

This directory contains end-to-end tests for the Unite Discord frontend application.

## Running Tests

### Prerequisites

- The Playwright browsers must be installed: `npx playwright install`
- For the first time, install system dependencies: `npx playwright install-deps`

### Test Commands

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Show last test report
npm run test:e2e:report
```

## Test Structure

Tests are organized in the `e2e/` directory:

- `example.spec.ts` - Example test suite demonstrating basic patterns

## Configuration

The Playwright configuration is in `playwright.config.ts` at the frontend root.

Key settings:

- Base URL: `http://localhost:5173` (configurable via `PLAYWRIGHT_BASE_URL`)
- Browser: Chromium (can be extended to Firefox, WebKit)
- Screenshots: Captured on failure
- Video: Captured on retry
- Traces: Captured on first retry

## Writing Tests

Example test pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

## CI/CD Integration

The tests are configured to run optimally in CI environments:

- Retries: 2 retries on CI, 0 locally
- Workers: 1 on CI, unlimited locally
- Forbid `.only`: Tests with `.only` will fail on CI

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
