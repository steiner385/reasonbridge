import { describe, it, expect } from 'vitest';
import type {
  FeedbackMetadata,
  CachedFeedback,
  SemanticCacheConfig,
  CacheLookupResult,
} from '../types.js';
import { FeedbackType } from '@prisma/client';

describe('Cache Types', () => {
  it('should define FeedbackMetadata interface correctly', () => {
    const metadata: FeedbackMetadata = {
      contentHash: 'abc123',
      feedbackType: 'FALLACY',
      subtype: 'straw_man',
      suggestionText: 'Test suggestion',
      reasoning: 'Test reasoning',
      confidenceScore: 0.85,
      topicId: 'topic-123',
      createdAt: '2026-02-01T00:00:00Z',
    };

    expect(metadata.contentHash).toBe('abc123');
    expect(metadata.feedbackType).toBe('FALLACY');
  });

  it('should define CachedFeedback interface correctly', () => {
    const cached: CachedFeedback = {
      result: {
        type: FeedbackType.FALLACY,
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.9,
      },
      metadata: {
        contentHash: 'abc123',
        feedbackType: 'FALLACY',
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.9,
        topicId: null,
        createdAt: '2026-02-01T00:00:00Z',
      },
      similarity: 0.97,
    };

    expect(cached.similarity).toBe(0.97);
  });

  it('should define CacheLookupResult for cache hits', () => {
    const hit: CacheLookupResult = {
      hit: true,
      source: 'qdrant',
      result: {
        type: FeedbackType.AFFIRMATION,
        suggestionText: 'Great!',
        reasoning: 'No issues',
        confidenceScore: 0.85,
      },
      similarity: 0.98,
    };

    expect(hit.hit).toBe(true);
    expect(hit.source).toBe('qdrant');
  });

  it('should define CacheLookupResult for cache misses', () => {
    const miss: CacheLookupResult = {
      hit: false,
      source: 'none',
    };

    expect(miss.hit).toBe(false);
    expect(miss.result).toBeUndefined();
  });
});
