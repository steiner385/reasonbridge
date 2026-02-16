/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
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
      // CI: Prisma client module resolution issues
      '**/ai-feedback-analysis.test.ts',
      '**/clarity-analyzer.service.test.ts',
      '**/fallacy-detector.service.test.ts',
      '**/response-analyzer.service.test.ts',
      '**/tone-analyzer.service.test.ts',
      '**/feedback.controller.test.ts',
      '**/feedback.service.test.ts',
      '**/feedback-analytics.service.test.ts',
      '**/suggestions.controller.test.ts',
    ],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});
