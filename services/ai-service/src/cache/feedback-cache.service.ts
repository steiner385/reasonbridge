import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { FeedbackType } from '@reason-bridge/db-models';
import { FeedbackSensitivity } from '../feedback/dto/index.js';

/**
 * Cached feedback analysis result
 * Stores the analysis output for quick retrieval on cache hits
 */
export interface CachedFeedbackResult {
  type: FeedbackType;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources: string[] | null;
  cachedAt: string;
}

/**
 * Service for caching feedback analysis results in Redis
 *
 * Cache key format: feedback:{contentHash}:{sensitivity}
 * - Content is normalized (trimmed, lowercased) before hashing
 * - Sensitivity included because threshold affects displayed results
 *
 * Graceful degradation: Redis failures don't block feedback generation
 */
@Injectable()
export class FeedbackCacheService {
  private readonly logger = new Logger(FeedbackCacheService.name);
  private readonly keyPrefix = 'feedback';

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  /**
   * Generate a deterministic cache key for content + sensitivity combination
   * @param content The response content to analyze
   * @param sensitivity The feedback sensitivity level
   * @returns Cache key string
   */
  generateCacheKey(content: string, sensitivity: FeedbackSensitivity): string {
    const normalizedContent = content.trim().toLowerCase();
    const contentHash = createHash('sha256').update(normalizedContent).digest('hex');
    return `${this.keyPrefix}:${contentHash}:${sensitivity}`;
  }

  /**
   * Retrieve cached feedback result if available
   * @param content The response content
   * @param sensitivity The feedback sensitivity level
   * @returns Cached result or null if not found/error
   */
  async getCachedFeedback(
    content: string,
    sensitivity: FeedbackSensitivity,
  ): Promise<CachedFeedbackResult | null> {
    try {
      const key = this.generateCacheKey(content, sensitivity);
      const cached = await this.cache.get<CachedFeedbackResult>(key);

      if (cached) {
        this.logger.debug(`Cache hit for key: ${key.substring(0, 50)}...`);
        return cached;
      }

      this.logger.debug(`Cache miss for key: ${key.substring(0, 50)}...`);
      return null;
    } catch (error) {
      this.logger.warn(`Cache get failed, proceeding without cache: ${error}`);
      return null;
    }
  }

  /**
   * Store feedback result in cache
   * @param content The response content
   * @param sensitivity The feedback sensitivity level
   * @param result The analysis result to cache
   */
  async cacheFeedback(
    content: string,
    sensitivity: FeedbackSensitivity,
    result: Omit<CachedFeedbackResult, 'cachedAt'>,
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(content, sensitivity);
      const cacheEntry: CachedFeedbackResult = {
        ...result,
        cachedAt: new Date().toISOString(),
      };

      await this.cache.set(key, cacheEntry);
      this.logger.debug(`Cached feedback for key: ${key.substring(0, 50)}...`);
    } catch (error) {
      this.logger.warn(`Cache set failed, continuing without caching: ${error}`);
    }
  }

  /**
   * Invalidate a specific cache entry
   * Useful for testing and admin operations
   * @param content The response content
   * @param sensitivity The feedback sensitivity level
   */
  async invalidate(content: string, sensitivity: FeedbackSensitivity): Promise<void> {
    try {
      const key = this.generateCacheKey(content, sensitivity);
      await this.cache.del(key);
      this.logger.debug(`Invalidated cache key: ${key.substring(0, 50)}...`);
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${error}`);
    }
  }

  /**
   * Invalidate all cache entries for a given content (all sensitivity levels)
   * @param content The response content
   */
  async invalidateAll(content: string): Promise<void> {
    const sensitivities = [
      FeedbackSensitivity.LOW,
      FeedbackSensitivity.MEDIUM,
      FeedbackSensitivity.HIGH,
    ];

    await Promise.all(sensitivities.map((s) => this.invalidate(content, s)));
  }
}
