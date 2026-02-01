import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { AnalysisResult } from '../services/response-analyzer.service.js';

const FEEDBACK_CACHE_PREFIX = 'feedback:exact:';
const DEFAULT_TTL = 172800; // 48 hours in seconds

/**
 * Redis cache service for exact-match feedback lookups.
 *
 * Provides fast O(1) lookup by content hash for previously analyzed content.
 * Uses graceful degradation - cache failures don't break the application.
 */
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly ttl: number;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    this.ttl = parseInt(process.env['FEEDBACK_CACHE_TTL'] || String(DEFAULT_TTL), 10);
  }

  /**
   * Get cached feedback by content hash.
   *
   * @param contentHash - SHA-256 hash of the normalized content
   * @returns Cached AnalysisResult or null if not found
   */
  async getFeedback(contentHash: string): Promise<AnalysisResult | null> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      const cached = await this.cache.get<AnalysisResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Redis cache hit for ${contentHash.slice(0, 8)}...`);
      }
      return cached ?? null;
    } catch (error) {
      this.logger.error('Redis get failed', error);
      return null;
    }
  }

  /**
   * Cache feedback by content hash.
   *
   * @param contentHash - SHA-256 hash of the normalized content
   * @param result - Analysis result to cache
   */
  async setFeedback(contentHash: string, result: AnalysisResult): Promise<void> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      // cache-manager v7+ uses milliseconds for TTL
      await this.cache.set(cacheKey, result, this.ttl * 1000);
      this.logger.debug(`Cached feedback for ${contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Redis set failed', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Invalidate cached feedback.
   *
   * @param contentHash - SHA-256 hash of the content to invalidate
   */
  async invalidate(contentHash: string): Promise<void> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      await this.cache.del(cacheKey);
      this.logger.debug(`Invalidated cache for ${contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Redis del failed', error);
      // Don't throw - graceful degradation
    }
  }
}
