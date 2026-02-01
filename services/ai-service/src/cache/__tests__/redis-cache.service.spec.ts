import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { RedisCacheService } from '../redis-cache.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeedbackType } from '@prisma/client';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [RedisCacheService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('getFeedback', () => {
    it('should return cached feedback for content hash', async () => {
      const cached = {
        type: FeedbackType.FALLACY,
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
      };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.getFeedback('abc123');

      expect(result).toEqual(cached);
      expect(mockCacheManager.get).toHaveBeenCalledWith('feedback:exact:abc123');
    });

    it('should return null on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getFeedback('abc123');

      expect(result).toBeNull();
    });

    it('should return null on cache error and not throw', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.getFeedback('abc123');

      expect(result).toBeNull();
    });
  });

  describe('setFeedback', () => {
    it('should store feedback with content hash key', async () => {
      const result = {
        type: FeedbackType.AFFIRMATION,
        suggestionText: 'Great!',
        reasoning: 'No issues',
        confidenceScore: 0.85,
      };

      await service.setFeedback('abc123', result);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'feedback:exact:abc123',
        result,
        expect.any(Number),
      );
    });

    it('should not throw on cache error (graceful degradation)', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = {
        type: FeedbackType.AFFIRMATION,
        suggestionText: 'Great!',
        reasoning: 'No issues',
        confidenceScore: 0.85,
      };

      // Should not throw
      await expect(service.setFeedback('abc123', result)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should delete cached feedback by content hash', async () => {
      await service.invalidate('abc123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('feedback:exact:abc123');
    });

    it('should not throw on cache error (graceful degradation)', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(service.invalidate('abc123')).resolves.not.toThrow();
    });
  });
});
