import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { QdrantService } from '../qdrant.service.js';
import { FeedbackType } from '@prisma/client';
import type { FeedbackMetadata } from '../types.js';

describe('QdrantService', () => {
  let service: QdrantService;
  let mockQdrantClient: any;

  beforeEach(async () => {
    mockQdrantClient = {
      getCollections: vi.fn().mockResolvedValue({ collections: [] }),
      createCollection: vi.fn().mockResolvedValue(true),
      search: vi.fn(),
      upsert: vi.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [QdrantService, { provide: 'QDRANT_CLIENT', useValue: mockQdrantClient }],
    }).compile();

    service = module.get<QdrantService>(QdrantService);
    await service.onModuleInit();
  });

  describe('searchSimilar', () => {
    it('should return null when no matches found', async () => {
      mockQdrantClient.search.mockResolvedValue([]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).toBeNull();
    });

    it('should return cached feedback when similarity meets threshold', async () => {
      mockQdrantClient.search.mockResolvedValue([
        {
          score: 0.97,
          payload: {
            contentHash: 'abc123',
            feedbackType: 'FALLACY',
            subtype: 'straw_man',
            suggestionText: 'Test suggestion',
            reasoning: 'Test reasoning',
            confidenceScore: 0.85,
            topicId: null,
            createdAt: '2026-02-01T00:00:00Z',
          },
        },
      ]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).not.toBeNull();
      expect(result?.result.type).toBe(FeedbackType.FALLACY);
      expect(result?.similarity).toBe(0.97);
    });

    it('should return null when similarity below threshold', async () => {
      mockQdrantClient.search.mockResolvedValue([
        {
          score: 0.9,
          payload: {
            feedbackType: 'FALLACY',
            suggestionText: 'Test',
            reasoning: 'Test',
            confidenceScore: 0.85,
          },
        },
      ]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).toBeNull();
    });
  });

  describe('store', () => {
    it('should store embedding with metadata', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const result = {
        type: FeedbackType.FALLACY,
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
      };
      const metadata: FeedbackMetadata = {
        contentHash: 'abc123',
        feedbackType: 'FALLACY',
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
        topicId: null,
        createdAt: '2026-02-01T00:00:00Z',
      };

      await service.store(embedding, result, metadata);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              vector: embedding,
              payload: metadata,
            }),
          ]),
        }),
      );
    });
  });
});
