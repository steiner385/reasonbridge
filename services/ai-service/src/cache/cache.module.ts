import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

/**
 * Cache Module
 *
 * Configures Redis-backed caching for the AI service.
 * Uses AWS ElastiCache in production or local Redis in development.
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_TLS: Enable TLS for production (default: false)
 * - FEEDBACK_CACHE_TTL: Cache TTL in seconds (default: 3600 = 1 hour)
 * - CACHE_MAX_ITEMS: Maximum cached items (default: 1000)
 */
@Module({
  imports: [
    NestCacheModule.register({
      store: redisStore,
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      ttl: parseInt(process.env['FEEDBACK_CACHE_TTL'] || '3600', 10),
      max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
      ...(process.env['REDIS_TLS'] === 'true' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
