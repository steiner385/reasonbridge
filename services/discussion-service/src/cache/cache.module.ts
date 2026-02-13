/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';

/**
 * Cache Module
 *
 * Configures caching for the discussion service.
 *
 * Note: Using in-memory caching for now due to cache-manager-redis-store
 * version incompatibility with cache-manager v7. In production, consider
 * using cache-manager-redis-yet or @tirke/node-cache-manager-ioredis
 * which are compatible with cache-manager v5+.
 *
 * TODO: Upgrade to Redis caching using cache-manager-redis-yet
 */
@Module({
  imports: [
    NestCacheModule.register({
      ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10) * 1000, // Convert to ms
      max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
