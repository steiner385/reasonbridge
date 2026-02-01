import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticCacheService } from '../semantic-cache.service.js';
import type { EmbeddingService } from '../embedding.service.js';
import type { QdrantService } from '../qdrant.service.js';
import type { RedisCacheService } from '../redis-cache.service.js';
import { FeedbackType } from '@prisma/client';

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let mockEmbeddingService: {
    getEmbedding: ReturnType<typeof vi.fn>;
  };
  let mockQdrantService: {
    searchSimilar: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
  };
  let mockRedisCacheService: {
    getFeedback: ReturnType<typeof vi.fn>;
    setFeedback: ReturnType<typeof vi.fn>;
  };

  const mockAnalysisResult = {
    type: FeedbackType.FALLACY,
    subtype: 'straw_man',
    suggestionText: 'Test suggestion',
    reasoning: 'Test reasoning',
    confidenceScore: 0.85,
  };

  beforeEach(() => {
    mockEmbeddingService = {
      getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    mockQdrantService = {
      searchSimilar: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    };

    mockRedisCacheService = {
      getFeedback: vi.fn().mockResolvedValue(null),
      setFeedback: vi.fn().mockResolvedValue(undefined),
    };

    // Directly instantiate service with mocked dependencies
    service = new SemanticCacheService(
      mockEmbeddingService as unknown as EmbeddingService,
      mockQdrantService as unknown as QdrantService,
      mockRedisCacheService as unknown as RedisCacheService,
    );
  });

  describe('getOrAnalyze', () => {
    it('should return Redis cached result on exact match', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(mockAnalysisResult);

      const analyzeFunc = vi.fn();
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).not.toHaveBeenCalled();
      expect(mockEmbeddingService.getEmbedding).not.toHaveBeenCalled();
    });

    it('should return Qdrant cached result on similarity match', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue({
        result: mockAnalysisResult,
        similarity: 0.97,
      });

      const analyzeFunc = vi.fn();
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).not.toHaveBeenCalled();
    });

    it('should call analyzer and cache result on cache miss', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue(null);

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
      // Give async cache population time to start
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockRedisCacheService.setFeedback).toHaveBeenCalled();
      expect(mockQdrantService.store).toHaveBeenCalled();
    });

    it('should handle embedding service failure gracefully', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockEmbeddingService.getEmbedding.mockRejectedValue(new Error('OpenAI error'));

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
    });

    it('should handle Qdrant failure gracefully', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockRejectedValue(new Error('Qdrant error'));

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
    });

    it('should also cache Qdrant hit in Redis for faster future lookups', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue({
        result: mockAnalysisResult,
        similarity: 0.96,
      });

      await service.getOrAnalyze('test content', vi.fn());

      // Give async cache population time to start
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockRedisCacheService.setFeedback).toHaveBeenCalled();
    });
  });

  describe('lookup', () => {
    it('should return redis hit when content is in Redis', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(mockAnalysisResult);

      const result = await service.lookup('test content');

      expect(result).toEqual({
        hit: true,
        source: 'redis',
        result: mockAnalysisResult,
      });
    });

    it('should return qdrant hit when content is similar in Qdrant', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue({
        result: mockAnalysisResult,
        similarity: 0.98,
      });

      const result = await service.lookup('test content');

      expect(result).toEqual({
        hit: true,
        source: 'qdrant',
        result: mockAnalysisResult,
        similarity: 0.98,
      });
    });

    it('should return cache miss when content not found', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue(null);

      const result = await service.lookup('test content');

      expect(result).toEqual({
        hit: false,
        source: 'none',
      });
    });
  });
});
