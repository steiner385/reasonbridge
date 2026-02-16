/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Database query timing assertions
 *
 * Provides utilities for measuring and asserting database query performance,
 * including EXPLAIN ANALYZE wrappers, index usage verification, and
 * execution time thresholds.
 */

import type { Pool } from 'pg';
import { AssertionError } from '../assertions/index.js';

/**
 * Result of EXPLAIN ANALYZE query
 */
export interface ExplainAnalyzeResult {
  /** Raw EXPLAIN ANALYZE output lines */
  rawOutput: string[];
  /** Parsed execution time in milliseconds */
  executionTime: number;
  /** Parsed planning time in milliseconds */
  planningTime: number;
  /** Total time (planning + execution) in milliseconds */
  totalTime: number;
  /** Whether the query used an index scan */
  usedIndexScan: boolean;
  /** Whether the query used a sequential scan */
  usedSequentialScan: boolean;
  /** Index names used in the query */
  indexesUsed: string[];
  /** Estimated vs actual row counts (for detecting estimate accuracy) */
  rowEstimates: {
    estimated: number;
    actual: number;
    accuracy: number; // ratio of actual/estimated
  }[];
}

/**
 * Options for query timing assertions
 */
export interface QueryTimingThresholds {
  /** Maximum acceptable execution time in milliseconds */
  maxExecutionTime?: number;
  /** Maximum acceptable total time (planning + execution) in milliseconds */
  maxTotalTime?: number;
  /** Require index scan (fail if sequential scan used) */
  requireIndexScan?: boolean;
  /** Require specific index to be used */
  requireIndex?: string;
  /** Maximum acceptable row estimate inaccuracy (ratio) */
  maxEstimateInaccuracy?: number;
}

/**
 * Result of query timing validation
 */
export interface QueryTimingValidation {
  /** Whether all thresholds passed */
  passed: boolean;
  /** Individual threshold results */
  results: {
    name: string;
    threshold: unknown;
    actual: unknown;
    passed: boolean;
  }[];
  /** EXPLAIN ANALYZE results */
  explain: ExplainAnalyzeResult;
}

/**
 * Parse EXPLAIN ANALYZE output from PostgreSQL
 *
 * @param lines - Array of output lines from EXPLAIN ANALYZE
 * @returns Parsed analysis results
 */
function parseExplainAnalyze(lines: string[]): ExplainAnalyzeResult {
  let executionTime = 0;
  let planningTime = 0;
  const indexesUsed: string[] = [];
  let usedIndexScan = false;
  let usedSequentialScan = false;
  const rowEstimates: ExplainAnalyzeResult['rowEstimates'] = [];

  for (const line of lines) {
    // Parse execution time: "Execution Time: 0.123 ms"
    const execMatch = line.match(/Execution Time:\s*([\d.]+)\s*ms/i);
    if (execMatch?.[1]) {
      executionTime = parseFloat(execMatch[1]);
    }

    // Parse planning time: "Planning Time: 0.045 ms"
    const planMatch = line.match(/Planning Time:\s*([\d.]+)\s*ms/i);
    if (planMatch?.[1]) {
      planningTime = parseFloat(planMatch[1]);
    }

    // Detect index scan: "Index Scan using idx_name on table"
    const indexScanMatch = line.match(/Index (?:Scan|Only Scan) using (\S+)/i);
    if (indexScanMatch?.[1]) {
      usedIndexScan = true;
      const indexName = indexScanMatch[1];
      if (!indexesUsed.includes(indexName)) {
        indexesUsed.push(indexName);
      }
    }

    // Detect sequential scan: "Seq Scan on table"
    if (/Seq Scan/i.test(line)) {
      usedSequentialScan = true;
    }

    // Parse row estimates: "(cost=... rows=100 width=...) (actual ... rows=95 ...)"
    const rowMatch = line.match(/rows=(\d+).*?\).*actual.*rows=(\d+)/i);
    if (rowMatch?.[1] && rowMatch[2]) {
      const estimated = parseInt(rowMatch[1], 10);
      const actual = parseInt(rowMatch[2], 10);
      rowEstimates.push({
        estimated,
        actual,
        accuracy: estimated > 0 ? actual / estimated : actual === 0 ? 1 : Infinity,
      });
    }
  }

  return {
    rawOutput: lines,
    executionTime,
    planningTime,
    totalTime: planningTime + executionTime,
    usedIndexScan,
    usedSequentialScan,
    indexesUsed,
    rowEstimates,
  };
}

