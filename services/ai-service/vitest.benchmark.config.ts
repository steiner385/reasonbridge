/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Vitest configuration for benchmark tests
 *
 * Benchmark tests are separated from regular tests because:
 * 1. They run many iterations (100+) per test case
 * 2. They measure performance, not correctness
 * 3. They should not block CI pipelines
 *
 * Run with: pnpm test:benchmarks
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__benchmarks__/**/*.benchmark.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Longer timeout for benchmark tests
    testTimeout: 60000,
    // Sequential execution for consistent latency measurements
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    reporters: ['default'],
  },
});
