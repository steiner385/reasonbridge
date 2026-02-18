/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable import/no-unresolved, no-await-in-loop, no-loop-func */

/**
 * Claim Extractor Latency Benchmark Tests (T345)
 *
 * Measures execution latency of the ClaimExtractorService under various conditions.
 * These tests verify that the extractor meets the <200ms performance requirement
 * specified in T345 for real-time claim extraction.
 *
 * Benchmark categories:
 * 1. Short text extraction (<100 chars)
 * 2. Medium text extraction (100-500 chars)
 * 3. Long text extraction (500-2000 chars)
 * 4. Multi-claim extraction
 * 5. Concurrent extraction
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ClaimExtractorService } from '../services/claim-extractor.service';

/**
 * Latency thresholds in milliseconds
 * T345 specifies <200ms for claim extraction
 */
const LATENCY_THRESHOLDS = {
  /** Maximum acceptable latency for any single extraction */
  MAX_SINGLE_EXTRACTION_MS: 200,
  /** P95 latency target (95% of requests should complete within this time) */
  P95_TARGET_MS: 50,
  /** P99 latency target (99% of requests should complete within this time) */
  P99_TARGET_MS: 100,
  /** Maximum latency for concurrent batch operations */
  MAX_CONCURRENT_MS: 500,
};

/**
 * Number of iterations for statistical significance
 */
const BENCHMARK_ITERATIONS = 100;

/**
 * Test fixtures representing different text lengths and claim densities
 */
