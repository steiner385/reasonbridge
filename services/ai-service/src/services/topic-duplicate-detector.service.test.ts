/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicDuplicateDetectorService } from './topic-duplicate-detector.service.js';
import type { DuplicateCandidate } from './topic-duplicate-detector.service.js';

const createMockEmbeddingService = () => ({
  getEmbedding: vi.fn(),
  getCachedEmbedding: vi.fn(),
});

describe('TopicDuplicateDetectorService', () => {
  let service: TopicDuplicateDetectorService;
  let mockEmbeddingService: ReturnType<typeof createMockEmbeddingService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddingService = createMockEmbeddingService();
    service = new TopicDuplicateDetectorService(mockEmbeddingService as any);
  });

  describe('computeSemanticSimilarity', () => {
    it('should return similarity score when embeddings are available', async () => {
      // Mock embeddings - identical vectors should have similarity ~1.0
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbeddingService.getEmbedding.mockResolvedValue(embedding);

      const result = await service.computeSemanticSimilarity(
        'Climate change',
        'Effects of global warming',
        'Climate change',
        'Effects of global warming',
      );

      expect(result).toBe(1.0);
      expect(mockEmbeddingService.getEmbedding).toHaveBeenCalledTimes(2);
    });

    it('should return null when embeddings are unavailable', async () => {
      mockEmbeddingService.getEmbedding.mockResolvedValue(null);

      const result = await service.computeSemanticSimilarity(
        'Climate change',
        'Effects of global warming',
        'Healthcare policy',
        'Medical system reforms',
      );

      expect(result).toBeNull();
    });

    it('should compute cosine similarity correctly for different vectors', async () => {
      // Two similar but not identical vectors
      const embedding1 = [1.0, 0.0, 0.0];
      const embedding2 = [0.707, 0.707, 0.0]; // 45 degrees apart, cos(45) ≈ 0.707

      mockEmbeddingService.getEmbedding
        .mockResolvedValueOnce(embedding1)
        .mockResolvedValueOnce(embedding2);

      const result = await service.computeSemanticSimilarity(
        'Topic A',
        'Description A',
        'Topic B',
        'Description B',
      );

      expect(result).toBeCloseTo(0.71, 1);
    });

    it('should handle orthogonal vectors (zero similarity)', async () => {
      const embedding1 = [1.0, 0.0, 0.0];
      const embedding2 = [0.0, 1.0, 0.0]; // Orthogonal

      mockEmbeddingService.getEmbedding
        .mockResolvedValueOnce(embedding1)
        .mockResolvedValueOnce(embedding2);

      const result = await service.computeSemanticSimilarity(
        'Topic A',
        'Description A',
        'Topic B',
        'Description B',
      );

      expect(result).toBe(0);
    });
  });

  describe('analyzeCandidates', () => {
    it('should return empty results when no candidates provided', async () => {
      const result = await service.analyzeCandidates('New Topic', 'New description', []);

      expect(result.hasDuplicates).toBe(false);
      expect(result.results).toHaveLength(0);
      expect(result.analysisMethod).toBe('semantic');
    });

    it('should enhance candidates with semantic scores', async () => {
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Climate Change Debate',
          description: 'Discussion about climate change impacts',
          trigramScore: 0.75,
        },
      ];

      // Mock high semantic similarity
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbeddingService.getEmbedding.mockResolvedValue(embedding);

      const result = await service.analyzeCandidates(
        'Climate Change Discussion',
        'Talk about climate change effects',
        candidates,
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.semanticScore).toBe(1.0); // Identical embeddings
      expect(result.results[0]!.matchType).toBe('semantic');
      expect(result.analysisMethod).toBe('semantic');
    });

    it('should fall back to trigram-only when embeddings unavailable', async () => {
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Healthcare Policy',
          description: 'Discussion about healthcare reforms',
          trigramScore: 0.85,
        },
      ];

      mockEmbeddingService.getEmbedding.mockResolvedValue(null);

      const result = await service.analyzeCandidates(
        'Healthcare Reform',
        'Talk about medical system changes',
        candidates,
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]!.matchType).toBe('trigram');
      expect(result.results[0]!.combinedScore).toBe(0.85); // Same as trigram
      expect(result.analysisMethod).toBe('trigram-only');
    });

    it('should calculate combined score correctly (40% trigram, 60% semantic)', async () => {
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          description: 'Test description',
          trigramScore: 0.7,
        },
      ];

      // Mock different embeddings with known similarity
      const embedding1 = [1.0, 0.0];
      const embedding2 = [0.6, 0.8]; // cos similarity ≈ 0.6

      mockEmbeddingService.getEmbedding
        .mockResolvedValueOnce(embedding1)
        .mockResolvedValueOnce(embedding2);

      const result = await service.analyzeCandidates('New Topic', 'New description', candidates);

      // Expected: 0.7 * 0.4 + 0.6 * 0.6 = 0.28 + 0.36 = 0.64
      expect(result.results[0]!.combinedScore).toBeCloseTo(0.64, 1);
    });

    it('should detect duplicates when combined score exceeds threshold', async () => {
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Identical Topic',
          description: 'Same description',
          trigramScore: 0.9,
        },
      ];

      const embedding = [0.5, 0.5, 0.5];
      mockEmbeddingService.getEmbedding.mockResolvedValue(embedding);

      const result = await service.analyzeCandidates(
        'Identical Topic',
        'Same description',
        candidates,
      );

      expect(result.hasDuplicates).toBe(true);
      expect(result.threshold).toBe(0.8);
    });

    it('should not flag as duplicate when score below threshold', async () => {
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Different Topic',
          description: 'Different description',
          trigramScore: 0.5,
        },
      ];

      // Mock low similarity embeddings
      const embedding1 = [1.0, 0.0, 0.0];
      const embedding2 = [0.0, 0.0, 1.0];

      mockEmbeddingService.getEmbedding
        .mockResolvedValueOnce(embedding1)
        .mockResolvedValueOnce(embedding2);

      const result = await service.analyzeCandidates('New Topic', 'New description', candidates);

      expect(result.hasDuplicates).toBe(false);
    });

    it('should sort results by combined score descending', async () => {
      const candidates: DuplicateCandidate[] = [
        { id: 'topic-1', title: 'Low match', description: 'Low', trigramScore: 0.6 },
        { id: 'topic-2', title: 'High match', description: 'High', trigramScore: 0.9 },
        { id: 'topic-3', title: 'Medium match', description: 'Medium', trigramScore: 0.75 },
      ];

      const embedding = [0.5, 0.5];
      mockEmbeddingService.getEmbedding.mockResolvedValue(embedding);

      const result = await service.analyzeCandidates('Test Topic', 'Test description', candidates);

      expect(result.results[0]!.id).toBe('topic-2');
      expect(result.results[1]!.id).toBe('topic-3');
      expect(result.results[2]!.id).toBe('topic-1');
    });

    it('should truncate description in results', async () => {
      const longDescription = 'A'.repeat(500);
      const candidates: DuplicateCandidate[] = [
        {
          id: 'topic-1',
          title: 'Test Topic',
          description: longDescription,
          trigramScore: 0.8,
        },
      ];

      const embedding = [0.5, 0.5];
      mockEmbeddingService.getEmbedding.mockResolvedValue(embedding);

      const result = await service.analyzeCandidates('New Topic', 'New description', candidates);

      expect(result.results[0]!.description.length).toBe(200);
    });
  });

  describe('isSemanticAnalysisAvailable', () => {
    it('should return true when embedding service is available', async () => {
      mockEmbeddingService.getEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);

      const result = await service.isSemanticAnalysisAvailable();

      expect(result).toBe(true);
    });

    it('should return false when embedding service is unavailable', async () => {
      mockEmbeddingService.getEmbedding.mockResolvedValue(null);

      const result = await service.isSemanticAnalysisAvailable();

      expect(result).toBe(false);
    });
  });
});
