/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ResponsesSearchService } from './responses-search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ResponsesSearchService', () => {
  let service: ResponsesSearchService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponsesSearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ResponsesSearchService>(ResponsesSearchService);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe('fullTextSearch', () => {
    it('should return search results with ranks', async () => {
      const mockResults = [
        { id: 'response-1', rank: 0.9 },
        { id: 'response-2', rank: 0.7 },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResults);

      const results = await service.fullTextSearch('test query');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 'response-1', rank: 0.9 });
      expect(results[1]).toEqual({ id: 'response-2', rank: 0.7 });
    });

    it('should filter by topicId when provided', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.fullTextSearch('test', { topicId: 'topic-123' });

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
      const sqlArg = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlArg).toContain('topic_id');
    });

    it('should filter by authorId when provided', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.fullTextSearch('test', { authorId: 'author-123' });

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
      const sqlArg = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlArg).toContain('author_id');
    });

    it('should return empty array when no results', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      const results = await service.fullTextSearch('nonexistent query');

      expect(results).toHaveLength(0);
    });

    it('should respect limit and offset', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([]);

      await service.fullTextSearch('test', { limit: 10, offset: 20 });

      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
      // Check that limit and offset are passed as parameters
      const args = mockPrismaService.$queryRawUnsafe.mock.calls[0];
      expect(args).toContain(10); // limit
      expect(args).toContain(20); // offset
    });
  });

  describe('searchWithContext', () => {
    it('should return results with topic context', async () => {
      const mockResults = [
        {
          id: 'response-1',
          rank: 0.9,
          content: 'Test content about climate change',
          author_id: 'author-1',
          topic_id: 'topic-1',
          topic_title: 'Climate Discussion',
          topic_slug: 'climate-discussion',
          parent_id: null,
          created_at: new Date('2025-01-01'),
          highlighted_content: 'Test content about <mark>climate change</mark>',
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResults);

      const results = await service.searchWithContext('climate change');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'response-1',
        rank: 0.9,
        content: 'Test content about climate change',
        authorId: 'author-1',
        topicId: 'topic-1',
        topicTitle: 'Climate Discussion',
        topicSlug: 'climate-discussion',
        parentId: null,
        createdAt: expect.any(Date),
        highlightedContent: 'Test content about <mark>climate change</mark>',
      });
    });
  });

  describe('countSearchResults', () => {
    it('should return total count of matching results', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: BigInt(42) }]);

      const count = await service.countSearchResults('test query');

      expect(count).toBe(42);
    });

    it('should return 0 when no results', async () => {
      mockPrismaService.$queryRawUnsafe.mockResolvedValue([{ count: BigInt(0) }]);

      const count = await service.countSearchResults('nonexistent');

      expect(count).toBe(0);
    });
  });
});
