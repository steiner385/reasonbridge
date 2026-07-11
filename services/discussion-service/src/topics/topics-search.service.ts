/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiClientService } from '../clients/ai-client.service.js';

/**
 * Interface for duplicate topic suggestions
 */
export interface DuplicateSuggestion {
  id: string;
  title: string;
  description: string;
  similarityScore: number;
  matchType: 'exact' | 'trigram' | 'semantic';
}

/**
 * Service for topic search and duplicate detection
 * Feature 016: Topic Management (T010, T011)
 *
 * Uses hybrid approach:
 * 1. PostgreSQL tsvector for full-text search
 * 2. pg_trgm for trigram similarity (fast duplicate detection)
 * 3. AI embeddings for semantic similarity (fallback for borderline cases)
 */
@Injectable()
export class TopicsSearchService {
  private readonly logger = new Logger(TopicsSearchService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly aiClient: AiClientService,
  ) {}

  /**
   * Full-text search using ILIKE pattern matching
   * T010: Search across title and description
   *
   * Note: The original tsvector-based search was removed when the search_vector
   * column was dropped in migration 20260320232632_add_verification_token_type.
   * This implementation uses ILIKE for basic text matching.
   *
   * @param query - Search query string
   * @param limit - Maximum results to return
   * @returns Array of matching topic IDs with relevance scores
   */
  async fullTextSearch(
    query: string,
    limit: number = 20,
  ): Promise<Array<{ id: string; rank: number }>> {
    try {
      // Use ILIKE pattern matching with relevance ranking
      // Higher rank for title matches, lower for description matches
      const searchPattern = `%${query}%`;
      const results = await this.prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT
          id::text,
          CASE
            WHEN title ILIKE ${searchPattern} THEN 1.0
            WHEN description ILIKE ${searchPattern} THEN 0.5
            ELSE 0.0
          END as rank
        FROM discussion_topics
        WHERE (title ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
          AND status != 'ARCHIVED'
        ORDER BY rank DESC, created_at DESC
        LIMIT ${limit}
      `;

      this.logger.debug(`Full-text search for "${query}" returned ${results.length} results`);
      return results;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Full-text search failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Find similar topics using trigram similarity
   * T011: Duplicate detection - Step 1 (fast trigram matching)
   *
   * @param title - Topic title to check
   * @param description - Topic description to check
   * @param threshold - Similarity threshold (0.0-1.0, default 0.7)
   * @returns Array of similar topics with similarity scores
   */
  async findSimilarByTrigram(
    title: string,
    description: string,
    threshold: number = 0.7,
  ): Promise<DuplicateSuggestion[]> {
    try {
      // Use pg_trgm similarity for fast duplicate detection.
      //
      // The `title % $x` / `description % $x` predicates use the pg_trgm `%`
      // operator, which — unlike `similarity(a, b) > t` — can be answered by the
      // GIN trigram indexes (discussion_topics_title_trgm_idx /
      // discussion_topics_description_trgm_idx). It pre-filters candidates using
      // the index at the default similarity_threshold (0.3), then the explicit
      // `similarity(...) > threshold` predicates refine to the requested
      // precision (0.7 / 0.42). Since 0.3 is below both refine thresholds, the
      // index pre-filter never drops a row the refine step would keep — result
      // semantics are unchanged, but the scan is now index-backed instead of a
      // full sequential scan.
      const results = await this.prisma.$queryRaw<
        Array<{
          id: string;
          title: string;
          description: string;
          title_similarity: number;
          desc_similarity: number;
        }>
      >`
        SELECT
          id::text,
          title,
          description,
          similarity(title, ${title}) as title_similarity,
          similarity(description, ${description}) as desc_similarity
        FROM discussion_topics
        WHERE
          (title % ${title} OR description % ${description})
          AND (similarity(title, ${title}) > ${threshold}
           OR similarity(description, ${description}) > ${threshold * 0.6})
          AND status != 'ARCHIVED'
        ORDER BY
          GREATEST(similarity(title, ${title}), similarity(description, ${description})) DESC
        LIMIT 5
      `;

      // Map to DuplicateSuggestion format
      return results.map((result) => {
        // Title similarity weighted higher (70%) than description (30%)
        const combinedScore = result.title_similarity * 0.7 + result.desc_similarity * 0.3;

        return {
          id: result.id,
          title: result.title,
          description: result.description.substring(0, 200), // Truncate for display
          similarityScore: Math.round(combinedScore * 100) / 100,
          matchType: result.title_similarity > 0.9 ? 'exact' : 'trigram',
        };
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Trigram similarity search failed: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Find duplicate topics using hybrid approach
   * T011: Complete duplicate detection pipeline
   *
   * Step 1: Fast trigram matching (catches most duplicates)
   * Step 2: Semantic similarity for borderline cases (0.7-0.8 score)
   *
   * @param title - Topic title to check
   * @param description - Topic description to check
   * @returns Array of duplicate suggestions sorted by similarity
   */
  async findDuplicates(title: string, description: string): Promise<DuplicateSuggestion[]> {
    this.logger.debug(`Checking for duplicates: "${title.substring(0, 50)}..."`);

    // Step 1: Trigram matching (fast, catches exact and near-exact duplicates)
    const trigramMatches = await this.findSimilarByTrigram(title, description, 0.7);

    if (trigramMatches.length === 0) {
      this.logger.debug('No similar topics found via trigram search');
      return [];
    }

    // Step 2: For borderline cases (0.7-0.8 similarity), use semantic analysis
    const borderlineCases = trigramMatches.filter(
      (match) => match.similarityScore >= 0.7 && match.similarityScore < 0.8,
    );

    if (borderlineCases.length > 0) {
      this.logger.debug(
        `Found ${borderlineCases.length} borderline cases - applying semantic analysis`,
      );

      // Convert to AI client format and analyze
      const candidates = trigramMatches.map((match) => ({
        id: match.id,
        title: match.title,
        description: match.description,
        trigramScore: match.similarityScore,
      }));

      const semanticResult = await this.aiClient.analyzeDuplicates(title, description, candidates);

      // Map semantic results back to DuplicateSuggestion format
      const enhancedMatches: DuplicateSuggestion[] = semanticResult.results.map((result) => ({
        id: result.id,
        title: result.title,
        description: result.description,
        similarityScore: result.combinedScore,
        matchType: result.matchType,
      }));

      this.logger.log(
        `Semantic analysis complete (${semanticResult.analysisMethod}): ` +
          `${enhancedMatches.length} matches, top score: ${enhancedMatches[0]?.similarityScore ?? 0}`,
      );

      return enhancedMatches;
    }

    // No borderline cases - return trigram results sorted by score
    const sortedMatches = trigramMatches.sort((a, b) => b.similarityScore - a.similarityScore);

    this.logger.log(
      `Found ${sortedMatches.length} potential duplicates with scores: ${sortedMatches.map((m) => m.similarityScore).join(', ')}`,
    );

    return sortedMatches;
  }

  /**
   * Check if a topic title is unique enough
   * T011: Helper method for topic creation validation
   *
   * @param title - Topic title to check
   * @param description - Topic description to check
   * @param strictMode - If true, reject similarity >0.8, otherwise >0.9
   * @returns True if unique enough, false if too similar to existing topic
   */
  async isUniqueEnough(
    title: string,
    description: string,
    strictMode: boolean = true,
  ): Promise<{ isUnique: boolean; suggestions: DuplicateSuggestion[] }> {
    const duplicates = await this.findDuplicates(title, description);

    if (duplicates.length === 0) {
      return { isUnique: true, suggestions: [] };
    }

    const threshold = strictMode ? 0.8 : 0.9;
    const tooSimilar = duplicates[0]!.similarityScore >= threshold;

    return {
      isUnique: !tooSimilar,
      suggestions: tooSimilar ? duplicates : [],
    };
  }
}
