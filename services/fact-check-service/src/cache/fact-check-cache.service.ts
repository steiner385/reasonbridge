/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { FactCheckResultDto } from '../dto/check-claims.dto.js';

/**
 * Cache key prefix for fact-check results
 */
const CACHE_KEY_PREFIX = 'fact-check:result:';

/**
 * Default TTL: 24 hours in milliseconds
 */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Service for caching fact-check results
 *
 * Uses Redis as the cache store with graceful degradation:
 * - Cache failures are logged but don't throw exceptions
 * - Application continues to work even if Redis is unavailable
 *
 * Cache key format: fact-check:result:{contentHash}
 * TTL: 24 hours (configurable via FACT_CHECK_CACHE_TTL_MS env var)
 */
@Injectable()
export class FactCheckCacheService {
  private readonly logger = new Logger(FactCheckCacheService.name);
  private readonly ttlMs: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.ttlMs = parseInt(process.env['FACT_CHECK_CACHE_TTL_MS'] || String(DEFAULT_TTL_MS), 10);
    this.logger.log(`FactCheckCacheService initialized with TTL: ${this.ttlMs}ms`);
  }

  /**
   * Get cached fact-check result for a claim
   *
   * @param claimHash - SHA-256 hash of normalized claim text
   * @returns Cached result or null if not found/error
   */
  async get(claimHash: string): Promise<FactCheckResultDto | null> {
    try {
      const cacheKey = this.buildCacheKey(claimHash);
      const cached = await this.cacheManager.get<FactCheckResultDto>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache hit for claim hash: ${claimHash.slice(0, 8)}...`);
        return cached;
      }

      this.logger.debug(`Cache miss for claim hash: ${claimHash.slice(0, 8)}...`);
      return null;
    } catch (error) {
      this.logger.warn(
        `Cache get error for ${claimHash.slice(0, 8)}...: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Store fact-check result in cache
   *
   * @param claimHash - SHA-256 hash of normalized claim text
   * @param result - Fact-check result to cache
   */
  async set(claimHash: string, result: FactCheckResultDto): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(claimHash);
      await this.cacheManager.set(cacheKey, result, this.ttlMs);
      this.logger.debug(`Cached result for claim hash: ${claimHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.warn(
        `Cache set error for ${claimHash.slice(0, 8)}...: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Graceful degradation: don't throw, just log
    }
  }

  /**
   * Invalidate cached fact-check result
   *
   * @param claimHash - SHA-256 hash of normalized claim text
   */
  async invalidate(claimHash: string): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(claimHash);
      await this.cacheManager.del(cacheKey);
      this.logger.debug(`Invalidated cache for claim hash: ${claimHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.warn(
        `Cache invalidate error for ${claimHash.slice(0, 8)}...: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Graceful degradation: don't throw, just log
    }
  }

  /**
   * Build cache key from claim hash
   */
  private buildCacheKey(claimHash: string): string {
    return `${CACHE_KEY_PREFIX}${claimHash}`;
  }
}
