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
    // Include both .test.ts and .spec.ts unit suites (E2E/Playwright specs live
    // under frontend/e2e). The notification event-handler suites are no longer
    // excluded: @prisma/client is aliased + inlined below (see resolve/ssr) so
    // they resolve correctly instead of failing on "Prisma module resolution".
    include: ['src/**/*.{test,spec}.ts'],
    server: {
      deps: {
        inline: ['@prisma/client'],
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.integration.test.ts', // Run in integration test phase
      '**/*.integration.spec.ts', // Run in integration test phase
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.integration.test.ts',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit-unit.xml',
    },
  },
  ssr: {
    noExternal: ['@prisma/client'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve @prisma/client from db-models (where it is generated) so the
      // event-handler suites resolve it under vitest's ESM loader.
      '@prisma/client': path.resolve(
        __dirname,
        '../../packages/db-models/node_modules/@prisma/client',
      ),
    },
  },
});
