/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

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
      // CI: Prisma client module resolution issues
      '**/trust-score.calculator.test.ts',
      '**/users.controller.test.ts',
      '**/users.service.test.ts',
      '**/verification.controller.test.ts',
      '**/verification.service.test.ts',
      '**/video-upload.service.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@reasonbridge/common': path.resolve(__dirname, '../../packages/common/src'),
    },
  },
});
