import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

/**
 * Cache Module
 *
 * Configures Redis-backed caching for the discussion service.
 * Uses AWS ElastiCache in production or local Redis in development.
 */
@Module({
  imports: [
    NestCacheModule.register({
      store: redisStore,
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10), // 1 hour default
      max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
      // Optional TLS for production ElastiCache
      ...(process.env['REDIS_TLS'] === 'true' && {
        tls: {
          rejectUnauthorized: false, // ElastiCache uses self-signed certs
        },
      }),
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
