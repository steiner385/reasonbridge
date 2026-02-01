import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service.js';
import { QdrantService } from './qdrant.service.js';
import { RedisCacheService } from './redis-cache.service.js';
import { computeContentHash } from './hash.util.js';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import type { FeedbackMetadata, CacheLookupResult } from './types.js';

const DEFAULT_SIMILARITY_THRESHOLD = 0.95;

/**
 * Semantic cache service that orchestrates Redis exact-match and Qdrant similarity caches.
 *
 * Lookup order:
 * 1. Redis for exact content hash match (fastest, O(1))
 * 2. Qdrant for semantic similarity match (>=95% default threshold)
 * 3. Fresh analysis via provided analyzer function
 *
 * After fresh analysis, caches are populated asynchronously to avoid blocking the response.
 */
@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly similarityThreshold: number;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService,
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.similarityThreshold = parseFloat(
      process.env['SIMILARITY_THRESHOLD'] || String(DEFAULT_SIMILARITY_THRESHOLD),
    );
  }

  /**
   * Get cached feedback or run analysis.
   *
   * Lookup order: Redis (exact) -> Qdrant (similarity) -> fresh analysis
   *
   * @param content - The content to analyze
   * @param analyzeFunc - Function to call for fresh analysis on cache miss
   * @param topicId - Optional topic ID for metadata
   * @returns Analysis result from cache or fresh analysis
   */
  async getOrAnalyze(
    content: string,
    analyzeFunc: () => Promise<AnalysisResult>,
    topicId?: string,
  ): Promise<AnalysisResult> {
    const contentHash = computeContentHash(content);

    // 1. Check Redis for exact match (fastest path)
    const redisResult = await this.redisCacheService.getFeedback(contentHash);
    if (redisResult) {
      this.logger.debug('Cache hit: Redis exact match');
      return redisResult;
    }

    // 2. Try Qdrant similarity search (only if embeddings are available)
    let embedding: number[] | null = null;
    try {
      embedding = await this.embeddingService.getEmbedding(content);
      if (embedding) {
        const qdrantResult = await this.qdrantService.searchSimilar(
          embedding,
          this.similarityThreshold,
        );

        if (qdrantResult) {
          this.logger.debug(`Cache hit: Qdrant similarity ${qdrantResult.similarity?.toFixed(3)}`);
          // Also cache in Redis for faster future lookups
          this.cacheInRedisAsync(contentHash, qdrantResult.result);
          return qdrantResult.result;
        }
      }
    } catch (error) {
      this.logger.warn('Similarity search failed, falling back to analysis', error);
    }

    // 3. Cache miss - run fresh analysis
    this.logger.debug('Cache miss: running fresh analysis');
    const result = await analyzeFunc();

    // 4. Async cache population (don't block response)
    this.populateCachesAsync(contentHash, content, result, embedding, topicId);

    return result;
  }

  /**
   * Get cache lookup result without running analysis (for metrics/debugging).
   *
   * @param content - The content to look up
   * @returns Cache lookup result with hit status and source
   */
  async lookup(content: string): Promise<CacheLookupResult> {
    const contentHash = computeContentHash(content);

    // Check Redis
    const redisResult = await this.redisCacheService.getFeedback(contentHash);
    if (redisResult) {
      return { hit: true, source: 'redis', result: redisResult };
    }

    // Check Qdrant (only if embeddings are available)
    try {
      const embedding = await this.embeddingService.getEmbedding(content);
      if (embedding) {
        const qdrantResult = await this.qdrantService.searchSimilar(
          embedding,
          this.similarityThreshold,
        );

        if (qdrantResult) {
          return {
            hit: true,
            source: 'qdrant',
            result: qdrantResult.result,
            similarity: qdrantResult.similarity,
          };
        }
      }
    } catch {
      // Ignore errors for lookup
    }

    return { hit: false, source: 'none' };
  }

  /**
   * Async cache population (fire-and-forget).
   * Populates both Redis (exact match) and Qdrant (similarity) caches.
   */
  private populateCachesAsync(
    contentHash: string,
    content: string,
    result: AnalysisResult,
    embedding: number[] | null,
    topicId?: string,
  ): void {
    // Don't await - fire and forget
    Promise.all([
      this.redisCacheService.setFeedback(contentHash, result),
      this.storeInQdrantAsync(contentHash, content, result, embedding, topicId),
    ]).catch((error) => {
      this.logger.error('Async cache population failed', error);
    });
  }

  /**
   * Store result in Qdrant with embedding and metadata.
   * Skips storage if embeddings are unavailable.
   */
  private async storeInQdrantAsync(
    contentHash: string,
    content: string,
    result: AnalysisResult,
    embedding: number[] | null,
    topicId?: string,
  ): Promise<void> {
    try {
      // Get or generate embedding
      const vectorEmbedding = embedding ?? (await this.embeddingService.getEmbedding(content));

      // Skip Qdrant storage if embeddings are not available
      if (!vectorEmbedding) {
        this.logger.debug('Skipping Qdrant storage - embeddings not available');
        return;
      }

      const metadata: FeedbackMetadata = {
        contentHash,
        feedbackType: result.type,
        subtype: result.subtype ?? null,
        suggestionText: result.suggestionText,
        reasoning: result.reasoning,
        confidenceScore: result.confidenceScore,
        topicId: topicId ?? null,
        createdAt: new Date().toISOString(),
      };

      await this.qdrantService.store(vectorEmbedding, result, metadata);
    } catch (error) {
      this.logger.error('Failed to store in Qdrant', error);
    }
  }

  /**
   * Cache result in Redis asynchronously.
   */
  private cacheInRedisAsync(contentHash: string, result: AnalysisResult): void {
    this.redisCacheService.setFeedback(contentHash, result).catch((error) => {
      this.logger.error('Failed to cache in Redis', error);
    });
  }
}
