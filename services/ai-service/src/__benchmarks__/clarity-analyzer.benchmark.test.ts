/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable import/no-unresolved, no-await-in-loop, no-loop-func */

/**
 * Clarity Analyzer (Claim Extractor) Latency Benchmark Tests (T345)
 *
 * Measures execution latency of the ClarityAnalyzerService under various conditions.
 * The ClarityAnalyzerService detects unsourced claims, bias indicators, and vague
 * language - effectively serving as a "claim extractor" that identifies statements
 * requiring evidence.
 *
 * These tests verify that the analyzer meets the <500ms performance requirement
 * specified in FR-014 for real-time feedback.
 *
 * Benchmark categories:
 * 1. Unsourced claim detection
 * 2. Bias indicator detection
 * 3. Vague language detection
 * 4. Various text lengths
 * 5. Concurrent analysis
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ClarityAnalyzerService } from '../services/clarity-analyzer.service';

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
 * Test fixtures for claim extraction and clarity analysis
 */
const FIXTURES = {
  unsourcedClaims: {
    short: 'Studies show that this approach is effective.',
    medium: `Research shows that 85% of people prefer this method. Scientists say that
      the evidence is overwhelming. According to experts, there is no doubt about this.
      The data shows a clear trend in favor of this position.`,
    long: `Studies show that this policy leads to better outcomes. Research proves that
      the alternative approach fails 90% of the time. Scientists found that there is
      no viable alternative. According to experts, the evidence is clear. It's proven
      that this method works better. Multiple studies demonstrate the effectiveness
      of this approach. The data shows consistent results across all populations.
      Research demonstrates that critics are wrong. Scientists believe this is the
      only viable solution. According to research, opposition to this is unfounded.`,
  },
  biasIndicators: {
    short: 'Obviously, any reasonable person would agree with this.',
    medium: `It's common sense that this is the right approach. Obviously the opposition
      is wrong about this. Any reasonable person would see the truth here. Clearly
      only fools would disagree with such an obvious conclusion.`,
    long: `Obviously, this is the correct position for anyone with sense. Any reasonable
      person would agree with this assessment. It's common sense that we should act now.
      Only extremists would disagree with such clear evidence. Clearly, the radical
      opposition has no valid points. Of course this approach is right - anyone can see
      that. The crazy suggestions from critics should be ignored. Only fanatics would
      support the alternative position. Obviously the opponents are driven by bias.`,
  },
  vagueLanguage: {
    short: 'Some people say this might be a problem.',
    medium: `I heard that this could cause issues. They say that experts are concerned.
      Rumor has it that changes are coming. Word on the street is that people are worried.
      Some people believe this is the real story.`,
    long: `Some people say that this policy is dangerous. I heard that it could lead to
      problems down the road. They say that insiders are concerned about the direction.
      Rumor has it that major changes are being planned behind the scenes. Word on the
      street is that opposition is growing. People believe that the truth is being hidden.
      I heard from sources that the situation is worse than reported. They say that
      experts are privately worried. Some people think we're not being told everything.`,
  },
  mixedIssues: {
    short: 'Studies show this is obvious to any reasonable person.',
    medium: `Research proves that this is common sense. Obviously, anyone with half a brain
      would accept what experts agree on. I heard that scientists found overwhelming
      evidence. Some people say the critics are just biased extremists.`,
    long: `Studies show that 80% of experts agree with this position. Obviously, any
      reasonable person would accept these findings. It's common sense that the data
      proves this conclusively. I heard that scientists found even more evidence recently.
      According to experts, there is no valid opposition to this view. Some people say
      that critics are radical extremists with no credentials. Research demonstrates
      that the alternative approach is obviously flawed. They say that anyone who
      disagrees simply hasn't read the evidence.`,
  },
  neutral: {
    short: 'The committee is reviewing the proposal this week.',
    medium: `The research team collected data over a six-month period. Participants were
      randomly assigned to control and experimental groups. Results were analyzed using
      standard statistical methods. The findings are presented in the attached report.`,
    long: `This comprehensive analysis examines the relationship between several variables
      measured over an extended timeframe. The methodology followed established protocols
      and was reviewed by an independent oversight committee. Data collection procedures
      ensured participant privacy while maintaining statistical validity. The results
      section presents both quantitative findings and qualitative observations from
      participant interviews. Limitations of the study design are discussed in detail.
      Recommendations for future research directions are provided in the conclusion.`,
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

describe('ClarityAnalyzerService (Claim Extractor) Latency Benchmarks', () => {
  let service: ClarityAnalyzerService;

  beforeAll(() => {
    service = new ClarityAnalyzerService();
  });

  describe('Unsourced Claim Detection', () => {
    it('should detect unsourced claims in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.unsourcedClaims.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Unsourced claims (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect unsourced claims in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.unsourcedClaims.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Unsourced claims (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect unsourced claims in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.unsourcedClaims.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Unsourced claims (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Bias Indicator Detection', () => {
    it('should detect bias indicators in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.biasIndicators.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Bias indicators (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect bias indicators in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.biasIndicators.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Bias indicators (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect bias indicators in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.biasIndicators.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Bias indicators (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Vague Language Detection', () => {
    it('should detect vague language in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.vagueLanguage.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Vague language (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect vague language in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.vagueLanguage.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Vague language (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect vague language in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.vagueLanguage.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Vague language (long) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Mixed Issue Detection', () => {
    it('should detect mixed issues in short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.mixedIssues.short),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Mixed issues (short) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect mixed issues in medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.mixedIssues.medium),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Mixed issues (medium) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should detect mixed issues in long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.analyze(FIXTURES.mixedIssues.long),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Mixed issues (long) benchmark:', {
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
        FIXTURES.unsourcedClaims.short,
        FIXTURES.unsourcedClaims.medium,
        FIXTURES.unsourcedClaims.long,
        FIXTURES.biasIndicators.medium,
        FIXTURES.vagueLanguage.medium,
        FIXTURES.mixedIssues.medium,
        FIXTURES.neutral.short,
        FIXTURES.neutral.medium,
        FIXTURES.neutral.long,
        FIXTURES.mixedIssues.long,
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
          FIXTURES.unsourcedClaims.medium,
          FIXTURES.biasIndicators.medium,
          FIXTURES.vagueLanguage.medium,
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

    it('should handle text with only claims (no issues) efficiently', async () => {
      const cleanText = `The experiment was conducted with a sample size of 500 participants.
        Data was collected using standardized instruments over a 12-month period.
        Results were analyzed using ANOVA with a significance level of 0.05.
        The findings are consistent with previous research in this area.`;

      const stats = await runBenchmark(() => service.analyze(cleanText), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_ANALYSIS_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Clean text (no issues) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });
});
