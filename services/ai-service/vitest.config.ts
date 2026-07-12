/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Resolve @prisma/client from the db-models package (where it is generated) and
  // inline it so vitest's ESM loader can resolve it in the pnpm workspace. This is
  // the same pattern the root vitest.config.ts uses, and it lets the feedback /
  // analyzer suites run instead of being excluded for "Prisma module resolution".
  resolve: {
    alias: {
      '@prisma/client': path.resolve(
        __dirname,
        '../../packages/db-models/node_modules/@prisma/client',
      ),
    },
  },
  ssr: {
    noExternal: ['@prisma/client'],
  },
  test: {
    globals: true,
    environment: 'node',
    server: {
      deps: {
        inline: ['@prisma/client'],
      },
    },
    // Include unit tests (.test.ts / .spec.ts), contract tests, snapshot tests,
    // and the tests/integration suite. E2E/Playwright tests live in frontend/e2e.
    include: [
      'src/**/*.{test,spec}.ts',
      'tests/contract/**/*.spec.ts',
      'tests/snapshots/**/*.snap.ts',
      'tests/integration/**/*.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts', // Run in integration test phase
      '**/*.integration.spec.ts', // Run in integration test phase (src/**)
      '**/__benchmarks__/**', // Run separately: pnpm test:benchmarks
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      thresholds: {
        lines: 50,
        functions: 45,
        branches: 40,
        statements: 50,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit-unit.xml',
    },
  },
});
