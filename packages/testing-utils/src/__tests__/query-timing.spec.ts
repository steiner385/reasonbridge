/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool, QueryResult } from 'pg';
import {
  explainAnalyze,
  validateQueryTiming,
  assertQueryTiming,
  measureQueryTime,
  collectQueryTimings,
  formatExplainSummary,
} from '../perf/query-timing.js';

// Mock pool factory
function createMockPool(explainOutput: string[]): Pool {
  return {
    query: vi.fn().mockResolvedValue({
      rows: explainOutput.map((line) => ({ 'QUERY PLAN': line })),
    } as QueryResult),
  } as unknown as Pool;
}

describe('query-timing', () => {
  describe('explainAnalyze', () => {
    it('should parse execution and planning times', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100) (actual time=0.010..0.050 rows=100 loops=1)',
        'Planning Time: 0.045 ms',
        'Execution Time: 0.123 ms',
      ]);

      const result = await explainAnalyze(pool, 'SELECT * FROM users');

      expect(result.planningTime).toBe(0.045);
      expect(result.executionTime).toBe(0.123);
      expect(result.totalTime).toBeCloseTo(0.168, 3);
    });

    it('should detect index scan', async () => {
      const pool = createMockPool([
        'Index Scan using idx_users_email on users  (cost=0.00..8.27 rows=1 width=100)',
        'Planning Time: 0.030 ms',
        'Execution Time: 0.010 ms',
      ]);

      const result = await explainAnalyze(
        pool,
        "SELECT * FROM users WHERE email = 'test@example.com'",
      );

      expect(result.usedIndexScan).toBe(true);
      expect(result.usedSequentialScan).toBe(false);
      expect(result.indexesUsed).toContain('idx_users_email');
    });

    it('should detect sequential scan', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 0.123 ms',
      ]);

      const result = await explainAnalyze(pool, 'SELECT * FROM users');

      expect(result.usedSequentialScan).toBe(true);
      expect(result.usedIndexScan).toBe(false);
      expect(result.indexesUsed).toEqual([]);
    });

    it('should detect Index Only Scan', async () => {
      const pool = createMockPool([
        'Index Only Scan using idx_topics_covering on topics  (cost=0.00..5.00 rows=10 width=50)',
        'Planning Time: 0.020 ms',
        'Execution Time: 0.008 ms',
      ]);

      const result = await explainAnalyze(pool, 'SELECT id FROM topics WHERE status = $1', [
        'ACTIVE',
      ]);

      expect(result.usedIndexScan).toBe(true);
      expect(result.indexesUsed).toContain('idx_topics_covering');
    });

    it('should detect multiple indexes', async () => {
      const pool = createMockPool([
        'Nested Loop  (cost=0.00..20.00 rows=10 width=100)',
        '  ->  Index Scan using idx_users_id on users  (cost=0.00..8.27 rows=1 width=50)',
        '  ->  Index Scan using idx_topics_author on topics  (cost=0.00..8.27 rows=10 width=50)',
        'Planning Time: 0.100 ms',
        'Execution Time: 0.050 ms',
      ]);

      const result = await explainAnalyze(
        pool,
        'SELECT * FROM users u JOIN topics t ON u.id = t.author_id',
      );

      expect(result.indexesUsed).toContain('idx_users_id');
      expect(result.indexesUsed).toContain('idx_topics_author');
      expect(result.indexesUsed).toHaveLength(2);
    });

    it('should parse row estimates', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100) (actual time=0.010..0.050 rows=95 loops=1)',
        'Planning Time: 0.045 ms',
        'Execution Time: 0.123 ms',
      ]);

      const result = await explainAnalyze(pool, 'SELECT * FROM users');

      expect(result.rowEstimates).toHaveLength(1);
      expect(result.rowEstimates.at(0)?.estimated).toBe(100);
      expect(result.rowEstimates.at(0)?.actual).toBe(95);
      expect(result.rowEstimates.at(0)?.accuracy).toBe(0.95);
    });

    it('should pass query parameters', async () => {
      const pool = createMockPool(['Planning Time: 0.010 ms', 'Execution Time: 0.010 ms']);

      await explainAnalyze(pool, 'SELECT * FROM users WHERE id = $1', ['user-123']);

      expect(pool.query).toHaveBeenCalledWith(
        'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM users WHERE id = $1',
        ['user-123'],
      );
    });

    it('should include raw output', async () => {
      const lines = [
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 0.123 ms',
      ];
      const pool = createMockPool(lines);

      const result = await explainAnalyze(pool, 'SELECT * FROM users');

      expect(result.rawOutput).toEqual(lines);
    });
  });

  describe('validateQueryTiming', () => {
    it('should pass when all thresholds are met', async () => {
      const pool = createMockPool([
        'Index Scan using idx_users_email on users  (cost=0.00..8.27 rows=1 width=100)',
        'Planning Time: 0.030 ms',
        'Execution Time: 0.010 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        maxExecutionTime: 1,
        requireIndexScan: true,
      });

      expect(result.passed).toBe(true);
      expect(result.results.every((r) => r.passed)).toBe(true);
    });

    it('should fail when execution time exceeded', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 50.000 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        maxExecutionTime: 10,
      });

      expect(result.passed).toBe(false);
      expect(result.results.find((r) => r.name === 'maxExecutionTime')?.passed).toBe(false);
    });

    it('should fail when index scan required but seq scan used', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 0.123 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        requireIndexScan: true,
      });

      expect(result.passed).toBe(false);
      expect(result.results.find((r) => r.name === 'requireIndexScan')?.passed).toBe(false);
    });

    it('should fail when specific index required but not used', async () => {
      const pool = createMockPool([
        'Index Scan using idx_users_id on users  (cost=0.00..8.27 rows=1 width=100)',
        'Planning Time: 0.030 ms',
        'Execution Time: 0.010 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        requireIndex: 'idx_users_email',
      });

      expect(result.passed).toBe(false);
      expect(result.results.find((r) => r.name === 'requireIndex')?.passed).toBe(false);
    });

    it('should pass when specific index is used', async () => {
      const pool = createMockPool([
        'Index Scan using idx_users_email on users  (cost=0.00..8.27 rows=1 width=100)',
        'Planning Time: 0.030 ms',
        'Execution Time: 0.010 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        requireIndex: 'idx_users_email',
      });

      expect(result.passed).toBe(true);
    });

    it('should check total time threshold', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 5.000 ms',
        'Execution Time: 10.000 ms',
      ]);

      const result = await validateQueryTiming(pool, 'SELECT * FROM users', [], {
        maxTotalTime: 10, // Total is 15ms
      });

      expect(result.passed).toBe(false);
      expect(result.results.find((r) => r.name === 'maxTotalTime')?.passed).toBe(false);
    });
  });

  describe('assertQueryTiming', () => {
    it('should not throw when thresholds are met', async () => {
      const pool = createMockPool([
        'Index Scan using idx_users_email on users  (cost=0.00..8.27 rows=1 width=100)',
        'Planning Time: 0.030 ms',
        'Execution Time: 0.010 ms',
      ]);

      await expect(
        assertQueryTiming(pool, 'SELECT * FROM users', [], { maxExecutionTime: 1 }),
      ).resolves.not.toThrow();
    });

    it('should throw when thresholds are exceeded', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 50.000 ms',
      ]);

      await expect(
        assertQueryTiming(pool, 'SELECT * FROM users', [], { maxExecutionTime: 10 }),
      ).rejects.toThrow(/Query timing thresholds exceeded/);
    });

    it('should include query in error message', async () => {
      const pool = createMockPool([
        'Seq Scan on users  (cost=0.00..10.00 rows=100 width=100)',
        'Planning Time: 0.045 ms',
        'Execution Time: 50.000 ms',
      ]);

      await expect(
        assertQueryTiming(pool, 'SELECT * FROM users WHERE active = true', [], {
          maxExecutionTime: 10,
        }),
      ).rejects.toThrow(/SELECT \* FROM users WHERE active = true/);
    });
  });

  describe('measureQueryTime', () => {
    it('should measure query execution time', async () => {
      const pool = {
        query: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { rows: [] };
        }),
      } as unknown as Pool;

      const duration = await measureQueryTime(pool, 'SELECT 1');

      expect(duration).toBeGreaterThanOrEqual(9);
      expect(pool.query).toHaveBeenCalledWith('SELECT 1', []);
    });

    it('should pass parameters to query', async () => {
      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      } as unknown as Pool;

      await measureQueryTime(pool, 'SELECT * FROM users WHERE id = $1', ['user-123']);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['user-123']);
    });
  });

  describe('collectQueryTimings', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should collect specified number of samples', async () => {
      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      } as unknown as Pool;

      vi.useRealTimers(); // Need real timers for timing measurement
      const timings = await collectQueryTimings(pool, 'SELECT 1', [], 5);

      expect(timings).toHaveLength(5);
      expect(pool.query).toHaveBeenCalledTimes(5);
    });

    it('should exclude warmup iterations', async () => {
      const pool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      } as unknown as Pool;

      vi.useRealTimers();
      const timings = await collectQueryTimings(pool, 'SELECT 1', [], 5, { warmup: 3 });

      expect(timings).toHaveLength(5);
      expect(pool.query).toHaveBeenCalledTimes(8); // 3 warmup + 5 measured
    });
  });

  describe('formatExplainSummary', () => {
    it('should format summary with indexes', () => {
      const result = {
        rawOutput: [],
        executionTime: 0.123,
        planningTime: 0.045,
        totalTime: 0.168,
        usedIndexScan: true,
        usedSequentialScan: false,
        indexesUsed: ['idx_users_email'],
        rowEstimates: [],
      };

      const summary = formatExplainSummary(result);

      expect(summary).toContain('exec=0.12ms');
      // Note: 0.045.toFixed(2) = "0.04" due to floating-point representation
      expect(summary).toContain('plan=0.04ms');
      expect(summary).toContain('total=0.17ms');
      expect(summary).toContain('indexes: idx_users_email');
    });

    it('should show warning for seq scan', () => {
      const result = {
        rawOutput: [],
        executionTime: 50.0,
        planningTime: 0.1,
        totalTime: 50.1,
        usedIndexScan: false,
        usedSequentialScan: true,
        indexesUsed: [],
        rowEstimates: [],
      };

      const summary = formatExplainSummary(result);

      expect(summary).toContain('WARN: seq scan');
    });

    it('should format multiple indexes', () => {
      const result = {
        rawOutput: [],
        executionTime: 0.05,
        planningTime: 0.02,
        totalTime: 0.07,
        usedIndexScan: true,
        usedSequentialScan: false,
        indexesUsed: ['idx_a', 'idx_b'],
        rowEstimates: [],
      };

      const summary = formatExplainSummary(result);

      expect(summary).toContain('indexes: idx_a, idx_b');
    });
  });
});
