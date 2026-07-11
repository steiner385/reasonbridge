/**
 * Vitest Configuration for Frontend Tests
 *
 * This configuration sets up Vitest for testing React components with:
 * - React Testing Library (@testing-library/react)
 * - jsdom environment for DOM simulation
 * - Mock Service Worker (MSW) for API mocking
 * - Coverage reporting with v8
 * - JUnit XML output for CI/CD integration
 *
 * @see https://vitest.dev/config/
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,

    // Use jsdom for DOM simulation in tests
    environment: 'jsdom',

    // Increase test timeout for slower form/modal tests in CI (default is 5000ms)
    testTimeout: 15000,

    // Setup files run before each test file
    // - Configures jest-dom matchers
    // - Sets up MSW server for API mocking
    setupFiles: ['./src/setupTests.ts'],

    // Include both .test.{ts,tsx} and .spec.{ts,tsx} unit suites under src.
    // The src .spec files (component suites, hooks, common-ground/moderation
    // panels) previously matched no include glob and never executed.
    // Note: Playwright E2E specs live in frontend/e2e (a separate root) and are
    // not covered by this config, so there is no collision.
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/__tests__/*.test.{ts,tsx}',
      'src/**/__tests__/*.spec.{ts,tsx}',
      'tests/unit/**/*.spec.{ts,tsx}',
      'tests/integration/**/*.spec.{ts,tsx}',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/frontend',
      // Exclude test files and mocks from coverage
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'tests/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/setupTests.ts',
      ],
    },

    // JUnit XML output for CI/CD
    outputFile: {
      junit: '../coverage/junit.xml',
    },
  },
});
