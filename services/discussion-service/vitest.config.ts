/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Only include .test.ts files - .spec.ts is reserved for E2E/Playwright tests
    include: ['src/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts', // Run in integration test phase
      '**/*-performance.test.ts', // Run separately due to high memory usage
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});
