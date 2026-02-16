/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Performance testing utilities
 *
 * This module provides tools for measuring and asserting performance:
 * - Latency analysis with percentile calculations (p50, p95, p99)
 * - Database query timing with EXPLAIN ANALYZE support
 * - Index usage verification
 * - Vitest-compatible assertions
 *
 * @example
 * ```typescript
 * import {
 *   analyzeLatency,
 *   assertLatency,
 *   collectLatencies,
 *   explainAnalyze,
 *   assertQueryTiming,
 * } from '@reason-bridge/testing-utils/perf';
 *
 * // Measure API endpoint latency
 * const latencies = await collectLatencies(() => fetch('/api/users'), 100);
 * assertLatency(latencies, { p95Max: 200, p99Max: 500 });
 *
 * // Verify database query performance
 * await assertQueryTiming(pool, 'SELECT * FROM users WHERE id = $1', ['user-123'], {
 *   maxExecutionTime: 10,
 *   requireIndexScan: true,
 * });
 * ```
 */

// Latency assertions
export {
  analyzeLatency,
  validateLatency,
  assertLatency,
  measureDuration,
  collectLatencies,
  createLatencyCollector,
  formatLatencyStats,
  type LatencyStats,
  type LatencyThresholds,
  type LatencyValidation,
} from './latency-assertions.js';

// Query timing
export {
  explainAnalyze,
  validateQueryTiming,
  assertQueryTiming,
  measureQueryTime,
  collectQueryTimings,
  formatExplainSummary,
  type ExplainAnalyzeResult,
  type QueryTimingThresholds,
  type QueryTimingValidation,
} from './query-timing.js';
