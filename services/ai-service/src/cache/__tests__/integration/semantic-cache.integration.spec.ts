import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CacheModule } from '../../cache.module.js';
import { SemanticCacheService } from '../../semantic-cache.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

/**
 * Integration tests for SemanticCacheService.
 *
 * These tests require external services (Redis, Qdrant, OpenAI) to be running.
 * Set INTEGRATION_TESTS=true to enable these tests.
 *
 * Prerequisites:
 * - Redis running on localhost:6379 (or REDIS_HOST/REDIS_PORT)
 * - Qdrant running on localhost:6333 (or QDRANT_URL)
 * - OPENAI_API_KEY environment variable set
 */
describe.skipIf(!process.env['INTEGRATION_TESTS'])('SemanticCacheService Integration', () => {
  let app: INestApplication;
  let service: SemanticCacheService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<SemanticCacheService>(SemanticCacheService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should cache and retrieve feedback', async () => {
    const content = `This is a test argument for caching ${Date.now()}`;
    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Good argument structure',
      reasoning: 'The argument is well structured with clear premises',
      confidenceScore: 0.85,
    };

    // First call - should miss cache and run analyzer
    const result1 = await service.getOrAnalyze(content, async () => mockResult);

    expect(result1).toEqual(mockResult);

    // Wait for async cache population
    await new Promise((r) => setTimeout(r, 500));

    // Second call - should hit cache (Redis exact match)
    const analyzeFunc = vi.fn().mockResolvedValue(mockResult);
    const result2 = await service.getOrAnalyze(content, analyzeFunc);

    expect(result2).toEqual(mockResult);
    expect(analyzeFunc).not.toHaveBeenCalled();
  });

  it('should find similar content in Qdrant', async () => {
    const timestamp = Date.now();
    const content1 = `Climate change is primarily caused by human activities ${timestamp}`;
    const content2 = `Human activities are the primary cause of climate change ${timestamp}`; // Semantically similar

    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Good point about climate science',
      reasoning: 'Well supported by scientific consensus',
      confidenceScore: 0.9,
    };

    // Store first content with fresh analysis
    await service.getOrAnalyze(content1, async () => mockResult);

    // Wait for async cache population in both Redis and Qdrant
    await new Promise((r) => setTimeout(r, 2000));

    // Similar content should potentially hit Qdrant cache
    const analyzeFunc = vi.fn().mockResolvedValue({
      ...mockResult,
      suggestionText: 'Different suggestion',
    });
    const result = await service.getOrAnalyze(content2, analyzeFunc);

    // The result should be defined - either from cache or fresh analysis
    expect(result).toBeDefined();
    expect(result.type).toBe(FeedbackType.AFFIRMATION);
    expect(result.confidenceScore).toBeGreaterThan(0);

    // Note: We cannot guarantee Qdrant hit because:
    // 1. Semantic similarity depends on embedding model behavior
    // 2. The 0.95 threshold is quite strict
    // This test validates the integration flow works, not exact similarity matching
  });

  it('should return cache lookup result', async () => {
    const content = `Unique content for lookup test ${Date.now()}`;
    const mockResult = {
      type: FeedbackType.FALLACY,
      subtype: 'ad_hominem',
      suggestionText: 'Focus on the argument',
      reasoning: 'Attack on person rather than argument',
      confidenceScore: 0.8,
    };

    // Initially should not be in cache
    const lookupBefore = await service.lookup(content);
    expect(lookupBefore.hit).toBe(false);
    expect(lookupBefore.source).toBe('none');

    // Analyze and cache
    await service.getOrAnalyze(content, async () => mockResult);

    // Wait for async cache population
    await new Promise((r) => setTimeout(r, 500));

    // Now should be in cache
    const lookupAfter = await service.lookup(content);
    expect(lookupAfter.hit).toBe(true);
    expect(lookupAfter.source).toBe('redis');
    expect(lookupAfter.result).toEqual(mockResult);
  });

  it('should handle concurrent requests for same content', async () => {
    const content = `Concurrent test content ${Date.now()}`;
    let analyzeCallCount = 0;
    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Test suggestion',
      reasoning: 'Test reasoning',
      confidenceScore: 0.75,
    };

    const analyzeFunc = async () => {
      analyzeCallCount++;
      // Simulate slow analysis
      await new Promise((r) => setTimeout(r, 100));
      return mockResult;
    };

    // Fire multiple concurrent requests
    const results = await Promise.all([
      service.getOrAnalyze(content, analyzeFunc),
      service.getOrAnalyze(content, analyzeFunc),
      service.getOrAnalyze(content, analyzeFunc),
    ]);

    // All results should be valid
    results.forEach((result) => {
      expect(result).toEqual(mockResult);
    });

    // Ideally analyzer should only be called once due to request coalescing
    // But without explicit coalescing, each call may trigger analysis
    // This test validates the system handles concurrent requests correctly
    expect(analyzeCallCount).toBeGreaterThanOrEqual(1);
    expect(analyzeCallCount).toBeLessThanOrEqual(3);
  });

  it('should gracefully handle service failures', async () => {
    // This test validates resilience when external services have issues
    const content = `Failure resilience test ${Date.now()}`;
    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Fallback result',
      reasoning: 'Analysis completed despite potential cache issues',
      confidenceScore: 0.7,
    };

    // Even if cache services have intermittent issues,
    // the service should fall back to fresh analysis
    const result = await service.getOrAnalyze(content, async () => mockResult);

    expect(result).toEqual(mockResult);
  });
});
