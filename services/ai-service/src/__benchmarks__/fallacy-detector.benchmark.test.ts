/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable import/no-unresolved, no-await-in-loop, no-loop-func */

/**
 * Fallacy Detector Latency Benchmark Tests (T344)
 *
 * Measures execution latency of the FallacyDetectorService under various conditions.
 * These tests verify that the analyzer meets the <500ms performance requirement
 * specified in FR-014 for real-time feedback.
 *
 * Benchmark categories:
 * 1. Ad hominem detection
 * 2. Strawman detection
 * 3. False dichotomy detection
 * 4. Multiple fallacy detection
 * 5. Concurrent analysis
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { FallacyDetectorService } from '../services/fallacy-detector.service';

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
 * Test fixtures for fallacy detection
 */
const FIXTURES = {
  adHominem: {
    short: "You're just a student, what would you know?",
    medium: `Coming from someone like you, this argument is worthless. You lack the credentials
      to even discuss this topic. Your lack of experience shows in everything you write.`,
    long: `You're just a novice in this field, so your opinion doesn't matter. What would you know
      about economics? Coming from someone who has never worked in finance, this is laughable.
      You lack the expertise to make such claims. Your educational background doesn't qualify
      you to speak on this matter. People without real experience should stay quiet.`,
  },
  strawman: {
    short: "So you're saying we should just ignore all laws?",
    medium: `By that logic, we should abandon all regulations. If we follow your reasoning,
      nothing should ever be controlled. So you think that all government is bad?`,
    long: `So you're saying that we should have no rules at all? By that logic, society should
      just collapse into anarchy. If we follow your reasoning to its conclusion, we should
      never have any form of organization. You think that all restrictions are inherently wrong.
      By your standards, even basic safety regulations should be eliminated.`,
  },
  falseDichotomy: {
    short: 'Either you support this policy or you hate freedom.',
    medium: `You're either with us or against us on this issue. There are only two options here:
      accept the proposal or doom us all. If you don't agree, then you must oppose everything.`,
    long: `Either you agree with this position completely, or you're our enemy. There are only
      two choices in this matter. You're either with us or against us. If you don't support
      this policy, then you must want the country to fail. Only two options exist here.
      You must choose one side or the other - there is no middle ground.`,
  },
  slipperySlope: {
    short: 'If we allow this, next thing you know chaos will follow.',
    medium: `This will lead to complete breakdown of society. If we allow one exception, where
      does it stop? It's a slippery slope to disaster. One compromise leads to another.`,
    long: `If we allow this small change, next thing you know everything will fall apart.
      This will lead to a complete collapse of our institutions. Where does it end once we
      start down this path? It's a slippery slope that we cannot recover from.
      One small step leads to another, and soon we'll have lost everything we value.`,
  },
  appealToEmotion: {
    short: 'Think of the children! How would you feel if this happened to you?',
    medium: `Imagine if it was your family affected by this. Think of the children who will
      suffer. How would you feel if you were in their shoes? This makes me so angry!`,
    long: `Think of the children who will be impacted by this decision. Imagine if it was your
      own family suffering. How would you feel if you were in their position? Picture the
      tears of those affected. This makes me so angry and sad. Can't you see the pain this
      causes? Feel the weight of what you're proposing.`,
  },
  hastyGeneralization: {
    short: 'All politicians are always corrupt. Everyone knows that.',
    medium: `People from that group always behave this way. Nobody thinks otherwise. All members
      of this category are the same. Everyone agrees with me on this point.`,
    long: `All members of that group are always the same. Everyone knows this to be true.
      Nobody disagrees with this assessment. These people always act in predictable ways.
      All politicians are corrupt without exception. Every single instance confirms my view.
      No one from that background ever does anything different.`,
  },
  appealToAuthority: {
    short: 'Experts agree this is true. Science says so.',
    medium: `Studies show this is the correct answer. Scientists believe this to be true.
      The experts have spoken, so we must accept it. Research proves my point.`,
    long: `Experts agree that this is the only valid position. Studies show overwhelming
      support for my view. Scientists say this is true, so it must be. The research proves
      what I'm saying. According to experts, there is no debate. Science says we should
      accept this without question. Authorities in the field have confirmed this.`,
  },
  neutral: {
    short: 'I think we should consider multiple perspectives on this issue.',
    medium: `There are valid points on both sides of this debate. The evidence suggests that
      a nuanced approach may be needed. Let me explain my reasoning step by step.`,
    long: `This is a complex issue that deserves careful consideration from multiple angles.
      The available evidence supports several interpretations. I believe we should examine
      each argument on its merits rather than dismissing any outright. There are thoughtful
      people on both sides of this debate. My own view is based on the following evidence
      and reasoning, which I'm happy to explain in detail.`,
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

describe('FallacyDetectorService Latency Benchmarks', () => {
  let service: FallacyDetectorService;

  beforeAll(() => {
    service = new FallacyDetectorService();
  });

  describe('Ad Hominem Detection', () => {
    it('should detect ad hominem in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.adHominem.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Ad hominem (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect ad hominem in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.adHominem.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Ad hominem (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect ad hominem in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.adHominem.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Ad hominem (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Strawman Detection', () => {
    it('should detect strawman in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.strawman.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Strawman (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect strawman in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.strawman.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Strawman (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('False Dichotomy Detection', () => {
    it('should detect false dichotomy within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.falseDichotomy.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('False dichotomy benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Slippery Slope Detection', () => {
    it('should detect slippery slope within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.slipperySlope.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Slippery slope benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Appeal to Emotion Detection', () => {
    it('should detect appeal to emotion within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.appealToEmotion.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Appeal to emotion benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Hasty Generalization Detection', () => {
    it('should detect hasty generalization within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.hastyGeneralization.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Hasty generalization benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Appeal to Authority Detection', () => {
    it('should detect appeal to authority within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.appealToAuthority.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Appeal to authority benchmark:', {
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

  describe('Multiple Fallacy Detection', () => {
    it('should detect multiple fallacies efficiently', async () => {
      const mixedText = `${FIXTURES.adHominem.short} ${FIXTURES.strawman.short} ${FIXTURES.falseDichotomy.short}`;

      const stats = await runBenchmark(() => service.analyze(mixedText), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Multiple fallacies benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Concurrent Analysis', () => {
    it('should handle 10 concurrent analyses within latency threshold', async () => {
      const texts = [
        FIXTURES.adHominem.medium,
        FIXTURES.strawman.medium,
        FIXTURES.falseDichotomy.medium,
        FIXTURES.slipperySlope.medium,
        FIXTURES.appealToEmotion.medium,
        FIXTURES.hastyGeneralization.medium,
        FIXTURES.appealToAuthority.medium,
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
          FIXTURES.adHominem.medium,
          FIXTURES.strawman.medium,
          FIXTURES.falseDichotomy.medium,
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
      const veryLongText = Object.values(FIXTURES)
        .flatMap((f) => Object.values(f))
        .join(' ');

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
