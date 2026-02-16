/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Performance assertion helpers for latency testing
 *
 * Provides statistical analysis and assertions for latency measurements,
 * including percentile calculations (p50, p95, p99), mean/median,
 * and integration with Vitest expect matchers.
 */

import { AssertionError } from '../assertions/index.js';

/**
 * Result of latency analysis
 */
export interface LatencyStats {
  /** Number of samples */
  count: number;
  /** Minimum latency in milliseconds */
  min: number;
  /** Maximum latency in milliseconds */
  max: number;
  /** Mean (average) latency in milliseconds */
  mean: number;
  /** Median (50th percentile) latency in milliseconds */
  median: number;
  /** 90th percentile latency */
  p90: number;
  /** 95th percentile latency */
  p95: number;
  /** 99th percentile latency */
  p99: number;
  /** Standard deviation */
  stdDev: number;
}

/**
 * Options for latency assertions
 */
export interface LatencyThresholds {
  /** Maximum acceptable p95 latency in milliseconds */
  p95Max?: number;
  /** Maximum acceptable p99 latency in milliseconds */
  p99Max?: number;
  /** Maximum acceptable mean latency in milliseconds */
  meanMax?: number;
  /** Maximum acceptable median latency in milliseconds */
  medianMax?: number;
  /** Maximum acceptable max latency in milliseconds */
  maxMax?: number;
}

/**
 * Result of latency threshold validation
 */
export interface LatencyValidation {
  /** Whether all thresholds passed */
  passed: boolean;
  /** Individual threshold results */
  results: {
    name: string;
    threshold: number;
    actual: number;
    passed: boolean;
  }[];
  /** Computed statistics */
  stats: LatencyStats;
}

/**
 * Calculate percentile value from sorted array
 *
 * @param sorted - Array of numbers in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns The percentile value
 */
function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0] ?? 0;

  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sorted.length) return sorted[sorted.length - 1] ?? 0;

  const lowerVal = sorted[lower] ?? 0;
  const upperVal = sorted[upper] ?? 0;
  return lowerVal * (1 - weight) + upperVal * weight;
}

/**
 * Calculate standard deviation
 *
 * @param values - Array of numbers
 * @param mean - Pre-calculated mean value
 * @returns Standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Analyze an array of latency measurements
 *
 * @param latencies - Array of latency measurements in milliseconds
 * @returns Statistical analysis of the latencies
 *
 * @example
 * ```typescript
 * const latencies = [10, 15, 12, 18, 25, 11, 14, 16, 20, 22];
 * const stats = analyzeLatency(latencies);
 * console.log(`p95: ${stats.p95}ms, mean: ${stats.mean}ms`);
 * ```
 */
export function analyzeLatency(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;

  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean,
    median: calculatePercentile(sorted, 50),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    stdDev: calculateStdDev(sorted, mean),
  };
}

/**
 * Validate latencies against thresholds
 *
 * @param latencies - Array of latency measurements in milliseconds
 * @param thresholds - Maximum acceptable values for various metrics
 * @returns Validation result with pass/fail status and details
 *
 * @example
 * ```typescript
 * const result = validateLatency(latencies, {
 *   p95Max: 200,
 *   p99Max: 500,
 *   meanMax: 100,
 * });
 * if (!result.passed) {
 *   console.log('Failed thresholds:', result.results.filter(r => !r.passed));
 * }
 * ```
 */
export function validateLatency(
  latencies: number[],
  thresholds: LatencyThresholds,
): LatencyValidation {
  const stats = analyzeLatency(latencies);
  const results: LatencyValidation['results'] = [];

  if (thresholds.p95Max !== undefined) {
    results.push({
      name: 'p95',
      threshold: thresholds.p95Max,
      actual: stats.p95,
      passed: stats.p95 <= thresholds.p95Max,
    });
  }

  if (thresholds.p99Max !== undefined) {
    results.push({
      name: 'p99',
      threshold: thresholds.p99Max,
      actual: stats.p99,
      passed: stats.p99 <= thresholds.p99Max,
    });
  }

  if (thresholds.meanMax !== undefined) {
    results.push({
      name: 'mean',
      threshold: thresholds.meanMax,
      actual: stats.mean,
      passed: stats.mean <= thresholds.meanMax,
    });
  }

  if (thresholds.medianMax !== undefined) {
    results.push({
      name: 'median',
      threshold: thresholds.medianMax,
      actual: stats.median,
      passed: stats.median <= thresholds.medianMax,
    });
  }

  if (thresholds.maxMax !== undefined) {
    results.push({
      name: 'max',
      threshold: thresholds.maxMax,
      actual: stats.max,
      passed: stats.max <= thresholds.maxMax,
    });
  }

  return {
    passed: results.every((r) => r.passed),
    results,
    stats,
  };
}

