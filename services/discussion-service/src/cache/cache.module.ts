/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';

const logger = new Logger('CacheModule');

/**
 * Cache Module
 *
 * Configures Redis caching for the discussion service.
 * Uses AWS ElastiCache in production or local Redis in development.
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_TLS: Enable TLS for production (default: false)
 * - CACHE_TTL: Cache TTL in seconds (default: 3600 = 1 hour)
 * - CACHE_MAX_ITEMS: Maximum cached items (default: 1000)
 */
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const nodeEnv = process.env['NODE_ENV'];
        const redisHost = process.env['REDIS_HOST'];

        // In test or development mode without explicit REDIS_HOST, use in-memory cache
        // This prevents services from hanging when Redis is not available
        if ((nodeEnv === 'test' || nodeEnv === 'development' || !nodeEnv) && !redisHost) {
          logger.warn('REDIS_HOST not configured - using in-memory cache');
          return {
            ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10) * 1000,
            max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
          };
        }

        // Use Redis cache when explicitly configured
        // Dynamic import to avoid blocking when Redis is not needed
        const { redisStore } = await import('cache-manager-redis-store');
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