const FIXTURES = {
  short: {
    noClaims: 'I think this is an interesting perspective to consider.',
    withClaims: 'Studies show that 75% of users prefer this approach.',
  },
  medium: {
    noClaims: `I believe we should consider multiple perspectives on this issue.
      What do you think about the different approaches available?
      There might be several ways to address this challenge effectively.`,
    withClaims: `According to the World Health Organization, 80% of adults experience stress.
      In 2020, researchers found that meditation reduces cortisol levels by 25%.
      This leads to better mental health outcomes compared to control groups.`,
  },
  long: {
    noClaims: `Let me share some thoughts on this topic without making specific claims.
      I find it fascinating how different people approach this issue.
      There are many perspectives worth considering when we think about this.
      What aspects do you think are most important to focus on?
      I'd love to hear your thoughts on this matter.
      Perhaps we could explore different angles together.
      The discussion so far has been quite enlightening.
      I appreciate everyone's willingness to engage on this topic.`,
    withClaims: `In 2020, researchers found that 80% of adults experienced increased stress.
      According to the CDC, this led to higher rates of anxiety disorders.
      Studies show that meditation can reduce stress by up to 40%.
      Since 1990, mental health awareness has grown significantly in society.
      Experts indicate that cognitive behavioral therapy is more effective than medication alone.
      The World Health Organization reports that depression affects 280 million people globally.
      Research published in peer-reviewed journals demonstrates clear benefits.
      Due to these findings, healthcare providers now recommend integrated approaches.`,
  },
  veryLong: {
    withClaims: `The comprehensive analysis of global health trends reveals significant patterns.
      In 2015, the United Nations established the Sustainable Development Goals.
      According to WHO data, 75% of the world's population has access to essential medicines.
      Studies show that preventive care reduces hospitalization rates by 30%.
      Since 1990, child mortality has decreased by more than 50% worldwide.
      Research indicates that education leads to better health outcomes across populations.
      The CDC reports that vaccination programs have prevented millions of deaths.
      Based on recent analysis, healthcare spending correlates with life expectancy.
      Scientists found evidence that environmental factors cause 25% of global disease.
      Due to climate change, tropical diseases are spreading to new regions.
      Compared to 1950, average life expectancy has increased by more than 25 years.
      According to the latest census, 60% of people now live in urban areas.
      The highest rates of chronic disease occur in developed nations.
      Researchers demonstrate that lifestyle changes can reverse many conditions.
      As a result of public health campaigns, smoking rates have declined significantly.`,
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

describe('ClaimExtractorService Latency Benchmarks', () => {
  let service: ClaimExtractorService;

  beforeAll(() => {
    service = new ClaimExtractorService();
  });

  describe('Short Text Extraction (<100 chars)', () => {
    it('should extract from text without claims within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.short.noClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Short text (no claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should extract claims from short text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.short.withClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Short text (with claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Medium Text Extraction (100-500 chars)', () => {
    it('should extract from medium text without claims within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.medium.noClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Medium text (no claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should extract claims from medium text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.medium.withClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Medium text (with claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Long Text Extraction (500-2000 chars)', () => {
    it('should extract from long text without claims within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.long.noClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Long text (no claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should extract claims from long text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.long.withClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Long text (with claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });
  });

  describe('Multi-Claim Dense Text', () => {
    it('should extract multiple claims from dense text within latency threshold', async () => {
      const stats = await runBenchmark(
        () => service.extract(FIXTURES.veryLong.withClaims),
        BENCHMARK_ITERATIONS,
      );

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);
      expect(stats.p99).toBeLessThan(LATENCY_THRESHOLDS.P99_TARGET_MS);

      console.log('Very long text (dense claims) benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        p99: `${stats.p99.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should verify claim count from dense text', async () => {
      const result = await service.extract(FIXTURES.veryLong.withClaims);

      // Dense claim text should extract multiple claims
      expect(result.totalClaims).toBeGreaterThanOrEqual(5);
      expect(result.processingTimeMs).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);

      console.log('Dense claim extraction result:', {
        claimsFound: result.totalClaims,
        processingTime: `${result.processingTimeMs.toFixed(2)}ms`,
      });
    });
  });

  describe('Concurrent Extraction', () => {
    it('should handle 10 concurrent extractions within latency threshold', async () => {
      const texts = [
        FIXTURES.short.noClaims,
        FIXTURES.short.withClaims,
        FIXTURES.medium.noClaims,
        FIXTURES.medium.withClaims,
        FIXTURES.long.noClaims,
        FIXTURES.long.withClaims,
        FIXTURES.short.withClaims,
        FIXTURES.medium.withClaims,
        FIXTURES.long.withClaims,
        FIXTURES.veryLong.withClaims,
      ];

      const start = performance.now();
      await Promise.all(texts.map((text) => service.extract(text)));
      const totalLatency = performance.now() - start;

      expect(totalLatency).toBeLessThan(LATENCY_THRESHOLDS.MAX_CONCURRENT_MS);

      console.log('Concurrent extraction (10 texts):', {
        totalLatency: `${totalLatency.toFixed(2)}ms`,
        avgPerRequest: `${(totalLatency / texts.length).toFixed(2)}ms`,
      });
    });

    it('should maintain stable latency under repeated concurrent load', async () => {
      const batchLatencies: number[] = [];

      for (let batch = 0; batch < 10; batch += 1) {
        const texts = [
          FIXTURES.short.withClaims,
          FIXTURES.medium.withClaims,
          FIXTURES.long.withClaims,
        ];

        const start = performance.now();
        await Promise.all(texts.map((text) => service.extract(text)));
        batchLatencies.push(performance.now() - start);
      }

      const mean = batchLatencies.reduce((a, b) => a + b, 0) / batchLatencies.length;
      const variance =
        batchLatencies.reduce((acc, val) => acc + (val - mean) ** 2, 0) / batchLatencies.length;
      const stdDev = Math.sqrt(variance);

      // Variance should be reasonable (no memory leaks or degradation)
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
      const stats = await runBenchmark(() => service.extract(''), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);
      expect(stats.p95).toBeLessThan(LATENCY_THRESHOLDS.P95_TARGET_MS);

      console.log('Empty string benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
      });
    });

    it('should handle repeated text (5000+ chars) within acceptable limits', async () => {
      const repeatedText = FIXTURES.long.withClaims.repeat(5);

      const stats = await runBenchmark(() => service.extract(repeatedText), 50);

      // Allow slightly higher threshold for very long text
      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS * 2);

      console.log('Very long repeated text (5000+ chars) benchmark:', {
        textLength: repeatedText.length,
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        max: `${stats.max.toFixed(2)}ms`,
      });
    });

    it('should handle text with no sentence boundaries', async () => {
      const noSentences =
        'According to research 75% of users and scientists found that studies show leading to results';

      const stats = await runBenchmark(() => service.extract(noSentences), BENCHMARK_ITERATIONS);

      expect(stats.max).toBeLessThan(LATENCY_THRESHOLDS.MAX_SINGLE_EXTRACTION_MS);

      console.log('No sentence boundaries benchmark:', {
        mean: `${stats.mean.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
      });
    });
  });
});
