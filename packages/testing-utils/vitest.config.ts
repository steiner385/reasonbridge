/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Integration tests require database - run separately in CI
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit-unit.xml',
    },
  },
});
