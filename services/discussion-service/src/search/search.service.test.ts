/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { TopicsSearchService } from '../topics/topics-search.service';
import { ResponsesSearchService } from '../responses/responses-search.service';
import { SearchCacheService } from './search-cache.service';
import { SearchResultType, SearchSortBy } from './dto/unified-search-query.dto';

describe('SearchService', () => {
  let service: SearchService;
  let topicsSearchService: TopicsSearchService;
  let responsesSearchService: ResponsesSearchService;
  let cacheService: SearchCacheService;
  let prismaService: PrismaService;

  const mockTopicsSearchService = {
    fullTextSearch: vi.fn(),
  };

  const mockResponsesSearchService = {
    fullTextSearch: vi.fn(),
    searchWithContext: vi.fn(),
    countSearchResults: vi.fn(),
  };

  const mockCacheService = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    discussionTopic: {
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TopicsSearchService, useValue: mockTopicsSearchService },
        { provide: ResponsesSearchService, useValue: mockResponsesSearchService },
        { provide: SearchCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    topicsSearchService = module.get<TopicsSearchService>(TopicsSearchService);
    responsesSearchService = module.get<ResponsesSearchService>(ResponsesSearchService);
    cacheService = module.get<SearchCacheService>(SearchCacheService);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should return cached results when available', async () => {
      const cachedResults = {
        data: [],
        meta: {
          total: 0,
          topicCount: 0,
          responseCount: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          query: 'test',
        },
      };

      mockCacheService.get.mockResolvedValue(cachedResults);

      const results = await service.search({
        q: 'test',
        type: SearchResultType.ALL,
        page: 1,
        limit: 20,
      });

      expect(results).toEqual(cachedResults);
      expect(mockTopicsSearchService.fullTextSearch).not.toHaveBeenCalled();
      expect(mockResponsesSearchService.searchWithContext).not.toHaveBeenCalled();
    });

    it('should search topics only when type is topics', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockTopicsSearchService.fullTextSearch.mockResolvedValue([]);
      mockPrismaService.discussionTopic.findMany.mockResolvedValue([]);

      await service.search({
        q: 'test',
        type: SearchResultType.TOPICS,
        page: 1,
        limit: 20,
      });

      expect(mockTopicsSearchService.fullTextSearch).toHaveBeenCalled();
      expect(mockResponsesSearchService.searchWithContext).not.toHaveBeenCalled();
    });

    it('should search responses only when type is responses', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockResponsesSearchService.searchWithContext.mockResolvedValue([]);
      mockResponsesSearchService.countSearchResults.mockResolvedValue(0);

      await service.search({
        q: 'test',
        type: SearchResultType.RESPONSES,
        page: 1,
        limit: 20,
      });

      expect(mockResponsesSearchService.searchWithContext).toHaveBeenCalled();
      expect(mockTopicsSearchService.fullTextSearch).not.toHaveBeenCalled();
    });

    it('should search both topics and responses when type is all', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockTopicsSearchService.fullTextSearch.mockResolvedValue([]);
      mockResponsesSearchService.searchWithContext.mockResolvedValue([]);
      mockResponsesSearchService.countSearchResults.mockResolvedValue(0);
      mockPrismaService.discussionTopic.findMany.mockResolvedValue([]);

      await service.search({
        q: 'test',
        type: SearchResultType.ALL,
        page: 1,
        limit: 20,
      });

      expect(mockTopicsSearchService.fullTextSearch).toHaveBeenCalled();
      expect(mockResponsesSearchService.searchWithContext).toHaveBeenCalled();
    });

    it('should cache search results', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);
      mockTopicsSearchService.fullTextSearch.mockResolvedValue([]);
      mockResponsesSearchService.searchWithContext.mockResolvedValue([]);
      mockResponsesSearchService.countSearchResults.mockResolvedValue(0);
      mockPrismaService.discussionTopic.findMany.mockResolvedValue([]);

      await service.search({
        q: 'test',
        type: SearchResultType.ALL,
        page: 1,
        limit: 20,
      });

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return combined results sorted by relevance', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockTopicsSearchService.fullTextSearch.mockResolvedValue([{ id: 'topic-1', rank: 0.9 }]);
      mockPrismaService.discussionTopic.findMany.mockResolvedValue([
        {
          id: 'topic-1',
          title: 'Test Topic',
          description: 'A test topic about testing',
          slug: 'test-topic',
          status: 'ACTIVE',
          responseCount: 5,
          participantCount: 3,
          createdAt: new Date(),
          tags: [{ tag: { name: 'test' } }],
        },
      ]);
      mockResponsesSearchService.searchWithContext.mockResolvedValue([
        {
          id: 'response-1',
          rank: 0.8,
          content: 'Test response',
          authorId: 'author-1',
          topicId: 'topic-1',
          topicTitle: 'Test Topic',
          topicSlug: 'test-topic',
          parentId: null,
          createdAt: new Date(),
        },
      ]);
      mockResponsesSearchService.countSearchResults.mockResolvedValue(1);

      const results = await service.search({
        q: 'test',
        type: SearchResultType.ALL,
        sortBy: SearchSortBy.RELEVANCE,
        page: 1,
        limit: 20,
      });

      expect(results.meta.total).toBe(2);
      expect(results.meta.topicCount).toBe(1);
      expect(results.meta.responseCount).toBe(1);
      expect(results.data).toHaveLength(2);
    });
  });
});
