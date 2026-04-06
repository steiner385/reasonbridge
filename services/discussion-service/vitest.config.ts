/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@reason-bridge/testing-utils/setup': path.resolve(
        __dirname,
        '../../packages/testing-utils/dist/setup/index.js',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Include unit tests (.test.ts) and contract tests (.spec.ts in tests/contract/)
    // Note: E2E/Playwright tests are in frontend/e2e/ and use separate config
    include: ['src/**/*.test.ts', 'tests/contract/**/*.spec.ts'],
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
