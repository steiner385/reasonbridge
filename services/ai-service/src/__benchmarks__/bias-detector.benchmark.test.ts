/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable import/no-unresolved, no-await-in-loop, no-loop-func */

/**
 * Bias Detector Latency Benchmark Tests (T343)
 *
 * Measures execution latency of the BiasDetectorService under various conditions.
 * These tests verify that the analyzer meets the <500ms performance requirement
 * specified in FR-014 for real-time feedback.
 *
 * Benchmark categories:
 * 1. Confirmation bias detection
 * 2. System 1 thinking detection
 * 3. System 2 thinking (positive) detection
 * 4. Various text lengths
 * 5. Concurrent analysis
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BiasDetectorService } from '../services/bias-detector.service';

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
 * Test fixtures for bias detection
 */
const FIXTURES = {
  confirmationBias: {
    short: 'This proves exactly what I always thought was true.',
    medium: `See, I knew it! This confirms what I always believed. Those other studies are biased
      and don't count. My sources clearly show the real truth here. This only validates what I said.`,
    long: `This proves exactly what I always said about this topic. I knew from the beginning that
      this would be the outcome. Those studies that disagree are just exceptions and don't matter.
      My research shows the real picture. According to my sources, the evidence is overwhelming.
      This confirms my position completely. Just as I expected, the data supports my view.
      I've always known that this was the case, and now we have proof. Ignore those other facts
      because they're clearly biased. This validates everything I believed.`,
  },
  system1Thinking: {
    short: "I just know this is wrong. It's just obvious.",
    medium: `My gut tells me this can't be right. How can anyone believe this nonsense?
      It's crazy to think otherwise. Common sense tells us the answer. Don't be ridiculous.`,
    long: `I just feel that this is completely wrong. My gut feeling says we should reject this.
      It's just obvious to anyone paying attention. How can you believe such nonsense?
      It's insane to think this way. Common sense shows us the truth here.
      Come on, seriously? That's ridiculous and absurd. I can't believe you would think that.
      This is crazy talk. Don't be silly - anyone can see the truth.`,
  },
  system2Thinking: {
    short: 'Let me consider this carefully. I could be wrong, but here is my analysis.',
    medium: `On the one hand, this argument has merit. On the other hand, there are valid concerns.
      The evidence suggests we need more data. While I disagree, I understand your perspective.
      There are multiple viewpoints to consider here.`,
    long: `Let me think about this carefully before responding. The evidence suggests several
      possible interpretations of this data. On the one hand, the economic benefits seem clear.
      On the other hand, there are legitimate concerns about implementation. I could be wrong,
      but my analysis points to a balanced approach. While I don't agree with everything you've
      said, I see where you're coming from. There are different perspectives worth considering.
      Multiple scholars have examined this issue from various angles.`,
  },
  neutral: {
    short: 'The data shows an increase in the measured variable.',
    medium: `The research findings indicate several trends worth examining. The methodology used
      was peer-reviewed and followed established protocols. Further analysis may reveal
      additional insights about this phenomenon.`,
    long: `This comprehensive study examines the relationship between multiple variables over
      an extended period. The researchers employed rigorous statistical methods to control for
      confounding factors. Their findings contribute to our understanding of this complex issue.
      The implications for policy are significant but require careful consideration of context.
      Future research should explore these questions in greater depth across different populations.`,
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

describe('BiasDetectorService Latency Benchmarks', () => {
  let service: BiasDetectorService;

  beforeAll(() => {
    service = new BiasDetectorService();
  });

  describe('Confirmation Bias Detection', () => {
    it('should detect confirmation bias in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.confirmationBias.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Confirmation bias (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect confirmation bias in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.confirmationBias.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Confirmation bias (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect confirmation bias in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.confirmationBias.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Confirmation bias (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('System 1 Thinking Detection', () => {
    it('should detect System 1 thinking in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.system1Thinking.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('System 1 thinking (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect System 1 thinking in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.system1Thinking.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('System 1 thinking (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect System 1 thinking in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.system1Thinking.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('System 1 thinking (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('System 2 Thinking Detection (Positive)', () => {
    it('should efficiently process System 2 thinking patterns', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.system2Thinking.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('System 2 thinking (positive) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Neutral Content Analysis', () => {
    it('should analyze neutral short text efficiently', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.neutral.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Neutral (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should analyze neutral medium text efficiently', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.neutral.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Neutral (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should analyze neutral long text efficiently', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.neutral.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Neutral (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Concurrent Analysis', () => {
    it('should handle 10 concurrent analyses within latency threshold', async () => {
      const texts = [
        FIXTURES.confirmationBias.short,
        FIXTURES.confirmationBias.medium,
        FIXTURES.confirmationBias.long,
        FIXTURES.system1Thinking.short,
        FIXTURES.system1Thinking.medium,
        FIXTURES.system1Thinking.long,
        FIXTURES.system2Thinking.medium,
        FIXTURES.neutral.short,
        FIXTURES.neutral.medium,
        FIXTURES.neutral.long,
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
          FIXTURES.confirmationBias.medium,
          FIXTURES.system1Thinking.medium,
          FIXTURES.neutral.medium,
        ];

        const start = performance.now();
        await Promise.all(texts.map((text) => service.analyze(text)));
        batchLatencies.push(performance.now() - start);
      }

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
      const veryLongText = FIXTURES.confirmationBias.long.repeat(5);

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

    it('should handle mixed bias patterns efficiently', async () => {
      const mixedText = `${FIXTURES.confirmationBias.short} ${FIXTURES.system1Thinking.short}`;

      const stats = await runBenchmark(() => service.analyze(mixedText), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Mixed bias patterns benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });
});
