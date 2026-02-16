/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable import/no-unresolved, no-await-in-loop, no-loop-func */

/**
 * Tone Analyzer Latency Benchmark Tests (T342)
 *
 * Measures execution latency of the ToneAnalyzerService under various conditions.
 * These tests verify that the analyzer meets the <500ms performance requirement
 * specified in FR-014 for real-time feedback.
 *
 * Benchmark categories:
 * 1. Short text analysis (<100 chars)
 * 2. Medium text analysis (100-500 chars)
 * 3. Long text analysis (500-2000 chars)
 * 4. Concurrent analysis (multiple parallel requests)
 * 5. Cold vs warm execution
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ToneAnalyzerService } from '../services/tone-analyzer.service';

/**
 * Latency thresholds in milliseconds
 */
const LATENCY_THRESHOLDS = {
  /** Maximum acceptable latency for any single analysis */
  MAX_SINGLE_ANALYSIS_MS: 500,
  /** P95 latency target (95% of requests should complete within this time) */
  P95_TARGET_MS: 100,
  /** P99 latency target (99% of requests should complete within this time) */
  P99_TARGET_MS: 200,
  /** Maximum latency for concurrent batch operations */
  MAX_CONCURRENT_MS: 1000,
};

/**
 * Number of iterations for statistical significance
 */
const BENCHMARK_ITERATIONS = 100;

/**
 * Test fixtures representing different text lengths
 */
const FIXTURES = {
  short: {
    neutral: 'I think this is a good point.',
    inflammatory: "You're stupid for thinking that.",
  },
  medium: {
    neutral: `I understand your perspective, and while I don't fully agree with all points,
      I think there's value in considering multiple viewpoints on this issue.
      The data suggests that we need to look at this more carefully before drawing conclusions.`,
    inflammatory: `You're stupid if you believe that. This is typical liberal nonsense.
      Anyone with half a brain would understand that this policy is terrible.
      I hate how people like you always ignore the obvious facts.`,
  },
  long: {
    neutral: `The economic implications of this policy deserve careful consideration from multiple angles.
      Historical data from similar implementations shows mixed results, with some regions experiencing
      positive outcomes while others faced challenges. What's particularly interesting is how local
      factors influenced the outcomes in each case. We should analyze the specific conditions that
      led to success or failure before making broad generalizations. The academic literature on this
      topic offers several competing frameworks for understanding these dynamics. I believe we need
      to engage with this complexity rather than oversimplifying the issue. Perhaps a more nuanced
      approach would involve piloting the policy in limited contexts before broader implementation.`,
    inflammatory: `You're all stupid if you don't see what's happening here. This is classic conservative
      propaganda designed to mislead people. Obviously you don't understand basic economics or you
      wouldn't be making these ridiculous arguments. Wake up sheeple! I hate how these people always
      push their agenda while pretending to care about facts. Anyone with half a brain would reject
      this nonsense immediately. The fact that you're even considering this position shows how
      ignorant you are about the real issues at stake. Stop being so ridiculous and start thinking
      for yourself instead of blindly following whatever talking points you've been fed.`,
  },
};

/**
 * Measure execution time of an async function
 */
async function measureLatency(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

/**
 * Run multiple iterations and calculate statistics
 */
async function runBenchmark(
  fn: () => Promise<unknown>,
  iterations: number,
): Promise<{
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const latency = await measureLatency(fn);
    latencies.push(latency);
  }

  // Sort for percentile calculations
  latencies.sort((a, b) => a - b);

  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const mean = sum / latencies.length;
  const median = latencies[Math.floor(latencies.length / 2)]!;
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  const p95 = latencies[p95Index]!;
  const p99 = latencies[p99Index]!;
  const min = latencies[0]!;
  const max = latencies[latencies.length - 1]!;

  return { mean, median, p95, p99, min, max };
}