/**
 * Run EXPLAIN ANALYZE on a query and parse the results
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query to analyze
 * @param params - Query parameters
 * @returns Parsed EXPLAIN ANALYZE results
 *
 * @example
 * ```typescript
 * const result = await explainAnalyze(pool, 'SELECT * FROM users WHERE id = $1', ['user-123']);
 * console.log(`Execution time: ${result.executionTime}ms`);
 * console.log(`Used indexes: ${result.indexesUsed.join(', ')}`);
 * ```
 */
export async function explainAnalyze(
  pool: Pool,
  query: string,
  params: unknown[] = [],
): Promise<ExplainAnalyzeResult> {
  const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`;
  const result = await pool.query(explainQuery, params);

  const lines = result.rows.map((row: { 'QUERY PLAN': string }) => row['QUERY PLAN']);
  return parseExplainAnalyze(lines);
}

/**
 * Validate query timing against thresholds
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query to analyze
 * @param params - Query parameters
 * @param thresholds - Timing and behavior thresholds
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const validation = await validateQueryTiming(
 *   pool,
 *   'SELECT * FROM topics WHERE status = $1 ORDER BY created_at DESC LIMIT 20',
 *   ['ACTIVE'],
 *   {
 *     maxExecutionTime: 50,
 *     requireIndexScan: true,
 *   }
 * );
 * if (!validation.passed) {
 *   console.log('Query needs optimization');
 * }
 * ```
 */
export async function validateQueryTiming(
  pool: Pool,
  query: string,
  params: unknown[],
  thresholds: QueryTimingThresholds,
): Promise<QueryTimingValidation> {
  const explain = await explainAnalyze(pool, query, params);
  const results: QueryTimingValidation['results'] = [];

  if (thresholds.maxExecutionTime !== undefined) {
    results.push({
      name: 'maxExecutionTime',
      threshold: thresholds.maxExecutionTime,
      actual: explain.executionTime,
      passed: explain.executionTime <= thresholds.maxExecutionTime,
    });
  }

  if (thresholds.maxTotalTime !== undefined) {
    results.push({
      name: 'maxTotalTime',
      threshold: thresholds.maxTotalTime,
      actual: explain.totalTime,
      passed: explain.totalTime <= thresholds.maxTotalTime,
    });
  }

  if (thresholds.requireIndexScan) {
    results.push({
      name: 'requireIndexScan',
      threshold: true,
      actual: explain.usedIndexScan,
      passed: explain.usedIndexScan && !explain.usedSequentialScan,
    });
  }

  if (thresholds.requireIndex) {
    const indexUsed = explain.indexesUsed.includes(thresholds.requireIndex);
    results.push({
      name: 'requireIndex',
      threshold: thresholds.requireIndex,
      actual: explain.indexesUsed,
      passed: indexUsed,
    });
  }

  if (thresholds.maxEstimateInaccuracy !== undefined) {
    const maxInaccuracy = Math.max(...explain.rowEstimates.map((r) => Math.abs(1 - r.accuracy)), 0);
    results.push({
      name: 'maxEstimateInaccuracy',
      threshold: thresholds.maxEstimateInaccuracy,
      actual: maxInaccuracy,
      passed: maxInaccuracy <= thresholds.maxEstimateInaccuracy,
    });
  }

  return {
    passed: results.every((r) => r.passed),
    results,
    explain,
  };
}

/**
 * Assert that a query meets timing and behavior thresholds
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query to analyze
 * @param params - Query parameters
 * @param thresholds - Timing and behavior thresholds
 * @throws AssertionError if any threshold is exceeded
 *
 * @example
 * ```typescript
 * // In a Vitest test
 * it('should use index for user lookup', async () => {
 *   await assertQueryTiming(
 *     pool,
 *     'SELECT * FROM users WHERE email = $1',
 *     ['test@example.com'],
 *     {
 *       maxExecutionTime: 10,
 *       requireIndexScan: true,
 *       requireIndex: 'idx_users_email',
 *     }
 *   );
 * });
 * ```
 */
export async function assertQueryTiming(
  pool: Pool,
  query: string,
  params: unknown[],
  thresholds: QueryTimingThresholds,
): Promise<void> {
  const validation = await validateQueryTiming(pool, query, params, thresholds);

  if (!validation.passed) {
    const failures = validation.results.filter((r) => !r.passed);
    const failureMessages = failures
      .map(
        (f) =>
          `${f.name}: expected ${JSON.stringify(f.threshold)}, got ${JSON.stringify(f.actual)}`,
      )
      .join('; ');

    throw new AssertionError(
      `Query timing thresholds exceeded: ${failureMessages}\n\nQuery: ${query}\n\nEXPLAIN output:\n${validation.explain.rawOutput.join('\n')}`,
      thresholds,
      validation.explain,
    );
  }
}

/**
 * Measure query execution time (simple timing without EXPLAIN ANALYZE)
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query to measure
 * @param params - Query parameters
 * @returns Execution time in milliseconds
 *
 * @example
 * ```typescript
 * const duration = await measureQueryTime(pool, 'SELECT COUNT(*) FROM topics');
 * expect(duration).toBeLessThan(100);
 * ```
 */
export async function measureQueryTime(
  pool: Pool,
  query: string,
  params: unknown[] = [],
): Promise<number> {
  const start = performance.now();
  await pool.query(query, params);
  return performance.now() - start;
}

/**
 * Collect multiple query timing samples
 *
 * @param pool - PostgreSQL connection pool
 * @param query - SQL query to measure
 * @param params - Query parameters
 * @param iterations - Number of times to run the query
 * @param options - Additional options
 * @returns Array of execution times in milliseconds
 *
 * @example
 * ```typescript
 * const timings = await collectQueryTimings(
 *   pool,
 *   'SELECT * FROM topics WHERE id = $1',
 *   ['topic-123'],
 *   50,
 *   { warmup: 5 }
 * );
 *
 * const stats = analyzeLatency(timings);
 * assertLatency(timings, { p95Max: 10 });
 * ```
 */
export async function collectQueryTimings(
  pool: Pool,
  query: string,
  params: unknown[],
  iterations: number,
  options: { warmup?: number } = {},
): Promise<number[]> {
  const { warmup = 0 } = options;
  const timings: number[] = [];

  // Warmup runs (discarded)
  for (let i = 0; i < warmup; i++) {
    await pool.query(query, params);
  }

  // Measured runs
  for (let i = 0; i < iterations; i++) {
    const duration = await measureQueryTime(pool, query, params);
    timings.push(duration);
  }

  return timings;
}

/**
 * Format EXPLAIN ANALYZE results as a human-readable summary
 *
 * @param result - EXPLAIN ANALYZE results
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const result = await explainAnalyze(pool, query);
 * console.log(formatExplainSummary(result));
 * // Output: "exec=0.12ms | plan=0.05ms | total=0.17ms | indexes: idx_topics_status"
 * ```
 */
export function formatExplainSummary(result: ExplainAnalyzeResult): string {
  const parts = [
    `exec=${result.executionTime.toFixed(2)}ms`,
    `plan=${result.planningTime.toFixed(2)}ms`,
    `total=${result.totalTime.toFixed(2)}ms`,
  ];

  if (result.indexesUsed.length > 0) {
    parts.push(`indexes: ${result.indexesUsed.join(', ')}`);
  } else if (result.usedSequentialScan) {
    parts.push('WARN: seq scan');
  }

  return parts.join(' | ');
}
