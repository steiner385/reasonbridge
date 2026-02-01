import { Module, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

import { SemanticCacheService } from './semantic-cache.service.js';
import { EmbeddingService } from './embedding.service.js';
import { QdrantService } from './qdrant.service.js';
import { RedisCacheService } from './redis-cache.service.js';

const logger = new Logger('CacheModule');

/**
 * Cache Module
 *
 * Configures semantic caching for the AI service with three tiers:
 * 1. Redis - Fast exact-match caching by content hash
 * 2. Qdrant - Vector similarity search for semantically similar content
 * 3. Fresh analysis - Fallback to regex analyzers
 *
 * Uses AWS ElastiCache in production or local Redis in development.
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_TLS: Enable TLS for production (default: false)
 * - FEEDBACK_CACHE_TTL: Feedback cache TTL in seconds (default: 172800 = 48 hours)
 * - EMBEDDING_CACHE_TTL: Embedding cache TTL in seconds (default: 604800 = 7 days)
 * - CACHE_MAX_ITEMS: Maximum cached items (default: 1000)
 * - OPENAI_API_KEY: OpenAI API key for embeddings
 * - QDRANT_URL: Qdrant server URL (default: http://localhost:6333)
 * - QDRANT_API_KEY: Qdrant API key (optional for local)
 * - SIMILARITY_THRESHOLD: Minimum similarity for cache hit (default: 0.95)
 */
@Module({
  imports: [
    NestCacheModule.register({
      store: redisStore,
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      ttl: parseInt(process.env['CACHE_TTL'] || '3600', 10),
      max: parseInt(process.env['CACHE_MAX_ITEMS'] || '1000', 10),
      ...(process.env['REDIS_TLS'] === 'true' && {
        tls: { rejectUnauthorized: false },
      }),
    }),
  ],
  providers: [
    // OpenAI client - optional, returns null if API key not configured
    {
      provide: 'OPENAI_CLIENT',
      useFactory: () => {
        const apiKey = process.env['OPENAI_API_KEY'];
        if (!apiKey) {
          logger.warn(
            'OPENAI_API_KEY not configured - semantic caching will fall back to direct analysis',
          );
          return null;
        }
        return new OpenAI({ apiKey });
      },
    },
    // Qdrant client
    {
      provide: 'QDRANT_CLIENT',
      useFactory: () => {
        return new QdrantClient({
          url: process.env['QDRANT_URL'] || 'http://localhost:6333',
          apiKey: process.env['QDRANT_API_KEY'] || undefined,
        });
      },
    },
    // Services
    EmbeddingService,
    QdrantService,
    RedisCacheService,
    SemanticCacheService,
  ],
  exports: [SemanticCacheService, RedisCacheService, NestCacheModule],
})
export class CacheModule {}
