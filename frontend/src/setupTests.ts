/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Test Setup Configuration
 *
 * This file runs before all tests and sets up:
 * - jest-dom matchers for better assertions
 * - Mock Service Worker (MSW) for API mocking
 *
 * @see https://vitest.dev/config/#setupfiles
 */

/// <reference types="vitest/globals" />

import '@testing-library/jest-dom';
import { server } from './test/mocks/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests during development
  });
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
