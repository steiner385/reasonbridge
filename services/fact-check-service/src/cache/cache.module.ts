/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { FactCheckCacheService } from './fact-check-cache.service.js';

/**
 * Default cache TTL: 24 hours in seconds
 */
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/**
 * Cache module for fact-check service
 *
 * Configures Redis as the cache store with environment-based settings:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - FACT_CHECK_CACHE_TTL: TTL in seconds (default: 86400 = 24 hours)
 * - CACHE_MAX_ITEMS: Maximum cached items (default: 10000)
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: async () => {
        const logger = new Logger('CacheModule');
        const host = process.env['REDIS_HOST'] || 'localhost';
        const port = parseInt(process.env['REDIS_PORT'] || '6379', 10);
        const ttl = parseInt(
          process.env['FACT_CHECK_CACHE_TTL'] || String(DEFAULT_TTL_SECONDS),
          10,
        );

        logger.log(`Configuring Redis cache: ${host}:${port}, TTL: ${ttl}s`);

        return {
          store: redisStore,
          host,
          port,
          ttl,
          max: parseInt(process.env['CACHE_MAX_ITEMS'] || '10000', 10),
        };
      },
    }),
  ],
  providers: [FactCheckCacheService],
  exports: [FactCheckCacheService, NestCacheModule],
})
export class CacheModule {}
