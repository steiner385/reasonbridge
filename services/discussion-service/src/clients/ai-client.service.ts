/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { getServiceUrl } from '@reason-bridge/common';

/**
 * Candidate topic for duplicate comparison
 */
export interface DuplicateCandidate {
  id: string;
  title: string;
  description: string;
  trigramScore: number;
}

/**
 * Result of semantic similarity analysis
 */
export interface SemanticSimilarityResult {
  id: string;
  title: string;
  description: string;
  trigramScore: number;
  semanticScore: number;
  combinedScore: number;
  matchType: 'semantic' | 'trigram';
}

/**
 * Response from the duplicate detection endpoint
 */
export interface DuplicateDetectionResult {
  hasDuplicates: boolean;
  results: SemanticSimilarityResult[];
  threshold: number;
  analysisMethod: 'semantic' | 'trigram-only';
}

/**
 * Semantic availability response
 */
export interface SemanticAvailabilityResult {
  available: boolean;
  reason?: string;
}

/**
 * HTTP client for communicating with the ai-service.
 *
 * @remarks
 * Provides semantic similarity analysis for topic duplicate detection.
 * Uses OpenAI embeddings to compute meaning-based similarity beyond
 * simple text matching.
 *
 * Endpoints used:
 * - POST /topic-duplicate/analyze - Analyze candidates for semantic similarity
 * - GET /topic-duplicate/availability - Check if semantic analysis is available
 *
 * @example
 * ```typescript
 * // Check availability first
 * const { available } = await aiClient.checkSemanticAvailability();
 *
 * if (available) {
 *   // Analyze candidates
 *   const result = await aiClient.analyzeDuplicates(title, description, candidates);
 *   if (result.hasDuplicates) {
 *     // Handle duplicates
 *   }
 * }
 * ```
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env['AI_SERVICE_URL'] || getServiceUrl('AI_SERVICE');
    this.timeoutMs = parseInt(process.env['AI_SERVICE_TIMEOUT_MS'] || '5000', 10);
  }

  /**
   * Check if semantic analysis is available
   *
   * @returns Availability status
   *
   * @remarks
   * Call this before analyzeDuplicates to determine whether to use
   * semantic analysis or fall back to trigram-only matching.
   */
  async checkSemanticAvailability(): Promise<SemanticAvailabilityResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/topic-duplicate/availability`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(
          `AI service availability check failed: ${response.status} ${response.statusText}`,
        );
        return { available: false, reason: 'Service returned error' };
      }

      const result = (await response.json()) as SemanticAvailabilityResult;
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('AI service availability check timed out');
        return { available: false, reason: 'Service timeout' };
      }

      this.logger.warn(
        `Error checking AI service availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { available: false, reason: 'Service unavailable' };
    }
  }

  /**
   * Analyze candidate topics for semantic similarity
   *
   * @param title - Title of the new topic being checked
   * @param description - Description of the new topic
   * @param candidates - Candidates identified by trigram matching
   * @returns Duplicate detection results with semantic scores
   *
   * @remarks
   * Takes candidates identified by trigram matching and enhances
   * similarity scores using AI embeddings. The combined score weights
   * semantic similarity higher (60%) than trigram (40%) since semantic
   * analysis better captures meaning.
   *
   * Falls back to trigram-only results if the AI service is unavailable.
   */
  async analyzeDuplicates(
    title: string,
    description: string,
    candidates: DuplicateCandidate[],
  ): Promise<DuplicateDetectionResult> {
    if (candidates.length === 0) {
      return {
        hasDuplicates: false,
        results: [],
        threshold: 0.8,
        analysisMethod: 'semantic',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/topic-duplicate/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, candidates }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.warn(
          `AI service duplicate analysis failed: ${response.status} ${response.statusText}`,
        );
        return this.fallbackToTrigramOnly(candidates);
      }

      const result = (await response.json()) as DuplicateDetectionResult;

      this.logger.debug(
        `Semantic analysis complete: ${result.results.length} candidates, ` +
          `method: ${result.analysisMethod}, hasDuplicates: ${result.hasDuplicates}`,
      );

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.warn('AI service duplicate analysis timed out');
      } else {
        this.logger.warn(
          `Error calling AI service for duplicate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return this.fallbackToTrigramOnly(candidates);
    }
  }

  /**
   * Fallback to trigram-only results when AI service is unavailable
   */
  private fallbackToTrigramOnly(candidates: DuplicateCandidate[]): DuplicateDetectionResult {
    const threshold = 0.8;
    const results: SemanticSimilarityResult[] = candidates.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description.substring(0, 200),
      trigramScore: c.trigramScore,
      semanticScore: c.trigramScore, // Use trigram as fallback
      combinedScore: c.trigramScore,
      matchType: 'trigram' as const,
    }));

    results.sort((a, b) => b.combinedScore - a.combinedScore);
    const hasDuplicates = results.length > 0 && results[0]!.combinedScore >= threshold;

    this.logger.debug('Falling back to trigram-only results (AI service unavailable)');

    return {
      hasDuplicates,
      results,
      threshold,
      analysisMethod: 'trigram-only',
    };
  }
}
