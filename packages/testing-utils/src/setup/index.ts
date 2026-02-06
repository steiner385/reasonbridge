/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared Vitest Setup with MSW Handlers
 *
 * This setup file initializes the MSW server and configures global test hooks.
 * Import this file in vitest.config.ts setupFiles to enable API mocking.
 *
 * @example
 * ```typescript
 * // vitest.config.ts
 * export default defineConfig({
 *   test: {
 *     setupFiles: ['@reason-bridge/testing-utils/setup'],
 *   },
 * });
 * ```
 */

import { server, resetHandlers } from '../msw/server.js';

/**
 * Test environment configuration
 */
export const testEnv = {
  /**
   * API base URL for tests
   */
  API_BASE_URL: process.env['API_BASE_URL'] || 'http://localhost:3000/api',

  /**
   * Whether we're running in CI
   */
  CI: process.env['CI'] === 'true',

  /**
   * Test timeout in milliseconds
   */
  TEST_TIMEOUT: parseInt(process.env['TEST_TIMEOUT'] || '5000', 10),

  /**
   * Node environment
   */
  NODE_ENV: process.env['NODE_ENV'] || 'test',
};

/**
 * Configure test environment variables
 */
function configureTestEnvironment(): void {
  // Set NODE_ENV to test if not already set
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'test';
  }

  // Note: Console suppression is intentionally disabled to avoid pre-commit hook issues.
  // If needed, individual test files can mock console using vi.spyOn().
  // This is test infrastructure code, not production code.
}

/**
 * Initialize MSW server
 */
function initializeMswServer(): void {
  // Start MSW server before all tests
  server.listen({
    onUnhandledRequest: testEnv.CI ? 'error' : 'warn',
  });
}

/**
 * Setup function called before all tests
 */
export function setupBeforeAll(): void {
  configureTestEnvironment();
  initializeMswServer();
}

/**
 * Cleanup function called after each test
 */
export function cleanupAfterEach(): void {
  // Reset MSW handlers to initial state
  resetHandlers();
}

/**
 * Teardown function called after all tests
 */
export function teardownAfterAll(): void {
  // Close MSW server
  server.close();
}

// Auto-setup when this file is imported as a setup file
// Check if we're in a Vitest environment
if (typeof globalThis !== 'undefined') {
  // Register hooks if Vitest globals are available
  if (typeof beforeAll === 'function') {
    beforeAll(() => {
      setupBeforeAll();
    });
  }

  if (typeof afterEach === 'function') {
    afterEach(() => {
      cleanupAfterEach();
    });
  }

  if (typeof afterAll === 'function') {
    afterAll(() => {
      teardownAfterAll();
    });
  }
}

// Export everything for manual setup
export { server, resetHandlers } from '../msw/server.js';
export { defaultHandlers, addHandlers } from '../msw/index.js';
