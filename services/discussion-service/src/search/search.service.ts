/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TopicsSearchService } from '../topics/topics-search.service.js';
import { ResponsesSearchService } from '../responses/responses-search.service.js';
import { SearchCacheService } from './search-cache.service.js';
import {
  UnifiedSearchQueryDto,
  SearchResultType,
  SearchSortBy,
} from './dto/unified-search-query.dto.js';
import {
  UnifiedSearchResultsDto,
  TopicSearchResultDto,
  ResponseSearchResultDto,
  SearchResultItemType,
} from './dto/unified-search-results.dto.js';

/**
 * Service for unified search across topics and responses
 * Feature #1040: Full-Text Search for Discussions
 *
 * Combines PostgreSQL tsvector search for both topics and responses,
 * merges results by relevance score, and supports filtering and pagination.
 * Results are cached for 5 minutes to reduce database load.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TopicsSearchService) private readonly topicsSearchService: TopicsSearchService,
    @Inject(ResponsesSearchService) private readonly responsesSearchService: ResponsesSearchService,
    @Optional() @Inject(SearchCacheService) private readonly cacheService?: SearchCacheService,
  ) {}

  /**
   * Execute unified search across topics and responses
   *
   * @param query - Search query parameters
   * @returns Combined, ranked search results with metadata
   */
  async search(query: UnifiedSearchQueryDto): Promise<UnifiedSearchResultsDto> {
    const {
      q,
      type = SearchResultType.ALL,
      topicId,
      authorId,
      dateFrom,
      dateTo,
      sortBy = SearchSortBy.RELEVANCE,
      page = 1,
      limit = 20,
    } = query;

    this.logger.debug(`Unified search: "${q}" type=${type} page=${page} limit=${limit}`);

    // Check cache first
    if (this.cacheService) {
      const cached = await this.cacheService.get(query);
      if (cached) {
        this.logger.debug('Returning cached search results');
        return cached;
      }
    }

    // Calculate how many results to fetch from each source
    // Fetch more than needed to allow for merging and re-ranking
    const fetchLimit = limit * 3;
    const offset = (page - 1) * limit;

    // Execute searches in parallel based on type filter
    const [topicResults, responseResults] = await Promise.all([
      type === SearchResultType.RESPONSES
        ? Promise.resolve({ items: [], total: 0 })
        : this.searchTopics(q, { authorId, dateFrom, dateTo, limit: fetchLimit }),
      type === SearchResultType.TOPICS
        ? Promise.resolve({ items: [], total: 0 })
        : this.searchResponses(q, { topicId, authorId, dateFrom, dateTo, limit: fetchLimit }),
    ]);

    // Merge and normalize scores
    // Topic scores and response scores need normalization since they use different ranking
    const allResults: (TopicSearchResultDto | ResponseSearchResultDto)[] = [];

    // Normalize scores to 0-1 range
    const maxTopicScore = Math.max(...topicResults.items.map((t) => t.score), 0.001);
    const maxResponseScore = Math.max(...responseResults.items.map((r) => r.score), 0.001);

    for (const topic of topicResults.items) {
      allResults.push({
        ...topic,
        score: topic.score / maxTopicScore, // Normalize to 0-1
      });
    }

    for (const response of responseResults.items) {
      allResults.push({
        ...response,
        score: response.score / maxResponseScore, // Normalize to 0-1
      });
    }

    // Sort by score (relevance) or date
    if (sortBy === SearchSortBy.RELEVANCE) {
      allResults.sort((a, b) => b.score - a.score);
    } else {
      allResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Apply pagination
    const paginatedResults = allResults.slice(offset, offset + limit);

    // Calculate totals
    const total = topicResults.total + responseResults.total;
    const totalPages = Math.ceil(total / limit);

    const results: UnifiedSearchResultsDto = {
      data: paginatedResults,
      meta: {
        total,
        topicCount: topicResults.total,
        responseCount: responseResults.total,
        page,
        limit,
        totalPages,
        query: q,
      },
    };

    // Cache results for future requests
    if (this.cacheService) {
      // Fire and forget - don't block on caching
      this.cacheService.set(query, results).catch((err) => {
        this.logger.warn(`Failed to cache search results: ${err.message}`);
      });
    }

    return results;
  }

  /**
   * Search topics with full-text search
   */
  private async searchTopics(
    query: string,
    options: { authorId?: string; dateFrom?: string; dateTo?: string; limit: number },
  ): Promise<{ items: TopicSearchResultDto[]; total: number }> {
    try {
      // Use TopicsSearchService for full-text search
      const searchResults = await this.topicsSearchService.fullTextSearch(query, options.limit);

      if (searchResults.length === 0) {
        return { items: [], total: 0 };
      }

      // Create rank map for ordering
      const rankMap = new Map(searchResults.map((r) => [r.id, r.rank]));
      const topicIds = searchResults.map((r) => r.id);

      // Build where clause with optional filters
      const where: any = {
        id: { in: topicIds },
        status: { not: 'ARCHIVED' },
      };

      if (options.authorId) {
        where.creatorId = options.authorId;
      }

      if (options.dateFrom) {
        where.createdAt = { ...where.createdAt, gte: new Date(options.dateFrom) };
      }

      if (options.dateTo) {
        where.createdAt = { ...where.createdAt, lte: new Date(options.dateTo) };
      }

      // Fetch topic details
      const topics = await this.prisma.discussionTopic.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Map to DTOs with scores
      const items: TopicSearchResultDto[] = topics.map((topic) => ({
        type: SearchResultItemType.TOPIC,
        id: topic.id,
        score: rankMap.get(topic.id) ?? 0,
        createdAt: topic.createdAt,
        title: topic.title,
        description:
          topic.description.substring(0, 200) + (topic.description.length > 200 ? '...' : ''),
        slug: topic.slug,
        status: topic.status,
        responseCount: topic.responseCount,
        participantCount: topic.participantCount,
        tags: topic.tags.map((tt) => tt.tag.name),
      }));

      // Sort by rank
      items.sort((a, b) => b.score - a.score);

      return { items, total: topics.length };
    } catch (error) {
      this.logger.error(`Topic search failed: ${(error as Error).message}`);
      return { items: [], total: 0 };
    }
  }

  /**
   * Search responses with full-text search
   */
  private async searchResponses(
    query: string,
    options: {
      topicId?: string;
      authorId?: string;
      dateFrom?: string;
      dateTo?: string;
      limit: number;
    },
  ): Promise<{ items: ResponseSearchResultDto[]; total: number }> {
    try {
      // Use ResponsesSearchService for search with context
      const results = await this.responsesSearchService.searchWithContext(query, {
        topicId: options.topicId,
        authorId: options.authorId,
        limit: options.limit,
      });

      // Apply date filters (not supported directly in search service)
      let filteredResults = results;
      if (options.dateFrom) {
        const fromDate = new Date(options.dateFrom);
        filteredResults = filteredResults.filter((r) => new Date(r.createdAt) >= fromDate);
      }
      if (options.dateTo) {
        const toDate = new Date(options.dateTo);
        filteredResults = filteredResults.filter((r) => new Date(r.createdAt) <= toDate);
      }

      // Map to DTOs
      const items: ResponseSearchResultDto[] = filteredResults.map((r) => ({
        type: SearchResultItemType.RESPONSE,
        id: r.id,
        score: r.rank,
        createdAt: r.createdAt,
        content: r.content.substring(0, 300) + (r.content.length > 300 ? '...' : ''),
        highlightedContent: r.highlightedContent,
        authorId: r.authorId,
        topicId: r.topicId,
        topicTitle: r.topicTitle,
        topicSlug: r.topicSlug,
        parentId: r.parentId,
      }));

      // Get total count
      const total = await this.responsesSearchService.countSearchResults(query, {
        topicId: options.topicId,
        authorId: options.authorId,
      });

      return { items, total };
    } catch (error) {
      this.logger.error(`Response search failed: ${(error as Error).message}`);
      return { items: [], total: 0 };
    }
  }
}
