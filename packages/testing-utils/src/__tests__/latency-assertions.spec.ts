/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeLatency,
  validateLatency,
  assertLatency,
  measureDuration,
  collectLatencies,
  createLatencyCollector,
  formatLatencyStats,
} from '../perf/latency-assertions.js';

describe('latency-assertions', () => {
  describe('analyzeLatency', () => {
    it('should return zero stats for empty array', () => {
      const stats = analyzeLatency([]);

      expect(stats.count).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.p95).toBe(0);
      expect(stats.p99).toBe(0);
    });

    it('should calculate correct stats for single value', () => {
      const stats = analyzeLatency([42]);

      expect(stats.count).toBe(1);
      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.mean).toBe(42);
      expect(stats.median).toBe(42);
      expect(stats.p95).toBe(42);
      expect(stats.p99).toBe(42);
      expect(stats.stdDev).toBe(0);
    });

    it('should calculate correct stats for multiple values', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = analyzeLatency(latencies);

      expect(stats.count).toBe(10);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.mean).toBe(55);
      expect(stats.median).toBe(55); // Middle between 50 and 60
      expect(stats.p90).toBeCloseTo(91, 0);
      expect(stats.p95).toBeCloseTo(95.5, 0);
      expect(stats.p99).toBeCloseTo(99.1, 0);
    });

    it('should handle unsorted input', () => {
      const latencies = [50, 10, 30, 90, 20, 80, 40, 70, 60, 100];
      const stats = analyzeLatency(latencies);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.mean).toBe(55);
    });

    it('should calculate standard deviation correctly', () => {
      const latencies = [2, 4, 4, 4, 5, 5, 7, 9];
      const stats = analyzeLatency(latencies);

      expect(stats.mean).toBe(5);
      // stdDev should be 2
      expect(stats.stdDev).toBeCloseTo(2, 1);
    });
  });

  describe('validateLatency', () => {
    const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    it('should pass when all thresholds are met', () => {
      const result = validateLatency(latencies, {
        p95Max: 200,
        p99Max: 300,
        meanMax: 100,
      });

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.passed)).toBe(true);
    });

    it('should fail when p95 threshold exceeded', () => {
      const result = validateLatency(latencies, {
        p95Max: 50, // Will fail
      });

      expect(result.passed).toBe(false);
      expect(result.results.at(0)?.passed).toBe(false);
      expect(result.results.at(0)?.name).toBe('p95');
    });

    it('should fail when mean threshold exceeded', () => {
      const result = validateLatency(latencies, {
        meanMax: 40, // Will fail (mean is 55)
      });

      expect(result.passed).toBe(false);
      expect(result.results.at(0)?.name).toBe('mean');
      expect(result.results.at(0)?.actual).toBe(55);
    });

    it('should check max threshold', () => {
      const result = validateLatency(latencies, {
        maxMax: 80, // Will fail (max is 100)
      });

      expect(result.passed).toBe(false);
      expect(result.results.at(0)?.name).toBe('max');
      expect(result.results.at(0)?.actual).toBe(100);
    });

    it('should include stats in result', () => {
      const result = validateLatency(latencies, {});

      expect(result.stats.count).toBe(10);
      expect(result.stats.min).toBe(10);
      expect(result.stats.max).toBe(100);
    });
  });

  describe('assertLatency', () => {
    it('should not throw when thresholds are met', () => {
      const latencies = [10, 20, 30, 40, 50];

      expect(() => assertLatency(latencies, { p95Max: 100 })).not.toThrow();
    });

    it('should throw when thresholds are exceeded', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      expect(() => assertLatency(latencies, { p95Max: 50 })).toThrow(
        /Latency thresholds exceeded.*p95/,
      );
    });

    it('should include all failures in error message', () => {
      const latencies = [100, 200, 300, 400, 500];

      expect(() =>
        assertLatency(latencies, {
          p95Max: 100,
          meanMax: 100,
        }),
      ).toThrow(/p95.*mean/);
    });
  });

  describe('measureDuration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should measure sync function duration', async () => {
      // Can't reliably test timing with fake timers for sync functions
      vi.useRealTimers();

      const duration = await measureDuration(() => {
        // Simulate work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should measure async function duration', async () => {
      vi.useRealTimers();

      const duration = await measureDuration(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(duration).toBeGreaterThanOrEqual(9);
    });
  });

  describe('collectLatencies', () => {
    it('should collect specified number of samples', async () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
        return callCount;
      };

      const latencies = await collectLatencies(fn, 10);

      expect(latencies).toHaveLength(10);
      expect(callCount).toBe(10);
    });

    it('should exclude warmup iterations', async () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
        return callCount;
      };

      const latencies = await collectLatencies(fn, 5, { warmup: 3 });

      expect(latencies).toHaveLength(5);
      expect(callCount).toBe(8); // 3 warmup + 5 measured
    });
  });

  describe('createLatencyCollector', () => {
    it('should record and return latencies', () => {
      const collector = createLatencyCollector();

      collector.record(10);
      collector.record(20);
      collector.record(30);

      expect(collector.getLatencies()).toEqual([10, 20, 30]);
    });

    it('should calculate stats', () => {
      const collector = createLatencyCollector();

      collector.record(10);
      collector.record(20);
      collector.record(30);

      const stats = collector.getStats();

      expect(stats.count).toBe(3);
      expect(stats.mean).toBe(20);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
    });

    it('should clear recorded latencies', () => {
      const collector = createLatencyCollector();

      collector.record(10);
      collector.record(20);
      collector.clear();

      expect(collector.getLatencies()).toEqual([]);
      expect(collector.getStats().count).toBe(0);
    });

    it('should return copy of latencies array', () => {
      const collector = createLatencyCollector();

      collector.record(10);
      const latencies = collector.getLatencies();
      latencies.push(999);

      expect(collector.getLatencies()).toEqual([10]);
    });
  });

  describe('formatLatencyStats', () => {
    it('should format stats as human-readable string', () => {
      const stats = analyzeLatency([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
      const formatted = formatLatencyStats(stats);

      expect(formatted).toContain('n=10');
      expect(formatted).toContain('min=10.0ms');
      expect(formatted).toContain('max=100.0ms');
      expect(formatted).toContain('p50=');
      expect(formatted).toContain('p95=');
      expect(formatted).toContain('p99=');
    });

    it('should handle empty stats', () => {
      const stats = analyzeLatency([]);
      const formatted = formatLatencyStats(stats);

      expect(formatted).toContain('n=0');
      expect(formatted).toContain('min=0.0ms');
    });
  });
});
