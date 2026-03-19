/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Interface for response search results with context
 */
export interface ResponseSearchResult {
  id: string;
  rank: number;
  content: string;
  authorId: string;
  topicId: string;
  topicTitle: string;
  topicSlug: string;
  parentId: string | null;
  createdAt: Date;
  highlightedContent?: string;
}

/**
 * Options for response full-text search
 */
export interface ResponseSearchOptions {
  topicId?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Service for response search functionality
 * Feature #1040: Full-Text Search for Discussions
 *
 * Uses PostgreSQL tsvector for full-text search on response content.
 * Supports filtering by topic, author, and pagination.
 */
@Injectable()
export class ResponsesSearchService {
  private readonly logger = new Logger(ResponsesSearchService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Full-text search using PostgreSQL tsvector
   * Searches response content and returns ranked results
   *
   * @param query - Search query string
   * @param options - Search options (topicId, authorId, limit, offset)
   * @returns Array of matching response IDs with relevance scores
   */
  async fullTextSearch(
    query: string,
    options: ResponseSearchOptions = {},
  ): Promise<Array<{ id: string; rank: number }>> {
    const { topicId, authorId, limit = 20, offset = 0 } = options;

    try {
      // Build dynamic WHERE clause based on options
      let whereClause = `WHERE r.search_vector @@ plainto_tsquery('english', $1)
        AND r.status = 'VISIBLE'
        AND r.deleted_at IS NULL`;

      const params: (string | number)[] = [query];
      let paramIndex = 2;

      if (topicId) {
        whereClause += ` AND r.topic_id = $${paramIndex}::uuid`;
        params.push(topicId);
        paramIndex++;
      }

      if (authorId) {
        whereClause += ` AND r.author_id = $${paramIndex}::uuid`;
        params.push(authorId);
        paramIndex++;
      }

      params.push(limit, offset);

      const results = await this.prisma.$queryRawUnsafe<Array<{ id: string; rank: number }>>(
        `SELECT
          r.id::text,
          ts_rank(r.search_vector, plainto_tsquery('english', $1)) as rank
        FROM responses r
        ${whereClause}
        ORDER BY rank DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}`,
        ...params,
      );

      this.logger.debug(`Full-text search for "${query}" returned ${results.length} results`);
      return results;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Response full-text search failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Search responses with full context (topic info, author, etc.)
   * Returns enriched results suitable for display
   *
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of response search results with context
   */
  async searchWithContext(
    query: string,
    options: ResponseSearchOptions = {},
  ): Promise<ResponseSearchResult[]> {
    const { topicId, authorId, limit = 20, offset = 0 } = options;

    try {
      // Build dynamic WHERE clause
      let whereClause = `WHERE r.search_vector @@ plainto_tsquery('english', $1)
        AND r.status = 'VISIBLE'
        AND r.deleted_at IS NULL`;

      const params: (string | number)[] = [query];
      let paramIndex = 2;

      if (topicId) {
        whereClause += ` AND r.topic_id = $${paramIndex}::uuid`;
        params.push(topicId);
        paramIndex++;
      }

      if (authorId) {
        whereClause += ` AND r.author_id = $${paramIndex}::uuid`;
        params.push(authorId);
        paramIndex++;
      }

      params.push(limit, offset);

      const results = await this.prisma.$queryRawUnsafe<
        Array<{
          id: string;
          rank: number;
          content: string;
          author_id: string;
          topic_id: string;
          topic_title: string;
          topic_slug: string;
          parent_id: string | null;
          created_at: Date;
          highlighted_content: string;
        }>
      >(
        `SELECT
          r.id::text,
          ts_rank(r.search_vector, plainto_tsquery('english', $1)) as rank,
          r.content,
          r.author_id::text,
          r.topic_id::text,
          dt.title as topic_title,
          dt.slug as topic_slug,
          r.parent_id::text,
          r.created_at,
          ts_headline('english', r.content, plainto_tsquery('english', $1),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlighted_content
        FROM responses r
        JOIN discussion_topics dt ON dt.id = r.topic_id
        ${whereClause}
        ORDER BY rank DESC
        LIMIT $${paramIndex}
        OFFSET $${paramIndex + 1}`,
        ...params,
      );

      this.logger.debug(`Search with context for "${query}" returned ${results.length} results`);

      return results.map((r) => ({
        id: r.id,
        rank: r.rank,
        content: r.content,
        authorId: r.author_id,
        topicId: r.topic_id,
        topicTitle: r.topic_title,
        topicSlug: r.topic_slug,
        parentId: r.parent_id,
        createdAt: r.created_at,
        highlightedContent: r.highlighted_content,
      }));
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Response search with context failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Count total results for a search query (for pagination)
   *
   * @param query - Search query string
   * @param options - Search options (topicId, authorId)
   * @returns Total count of matching responses
   */
  async countSearchResults(
    query: string,
    options: Pick<ResponseSearchOptions, 'topicId' | 'authorId'> = {},
  ): Promise<number> {
    const { topicId, authorId } = options;

    try {
      let whereClause = `WHERE r.search_vector @@ plainto_tsquery('english', $1)
        AND r.status = 'VISIBLE'
        AND r.deleted_at IS NULL`;

      const params: string[] = [query];
      let paramIndex = 2;

      if (topicId) {
        whereClause += ` AND r.topic_id = $${paramIndex}::uuid`;
        params.push(topicId);
        paramIndex++;
      }

      if (authorId) {
        whereClause += ` AND r.author_id = $${paramIndex}::uuid`;
        params.push(authorId);
      }

      const result = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*) as count FROM responses r ${whereClause}`,
        ...params,
      );

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Response count search failed: ${err.message}`, err.stack);
      throw error;
    }
  }
}
