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
 * Note: The original tsvector-based search was removed when the responses
 * `search_vector` column and its GIN index were dropped in migration
 * 20260320232632_add_verification_token_type. This implementation uses ILIKE
 * pattern matching on response content instead — consistent with
 * TopicsSearchService, which was rewritten the same way. ILIKE `%query%` scans
 * are backed by the `responses_content_trgm_idx` pg_trgm GIN index (recreated
 * in migration 20260710_restore_search_trgm_indexes), so they do not force a
 * sequential scan.
 */
@Injectable()
export class ResponsesSearchService {
  private readonly logger = new Logger(ResponsesSearchService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Full-text search using ILIKE pattern matching on response content.
   * Returns matching response IDs ordered by recency.
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
      const { whereClause, params, paramIndex } = this.buildWhereClause(query, topicId, authorId);
      params.push(limit, offset);

      const results = await this.prisma.$queryRawUnsafe<Array<{ id: string; rank: number }>>(
        `SELECT
          r.id::text,
          1.0::float8 as rank
        FROM responses r
        ${whereClause}
        ORDER BY r.created_at DESC
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
   * Returns enriched results suitable for display, with a highlighted snippet.
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
      const { whereClause, params, paramIndex } = this.buildWhereClause(query, topicId, authorId);
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
        }>
      >(
        `SELECT
          r.id::text,
          1.0::float8 as rank,
          r.content,
          r.author_id::text,
          r.topic_id::text,
          dt.title as topic_title,
          dt.slug as topic_slug,
          r.parent_id::text,
          r.created_at
        FROM responses r
        JOIN discussion_topics dt ON dt.id = r.topic_id
        ${whereClause}
        ORDER BY r.created_at DESC
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
        highlightedContent: this.buildHighlight(r.content, query),
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
      const { whereClause, params } = this.buildWhereClause(query, topicId, authorId);

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

  /**
   * Build the shared WHERE clause and bound parameter list for the ILIKE search.
   * Values are passed as bound parameters ($1, $2, ...) — never interpolated —
   * so the query is not vulnerable to SQL injection despite $queryRawUnsafe.
   */
  private buildWhereClause(
    query: string,
    topicId?: string,
    authorId?: string,
  ): { whereClause: string; params: (string | number)[]; paramIndex: number } {
    const searchPattern = `%${query}%`;
    let whereClause = `WHERE r.content ILIKE $1
        AND r.status = 'VISIBLE'
        AND r.deleted_at IS NULL`;

    const params: (string | number)[] = [searchPattern];
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

    return { whereClause, params, paramIndex };
  }

  /**
   * Build a highlighted snippet around the first occurrence of the query.
   * Replaces the DB-side ts_headline that is no longer available without the
   * tsvector column: extracts a context window and wraps matches in <mark>.
   */
  private buildHighlight(content: string, query: string): string {
    const trimmed = query.trim();
    if (!trimmed) {
      return content.length > 300 ? `${content.substring(0, 300)}…` : content;
    }

    // Escape regex metacharacters so the raw query is matched literally.
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    const matchIndex = content.search(regex);
    const windowRadius = 100;
    const start = matchIndex >= 0 ? Math.max(0, matchIndex - windowRadius) : 0;
    const end =
      matchIndex >= 0
        ? Math.min(content.length, matchIndex + trimmed.length + windowRadius)
        : Math.min(content.length, 300);

    let snippet = content.substring(start, end);
    if (start > 0) snippet = `…${snippet}`;
    if (end < content.length) snippet = `${snippet}…`;

    return snippet.replace(regex, (match) => `<mark>${match}</mark>`);
  }
}
