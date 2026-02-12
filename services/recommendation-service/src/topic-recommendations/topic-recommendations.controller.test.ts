/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TopicRecommendationsController } from './topic-recommendations.controller.js';
import type { TopicRecommendationsService } from './topic-recommendations.service.js';

describe('TopicRecommendationsController', () => {
  let controller: TopicRecommendationsController;
  let mockService: Partial<TopicRecommendationsService>;

  const mockRecommendationsResponse = {
    recommendations: [
      {
        id: '123',
        title: 'Test Topic',
        slug: 'test-topic',
        description: 'A test topic',
        participantCount: 10,
        responseCount: 20,
        activityLevel: 'MEDIUM' as const,
        tags: [{ id: 'tag-1', name: 'test', slug: 'test' }],
        score: 0.8,
        reason: 'matches your search',
        createdAt: '2026-01-01T00:00:00.000Z',
        lastActivityAt: '2026-02-10T00:00:00.000Z',
      },
    ],
    total: 1,
    query: 'test',
    tags: undefined,
  };

  const mockSimilarTopicsResponse = {
    sourceTopicId: '123',
    similarTopics: [
      {
        id: '456',
        title: 'Similar Topic',
        slug: 'similar-topic',
        description: 'A similar topic',
        tags: [{ id: 'tag-1', name: 'test', slug: 'test' }],
        similarityScore: 0.75,
        sharedTags: ['test'],
      },
    ],
  };

  const mockTrendingTopicsResponse = {
    topics: [
      {
        id: '789',
        title: 'Trending Topic',
        slug: 'trending-topic',
        description: 'A trending topic',
        tags: [{ id: 'tag-2', name: 'trending', slug: 'trending' }],
        recentResponseCount: 50,
        recentParticipantCount: 25,
        trendingScore: 0.9,
        rank: 1,
      },
    ],
    timeWindowHours: 24,
    calculatedAt: '2026-02-10T12:00:00.000Z',
  };

  beforeEach(() => {
    mockService = {
      getRecommendations: vi.fn().mockResolvedValue(mockRecommendationsResponse),
      getSimilarTopics: vi.fn().mockResolvedValue(mockSimilarTopicsResponse),
      getTrendingTopics: vi.fn().mockResolvedValue(mockTrendingTopicsResponse),
    };

    controller = new TopicRecommendationsController(mockService as TopicRecommendationsService);
  });

  describe('getRecommendations', () => {
    it('should return recommendations', async () => {
      const result = await controller.getRecommendations({
        query: 'test',
        limit: 10,
      });

      expect(result).toEqual(mockRecommendationsResponse);
      expect(mockService.getRecommendations).toHaveBeenCalledWith({
        query: 'test',
        limit: 10,
      });
    });

    it('should pass tags to service', async () => {
      await controller.getRecommendations({
        tags: ['environment', 'science'],
        limit: 5,
      });

      expect(mockService.getRecommendations).toHaveBeenCalledWith({
        tags: ['environment', 'science'],
        limit: 5,
      });
    });
  });

  describe('getSimilarTopics', () => {
    it('should return similar topics for a topic ID', async () => {
      const result = await controller.getSimilarTopics('123', 5);

      expect(result).toEqual(mockSimilarTopicsResponse);
      expect(mockService.getSimilarTopics).toHaveBeenCalledWith({
        topicId: '123',
        limit: 5,
      });
    });

    it('should handle undefined limit', async () => {
      await controller.getSimilarTopics('123', undefined);

      expect(mockService.getSimilarTopics).toHaveBeenCalledWith({
        topicId: '123',
        limit: undefined,
      });
    });

    it('should convert string limit to number', async () => {
      await controller.getSimilarTopics('123', '10' as any);

      expect(mockService.getSimilarTopics).toHaveBeenCalledWith({
        topicId: '123',
        limit: 10,
      });
    });
  });

  describe('getTrendingTopics', () => {
    it('should return trending topics', async () => {
      const result = await controller.getTrendingTopics({
        hours: 24,
        limit: 10,
      });

      expect(result).toEqual(mockTrendingTopicsResponse);
      expect(mockService.getTrendingTopics).toHaveBeenCalledWith({
        hours: 24,
        limit: 10,
      });
    });

    it('should pass tags filter to service', async () => {
      await controller.getTrendingTopics({
        hours: 48,
        tags: ['politics'],
        limit: 5,
      });

      expect(mockService.getTrendingTopics).toHaveBeenCalledWith({
        hours: 48,
        tags: ['politics'],
        limit: 5,
      });
    });

    it('should handle empty query parameters', async () => {
      await controller.getTrendingTopics({});

      expect(mockService.getTrendingTopics).toHaveBeenCalledWith({});
    });
  });
});
