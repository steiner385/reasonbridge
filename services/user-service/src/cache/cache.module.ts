/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

const logger = new Logger('CacheModule');

/**
 * Cache Module
 *
 * Configures Redis caching for the user service.
 * Uses AWS ElastiCache in production or local Redis in development.
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_TLS: Enable TLS for production (default: false)
 * - CACHE_TTL: Cache TTL in seconds (default: 3600 = 1 hour)
 * - CACHE_MAX_ITEMS: Maximum cached items (default: 1000)
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const isTestMode = process.env['NODE_ENV'] === 'test';
        const redisHost = process.env['REDIS_HOST'];

        // In test mode without explicit REDIS_HOST, use in-memory cache
        // This prevents tests from failing when Redis is not available
        if (isTestMode && !redisHost) {
          logger.warn('REDIS_HOST not configured in test mode - using in-memory cache');
          return {
            ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10) * 1000,
            max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
          };
        }

        // Use Redis cache for development and production
        return {
          store: redisStore,
          host: redisHost || 'localhost',
          port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
          ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10),
          max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
          ...(process.env['REDIS_TLS'] === 'true' && {
            tls: { rejectUnauthorized: false },
          }),
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
