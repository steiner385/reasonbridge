import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

import { SemanticCacheService } from './semantic-cache.service.js';
import { EmbeddingService } from './embedding.service.js';
import { QdrantService } from './qdrant.service.js';
import { RedisCacheService } from './redis-cache.service.js';

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
    // OpenAI client
    {
      provide: 'OPENAI_CLIENT',
      useFactory: () => {
        return new OpenAI({
          apiKey: process.env['OPENAI_API_KEY'],
        });
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
  exports: [SemanticCacheService, RedisCacheService],
})
export class CacheModule {}