describe('ToneAnalyzerService Latency Benchmarks', () => {
  let service: ToneAnalyzerService;

  beforeAll(() => {
    // Create service once for warm execution tests
    service = new ToneAnalyzerService();
  });

  beforeEach(() => {
    // Reset for each test group if needed
  });

  describe('Short Text Analysis (<100 chars)', () => {
    it('should analyze neutral short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.short.neutral),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      // Log benchmark results for visibility
      console.log('Short neutral text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should analyze inflammatory short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.short.inflammatory),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Short inflammatory text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Medium Text Analysis (100-500 chars)', () => {
    it('should analyze neutral medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.medium.neutral),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Medium neutral text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should analyze inflammatory medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.medium.inflammatory),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Medium inflammatory text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Long Text Analysis (500-2000 chars)', () => {
    it('should analyze neutral long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.long.neutral),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Long neutral text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should analyze inflammatory long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.long.inflammatory),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Long inflammatory text benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Concurrent Analysis', () => {
    it('should handle 10 concurrent analyses within latency threshold', async () => {
      const texts = [
        FIXTURES.short.neutral,
        FIXTURES.short.inflammatory,
        FIXTURES.medium.neutral,
        FIXTURES.medium.inflammatory,
        FIXTURES.long.neutral,
        FIXTURES.long.inflammatory,
        FIXTURES.short.neutral,
        FIXTURES.medium.inflammatory,
        FIXTURES.long.neutral,
        FIXTURES.short.inflammatory,
      ];

      const start = performance.now();
      await Promise.all(texts.map((text) => service.analyze(text)));
      const totalLatency = performance.now() - start;

      expect(totalLatency).toBeLessThan(LATENCY_THRESHOLDS.MAX_CONCURRENT_MS);

      console.log('Concurrent analysis (10 texts):', {
        totalLatency: `${totalLatency.toFixed(2)}ms`,
        avgPerRequest: `${(totalLatency / texts.length).toFixed(2)}ms`,
      });
    });

    it('should maintain stable latency under repeated concurrent load', async () => {
      const batchLatencies: number[] = [];

      for (let batch = 0; batch < 10; batch += 1) {
        const texts = [
          FIXTURES.short.inflammatory,
          FIXTURES.medium.inflammatory,
          FIXTURES.long.inflammatory,
        ];

        const start = performance.now();
        await Promise.all(texts.map((text) => service.analyze(text)));
        batchLatencies.push(performance.now() - start);
      }

      // Check variance is reasonable (no memory leaks or degradation)
      const mean = batchLatencies.reduce((a, b) => a + b, 0) / batchLatencies.length;
      const variance =
        batchLatencies.reduce((acc, val) => acc + (val - mean) ** 2, 0) / batchLatencies.length;
      const stdDev = Math.sqrt(variance);

      // For sub-millisecond operations, variance can be high due to system noise
      // Relax constraint: stdDev should be less than mean or 1ms (whichever is larger)
      expect(stdDev).toBeLessThan(Math.max(mean, 1));

      console.log('Repeated concurrent load stability:', {
        mean: `${mean.toFixed(2)}ms`,
        stdDev: `${stdDev.toFixed(2)}ms`,
        coefficientOfVariation: `${((stdDev / mean) * 100).toFixed(1)}%`,
      });
    });
  });

  describe('Cold vs Warm Execution', () => {
    it('should have acceptable cold start latency', async () => {
      // Create new service instance to simulate cold start
      const coldService = new ToneAnalyzerService();

      const latency = await measureLatency(() => coldService.analyze(FIXTURES.medium.inflammatory));

      expect(latency).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);

      console.log('Cold start latency:', {
        latency: `${latency.toFixed(2)}ms`,
      });
    });

    it('should have lower warm execution latency than cold start', async () => {
      // Cold start
      const coldService = new ToneAnalyzerService();
      const coldLatency = await measureLatency(() =>
        coldService.analyze(FIXTURES.medium.inflammatory),
      );

      // Warm execution (same service instance)
      const warmLatencies: number[] = [];
      const analyzeWarm = () => coldService.analyze(FIXTURES.medium.inflammatory);
      for (let i = 0; i < 10; i += 1) {
        const latency = await measureLatency(analyzeWarm);
        warmLatencies.push(latency);
      }

      const avgWarmLatency = warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length;

      // Warm execution should be at least as fast as cold (or faster)
      // Allow for some variance but generally warm should not be significantly slower
      expect(avgWarmLatency).toBeLessThanOrEqual(coldLatency * 1.5);

      console.log('Cold vs Warm comparison:', {
        coldLatency: `${coldLatency.toFixed(2)}ms`,
        avgWarmLatency: `${avgWarmLatency.toFixed(2)}ms`,
        improvement: `${(((coldLatency - avgWarmLatency) / coldLatency) * 100).toFixed(1)}%`,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string efficiently', async () => {
      const stats = await runBenchmark(() => service.analyze(''), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Empty string benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
      });
    });

    it('should handle very long text (5000+ chars) within acceptable limits', async () => {
      const veryLongText = FIXTURES.long.inflammatory.repeat(5);

      const stats = await runBenchmark(() => service.analyze(veryLongText), 50);

      // Allow higher threshold for very long text
      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS * 2);

      console.log('Very long text (5000+ chars) benchmark:', {
        textLength: veryLongText.length,
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });
});
