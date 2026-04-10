/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../cache/embedding.service.js';

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
 * Service for detecting duplicate topics using semantic similarity
 * Feature 016: Topic Management (T221)
 *
 * Uses OpenAI embeddings to compute semantic similarity between topic
 * descriptions, providing more accurate duplicate detection for borderline
 * cases where trigram similarity alone is insufficient.
 *
 * The service computes cosine similarity between embedding vectors to
 * determine how semantically similar two texts are, regardless of exact
 * word matches.
 */
@Injectable()
export class TopicDuplicateDetectorService {
  private readonly logger = new Logger(TopicDuplicateDetectorService.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  /**
   * Compute cosine similarity between two embedding vectors
   *
   * Cosine similarity measures the angle between two vectors,
   * returning a value between -1 and 1. For normalized embeddings
   * from OpenAI, this typically ranges from 0 to 1.
   *
   * @param vecA First embedding vector
   * @param vecB Second embedding vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i]! * vecB[i]!;
      normA += vecA[i]! * vecA[i]!;
      normB += vecB[i]! * vecB[i]!;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Combine title and description for embedding generation
   * Title is weighted higher by being prepended
   */
  private combineTopicText(title: string, description: string): string {
    return `${title}\n\n${description}`;
  }

  /**
   * Compute semantic similarity between two topics
   *
   * @param titleA First topic title
   * @param descriptionA First topic description
   * @param titleB Second topic title
   * @param descriptionB Second topic description
   * @returns Semantic similarity score (0-1), or null if embeddings unavailable
   */
  async computeSemanticSimilarity(
    titleA: string,
    descriptionA: string,
    titleB: string,
    descriptionB: string,
  ): Promise<number | null> {
    const textA = this.combineTopicText(titleA, descriptionA);
    const textB = this.combineTopicText(titleB, descriptionB);

    const [embeddingA, embeddingB] = await Promise.all([
      this.embeddingService.findEmbedding(textA),
      this.embeddingService.findEmbedding(textB),
    ]);

    if (!embeddingA || !embeddingB) {
      this.logger.debug('Embeddings unavailable, cannot compute semantic similarity');
      return null;
    }

    const similarity = this.cosineSimilarity(embeddingA, embeddingB);
    return Math.round(similarity * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Analyze candidate duplicates using semantic similarity
   *
   * This method takes candidates identified by trigram matching
   * and enhances the similarity scores using semantic analysis.
   * Particularly useful for borderline cases (0.7-0.8 trigram score).
   *
   * @param newTitle Title of the new topic being created
   * @param newDescription Description of the new topic
   * @param candidates Existing topics that trigram matching flagged as potential duplicates
   * @returns Enhanced similarity results with semantic scores
   */
  async analyzeCandidates(
    newTitle: string,
    newDescription: string,
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

    this.logger.debug(
      `Analyzing ${candidates.length} candidate duplicates for "${newTitle.substring(0, 50)}..."`,
    );

    // Compute semantic similarity for each candidate
    const results: SemanticSimilarityResult[] = [];
    let usedSemantic = false;

    for (const candidate of candidates) {
      const semanticScore = await this.computeSemanticSimilarity(
        newTitle,
        newDescription,
        candidate.title,
        candidate.description,
      );

      if (semanticScore !== null) {
        usedSemantic = true;
        // Combined score: 40% trigram, 60% semantic
        // Semantic is weighted higher as it captures meaning better
        const combinedScore =
          Math.round((candidate.trigramScore * 0.4 + semanticScore * 0.6) * 100) / 100;

        results.push({
          id: candidate.id,
          title: candidate.title,
          description: candidate.description.substring(0, 200),
          trigramScore: candidate.trigramScore,
          semanticScore,
          combinedScore,
          matchType: 'semantic',
        });
      } else {
        // Fallback to trigram-only if semantic unavailable
        results.push({
          id: candidate.id,
          title: candidate.title,
          description: candidate.description.substring(0, 200),
          trigramScore: candidate.trigramScore,
          semanticScore: candidate.trigramScore, // Use trigram as fallback
          combinedScore: candidate.trigramScore,
          matchType: 'trigram',
        });
      }
    }

    // Sort by combined score descending
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    // Determine if there are duplicates based on threshold
    const threshold = 0.8;
    const hasDuplicates = results.length > 0 && results[0]!.combinedScore >= threshold;

    this.logger.log(
      `Duplicate analysis complete: ${results.length} candidates, ` +
        `top score: ${results[0]?.combinedScore ?? 0}, ` +
        `method: ${usedSemantic ? 'semantic' : 'trigram-only'}`,
    );

    return {
      hasDuplicates,
      results,
      threshold,
      analysisMethod: usedSemantic ? 'semantic' : 'trigram-only',
    };
  }

  /**
   * Quick check if semantic analysis is available
   * Useful for deciding whether to call this service
   */
  async isSemanticAnalysisAvailable(): Promise<boolean> {
    // Try to get an embedding for a test string
    const testEmbedding = await this.embeddingService.findEmbedding('test');
    return testEmbedding !== null;
  }
}
