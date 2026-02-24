/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TopicRecommendationsService } from './topic-recommendations.service.js';

const createMockPrismaService = () => ({
  discussionTopic: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
});

describe('TopicRecommendationsService', () => {
  let service: TopicRecommendationsService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const mockTopic = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Climate Change Discussion',
    slug: 'climate-change-discussion',
    description: 'A discussion about climate change impacts',
    participantCount: 25,
    responseCount: 50,
    activityLevel: 'HIGH',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    createdAt: new Date('2026-01-01'),
    lastActivityAt: new Date('2026-02-10'),
    tags: [
      {
        tag: {
          id: 'tag-1',
          name: 'environment',
          slug: 'environment',
        },
      },
      {
        tag: {
          id: 'tag-2',
          name: 'science',
          slug: 'science',
        },
      },
    ],
  };

  const mockTopic2 = {
    ...mockTopic,
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Renewable Energy Solutions',
    slug: 'renewable-energy-solutions',
    description: 'Discussing renewable energy options',
    participantCount: 15,
    responseCount: 30,
    activityLevel: 'MEDIUM',
    tags: [
      {
        tag: {
          id: 'tag-1',
          name: 'environment',
          slug: 'environment',
        },
      },
      {
        tag: {
          id: 'tag-3',
          name: 'technology',
          slug: 'technology',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrismaService();
    service = new TopicRecommendationsService(mockPrisma as any);
  });

  describe('getRecommendations', () => {
    it('should return recommendations based on query', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      const result = await service.getRecommendations({
        query: 'climate',
        limit: 10,
      });

      expect(result.recommendations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.query).toBe('climate');
      expect(result.recommendations[0].title).toBe('Climate Change Discussion');
    });

    it('should filter by tags', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      await service.getRecommendations({
        tags: ['environment', 'science'],
        limit: 10,
      });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            visibility: 'PUBLIC',
            tags: expect.objectContaining({
              some: expect.any(Object),
            }),
          }),
        }),
      );
    });

    it('should calculate recommendation scores', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic, mockTopic2]);
      mockPrisma.discussionTopic.count.mockResolvedValue(2);

      const result = await service.getRecommendations({
        query: 'energy',
        limit: 10,
      });

      // Results should be sorted by score (highest first)
      expect(result.recommendations.length).toBe(2);
      expect(result.recommendations[0].score).toBeGreaterThanOrEqual(
        result.recommendations[1].score,
      );
    });

    it('should include recommendation reasons', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      const result = await service.getRecommendations({
        query: 'climate',
        tags: ['environment'],
        limit: 10,
      });

      expect(result.recommendations[0].reason).toBeTruthy();
      expect(result.recommendations[0].reason).toContain('matches your search');
    });

    it('should respect limit parameter', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic]);
      mockPrisma.discussionTopic.count.mockResolvedValue(1);

      await service.getRecommendations({ limit: 5 });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should use default limit of 10', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);
      mockPrisma.discussionTopic.count.mockResolvedValue(0);

      await service.getRecommendations({});

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getSimilarTopics', () => {
    it('should return similar topics based on shared tags', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic2]);

      const result = await service.getSimilarTopics({
        topicId: mockTopic.id,
        limit: 5,
      });

      expect(result.sourceTopicId).toBe(mockTopic.id);
      expect(result.similarTopics).toHaveLength(1);
      expect(result.similarTopics[0].sharedTags).toContain('environment');
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.getSimilarTopics({
          topicId: 'nonexistent-id',
          limit: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate similarity scores', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic2]);

      const result = await service.getSimilarTopics({
        topicId: mockTopic.id,
        limit: 5,
      });

      // mockTopic has ['environment', 'science'], mockTopic2 has ['environment', 'technology']
      // Intersection: ['environment'] (1), Union: ['environment', 'science', 'technology'] (3)
      // Jaccard: 1/3 ≈ 0.333
      expect(result.similarTopics[0].similarityScore).toBeCloseTo(1 / 3, 2);
    });

    it('should sort by similarity score', async () => {
      const topic3 = {
        ...mockTopic,
        id: 'topic-3',
        tags: [
          { tag: { id: 'tag-1', name: 'environment', slug: 'environment' } },
          { tag: { id: 'tag-2', name: 'science', slug: 'science' } },
        ],
      };

      mockPrisma.discussionTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic2, topic3]);

      const result = await service.getSimilarTopics({
        topicId: mockTopic.id,
        limit: 5,
      });

      // topic3 should rank higher (identical tags)
      expect(result.similarTopics[0].similarityScore).toBeGreaterThan(
        result.similarTopics[1].similarityScore,
      );
    });

    it('should respect limit parameter', async () => {
      mockPrisma.discussionTopic.findUnique.mockResolvedValue(mockTopic);
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopic2]);

      const result = await service.getSimilarTopics({
        topicId: mockTopic.id,
        limit: 1,
      });

      expect(result.similarTopics.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getTrendingTopics', () => {
    const mockTopicWithCount = {
      ...mockTopic,
      // Use recent lastActivityAt to ensure positive trending score
      lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      _count: {
        responses: 15,
      },
    };

    it('should return trending topics within time window', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopicWithCount]);

      const result = await service.getTrendingTopics({
        hours: 24,
        limit: 10,
      });

      expect(result.topics).toHaveLength(1);
      expect(result.timeWindowHours).toBe(24);
      expect(result.calculatedAt).toBeTruthy();
    });

    it('should filter by lastActivityAt within time window', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      await service.getTrendingTopics({
        hours: 48,
        limit: 10,
      });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastActivityAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by tags', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopicWithCount]);

      await service.getTrendingTopics({
        hours: 24,
        tags: ['environment'],
        limit: 10,
      });

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: expect.any(Object),
          }),
        }),
      );
    });

    it('should calculate trending scores', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopicWithCount]);

      const result = await service.getTrendingTopics({
        hours: 24,
        limit: 10,
      });

      expect(result.topics[0].trendingScore).toBeGreaterThan(0);
    });

    it('should assign ranks', async () => {
      const topic2WithCount = {
        ...mockTopic2,
        _count: { responses: 5 },
      };

      mockPrisma.discussionTopic.findMany.mockResolvedValue([mockTopicWithCount, topic2WithCount]);

      const result = await service.getTrendingTopics({
        hours: 24,
        limit: 10,
      });

      expect(result.topics[0].rank).toBe(1);
      expect(result.topics[1].rank).toBe(2);
    });

    it('should use default hours of 24', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      const result = await service.getTrendingTopics({});

      expect(result.timeWindowHours).toBe(24);
    });

    it('should use default limit of 10', async () => {
      mockPrisma.discussionTopic.findMany.mockResolvedValue([]);

      await service.getTrendingTopics({});

      expect(mockPrisma.discussionTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20, // 2x the limit for scoring
        }),
      );
    });
  });
});