/**
 * Assert that latencies meet specified thresholds
 *
 * @param latencies - Array of latency measurements in milliseconds
 * @param thresholds - Maximum acceptable values for various metrics
 * @throws AssertionError if any threshold is exceeded
 *
 * @example
 * ```typescript
 * // In a Vitest test
 * it('should respond within SLA', async () => {
 *   const latencies = await measureEndpointLatency('/api/users', 100);
 *   assertLatency(latencies, { p95Max: 200, p99Max: 500 });
 * });
 * ```
 */
export function assertLatency(latencies: number[], thresholds: LatencyThresholds): void {
  const validation = validateLatency(latencies, thresholds);

  if (!validation.passed) {
    const failures = validation.results.filter((r) => !r.passed);
    const failureMessages = failures
      .map((f) => `${f.name}: ${f.actual.toFixed(2)}ms > ${f.threshold}ms`)
      .join(', ');

    throw new AssertionError(
      `Latency thresholds exceeded: ${failureMessages}`,
      thresholds,
      validation.stats,
    );
  }
}

/**
 * Measure execution time of a function
 *
 * @param fn - Function to measure (can be async)
 * @returns Duration in milliseconds
 *
 * @example
 * ```typescript
 * const duration = await measureDuration(async () => {
 *   await fetch('/api/data');
 * });
 * expect(duration).toBeLessThan(100);
 * ```
 */
export async function measureDuration(fn: () => unknown | Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

/**
 * Collect multiple latency samples by running a function repeatedly
 *
 * @param fn - Function to measure (can be async)
 * @param iterations - Number of times to run the function
 * @param options - Additional options
 * @returns Array of duration measurements in milliseconds
 *
 * @example
 * ```typescript
 * const latencies = await collectLatencies(
 *   () => fetch('/api/users'),
 *   100,
 *   { warmup: 5 }
 * );
 * assertLatency(latencies, { p95Max: 200 });
 * ```
 */
export async function collectLatencies(
  fn: () => unknown | Promise<unknown>,
  iterations: number,
  options: {
    /** Number of warmup iterations to discard */
    warmup?: number;
    /** Delay between iterations in milliseconds */
    delayMs?: number;
  } = {},
): Promise<number[]> {
  const { warmup = 0, delayMs = 0 } = options;
  const latencies: number[] = [];

  // Warmup runs (discarded)
  for (let i = 0; i < warmup; i++) {
    await fn();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Measured runs
  for (let i = 0; i < iterations; i++) {
    const duration = await measureDuration(fn);
    latencies.push(duration);
    if (delayMs > 0 && i < iterations - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return latencies;
}

/**
 * Create a latency collector for incremental measurements
 *
 * @returns Collector object with record() and getStats() methods
 *
 * @example
 * ```typescript
 * const collector = createLatencyCollector();
 *
 * // Record measurements as they happen
 * collector.record(await measureDuration(() => api.call()));
 * collector.record(await measureDuration(() => api.call()));
 *
 * // Get final stats
 * const stats = collector.getStats();
 * assertLatency(collector.getLatencies(), { p95Max: 200 });
 * ```
 */
export function createLatencyCollector(): {
  record: (latency: number) => void;
  getLatencies: () => number[];
  getStats: () => LatencyStats;
  clear: () => void;
} {
  let latencies: number[] = [];

  return {
    record(latency: number) {
      latencies.push(latency);
    },
    getLatencies() {
      return [...latencies];
    },
    getStats() {
      return analyzeLatency(latencies);
    },
    clear() {
      latencies = [];
    },
  };
}

/**
 * Format latency stats as a human-readable string
 *
 * @param stats - Latency statistics to format
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const stats = analyzeLatency(latencies);
 * console.log(formatLatencyStats(stats));
 * // Output: "n=100 | min=5.2ms | p50=12.4ms | p95=45.2ms | p99=89.1ms | max=102.3ms"
 * ```
 */
export function formatLatencyStats(stats: LatencyStats): string {
  return [
    `n=${stats.count}`,
    `min=${stats.min.toFixed(1)}ms`,
    `p50=${stats.median.toFixed(1)}ms`,
    `p95=${stats.p95.toFixed(1)}ms`,
    `p99=${stats.p99.toFixed(1)}ms`,
    `max=${stats.max.toFixed(1)}ms`,
  ].join(' | ');
}
