import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeedbackSensitivity } from '../../feedback/dto/request-feedback.dto.js';

// Import types only - don't need the actual FeedbackType enum for these tests
// since we're testing caching behavior, not type correctness
type CachedFeedbackResult = {
  type: string;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources: string[] | null;
  cachedAt: string;
};

describe('FeedbackCacheService', () => {
  let service: any;
  let mockCache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    // Dynamically import to avoid hoisting issues
    const { FeedbackCacheService } = await import('../feedback-cache.service.js');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get(FeedbackCacheService);
  });

  describe('generateCacheKey', () => {
    it('should generate deterministic keys for same content', () => {
      const content = 'Test content for analysis';
      const key1 = service.generateCacheKey(content, FeedbackSensitivity.MEDIUM);
      const key2 = service.generateCacheKey(content, FeedbackSensitivity.MEDIUM);

      expect(key1).toBe(key2);
    });

    it('should normalize content by trimming and lowercasing', () => {
      const key1 = service.generateCacheKey('  Test Content  ', FeedbackSensitivity.MEDIUM);
      const key2 = service.generateCacheKey('test content', FeedbackSensitivity.MEDIUM);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different sensitivity levels', () => {
      const content = 'Test content';
      const keyLow = service.generateCacheKey(content, FeedbackSensitivity.LOW);
      const keyMedium = service.generateCacheKey(content, FeedbackSensitivity.MEDIUM);
      const keyHigh = service.generateCacheKey(content, FeedbackSensitivity.HIGH);

      expect(keyLow).not.toBe(keyMedium);
      expect(keyMedium).not.toBe(keyHigh);
      expect(keyLow).not.toBe(keyHigh);
    });

    it('should include feedback prefix in key', () => {
      const key = service.generateCacheKey('content', FeedbackSensitivity.MEDIUM);

      expect(key).toMatch(/^feedback:/);
    });
  });

  describe('getCachedFeedback', () => {
    it('should return cached result on cache hit', async () => {
      const cachedResult: CachedFeedbackResult = {
        type: 'AFFIRMATION',
        subtype: null,
        suggestionText: 'Good job!',
        reasoning: 'No issues detected',
        confidenceScore: 0.9,
        educationalResources: null,
        cachedAt: '2026-01-31T12:00:00Z',
      };

      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.getCachedFeedback('content', FeedbackSensitivity.MEDIUM);

      expect(result).toEqual(cachedResult);
      expect(mockCache.get).toHaveBeenCalledOnce();
    });

    it('should return null on cache miss', async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await service.getCachedFeedback('content', FeedbackSensitivity.MEDIUM);

      expect(result).toBeNull();
    });

    it('should return null and not throw on cache error', async () => {
      mockCache.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getCachedFeedback('content', FeedbackSensitivity.MEDIUM);

      expect(result).toBeNull();
    });
  });

  describe('cacheFeedback', () => {
    it('should store feedback in cache with timestamp', async () => {
      const feedbackData = {
        type: 'FALLACY',
        subtype: 'ad_hominem',
        suggestionText: 'Avoid personal attacks',
        reasoning: 'Detected ad hominem fallacy',
        confidenceScore: 0.85,
        educationalResources: null,
      };

      await service.cacheFeedback('content', FeedbackSensitivity.MEDIUM, feedbackData);

      expect(mockCache.set).toHaveBeenCalledOnce();
      const [key, value] = mockCache.set.mock.calls[0];
      expect(key).toMatch(/^feedback:/);
      expect(value.type).toBe('FALLACY');
      expect(value.cachedAt).toBeDefined();
      expect(new Date(value.cachedAt).getTime()).toBeGreaterThan(0);
    });

    it('should not throw on cache error', async () => {
      mockCache.set.mockRejectedValue(new Error('Redis write failed'));

      await expect(
        service.cacheFeedback('content', FeedbackSensitivity.MEDIUM, {
          type: 'AFFIRMATION',
          subtype: null,
          suggestionText: 'test',
          reasoning: 'test',
          confidenceScore: 0.9,
          educationalResources: null,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should delete specific cache entry', async () => {
      await service.invalidate('content', FeedbackSensitivity.MEDIUM);

      expect(mockCache.del).toHaveBeenCalledOnce();
    });

    it('should not throw on cache error', async () => {
      mockCache.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(
        service.invalidate('content', FeedbackSensitivity.MEDIUM),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateAll', () => {
    it('should invalidate all sensitivity levels', async () => {
      await service.invalidateAll('content');

      expect(mockCache.del).toHaveBeenCalledTimes(3);
    });
  });
});
