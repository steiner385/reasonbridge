/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full-text search using PostgreSQL tsvector
   * T010: Fast search across title and description
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
      // Use PostgreSQL tsvector search with ranking
      const results = await this.prisma.$queryRaw<Array<{ id: string; rank: number }>>`
        SELECT
          id::text,
          ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
        FROM discussion_topics
        WHERE search_vector @@ plainto_tsquery('english', ${query})
          AND status != 'ARCHIVED'
        ORDER BY rank DESC
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
      // Use pg_trgm similarity for fast duplicate detection
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
          (similarity(title, ${title}) > ${threshold}
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

    // Step 2: For borderline cases (0.7-0.8 similarity), use semantic check
    // This is where we would integrate AI embeddings for semantic similarity
    // For now, return trigram results (semantic matching is TODO for AI service integration)
    const borderlineCases = trigramMatches.filter(
      (match) => match.similarityScore >= 0.7 && match.similarityScore < 0.8,
    );

    if (borderlineCases.length > 0) {
      this.logger.debug(
        `Found ${borderlineCases.length} borderline cases that could benefit from semantic analysis`,
      );
      // TODO: Call AI service for semantic similarity on borderline cases
      // const semanticScores = await this.aiService.compareSimilarity(description, borderlineCases);
    }

    // Return all matches sorted by similarity score
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
