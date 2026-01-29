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

    // Setup files run before each test file
    // - Configures jest-dom matchers
    // - Sets up MSW server for API mocking
    setupFiles: ['./src/setupTests.ts'],

    // Include component tests in src directory
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../coverage/frontend',
      // Exclude test files and mocks from coverage
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/setupTests.ts'],
    },

    // JUnit XML output for CI/CD
    outputFile: {
      junit: '../coverage/junit.xml',
    },
  },
});
