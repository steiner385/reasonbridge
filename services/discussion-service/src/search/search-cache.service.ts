/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import type { UnifiedSearchResultsDto } from './dto/unified-search-results.dto.js';
import type { UnifiedSearchQueryDto } from './dto/unified-search-query.dto.js';

/**
 * Service for caching search results
 * Feature #1040: Full-Text Search for Discussions
 *
 * Uses SHA-256 hash of query parameters as cache key.
 * Default TTL is 5 minutes (300 seconds) for search results.
 *
 * Cache invalidation strategies:
 * - By topic: When a topic is created/updated/deleted
 * - By response: When a response is created/updated/deleted
 * - Manual: via clear() method
 */
@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);
  private readonly CACHE_PREFIX = 'search:';
  private readonly DEFAULT_TTL = 300000; // 5 minutes in milliseconds

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Generate a cache key from search query parameters
   * Uses SHA-256 hash for consistent, URL-safe keys
   */
  private generateCacheKey(query: UnifiedSearchQueryDto): string {
    // Normalize query parameters for consistent hashing
    const normalized = {
      q: query.q.toLowerCase().trim(),
      type: query.type,
      topicId: query.topicId,
      authorId: query.authorId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sortBy: query.sortBy,
      page: query.page,
      limit: query.limit,
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get cached search results
   *
   * @param query - Search query parameters
   * @returns Cached results or null if not found
   */
  async get(query: UnifiedSearchQueryDto): Promise<UnifiedSearchResultsDto | null> {
    try {
      const key = this.generateCacheKey(query);
      const cached = await this.cacheManager.get<UnifiedSearchResultsDto>(key);

      if (cached) {
        this.logger.debug(`Cache HIT for key ${key}`);
        return cached;
      }

      this.logger.debug(`Cache MISS for key ${key}`);
      return null;
    } catch (error) {
      this.logger.warn(`Cache get failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Cache search results
   *
   * @param query - Search query parameters (used to generate key)
   * @param results - Search results to cache
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  async set(
    query: UnifiedSearchQueryDto,
    results: UnifiedSearchResultsDto,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(query);
      await this.cacheManager.set(key, results, ttl);
      this.logger.debug(`Cached results for key ${key} with TTL ${ttl}ms`);
    } catch (error) {
      this.logger.warn(`Cache set failed: ${(error as Error).message}`);
      // Don't throw - caching failure shouldn't break search
    }
  }

  /**
   * Invalidate cache entries related to a specific topic
   * Called when a topic is created, updated, or deleted
   *
   * @param topicId - ID of the topic that changed
   */
  async invalidateByTopic(topicId: string): Promise<void> {
    // Note: For production use with Redis, you would use pattern-based deletion
    // or maintain a separate index of which cache keys include which topics.
    // For simplicity, we rely on TTL-based expiration.
    this.logger.debug(`Invalidation requested for topic ${topicId} (using TTL expiration)`);
  }

  /**
   * Invalidate cache entries related to a specific response
   * Called when a response is created, updated, or deleted
   *
   * @param responseId - ID of the response that changed
   */
  async invalidateByResponse(responseId: string): Promise<void> {
    // Similar to topic invalidation - relies on TTL
    this.logger.debug(`Invalidation requested for response ${responseId} (using TTL expiration)`);
  }

  /**
   * Clear all search cache entries
   * Use sparingly as it affects all users
   */
  async clear(): Promise<void> {
    try {
      // Note: This is a placeholder - actual implementation depends on cache backend
      // For Redis, you would use SCAN + DEL with the prefix pattern
      this.logger.log('Search cache clear requested');
    } catch (error) {
      this.logger.warn(`Cache clear failed: ${(error as Error).message}`);
    }
  }
}
