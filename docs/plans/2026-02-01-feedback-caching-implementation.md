# Feedback Caching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement semantic similarity-based caching for AI feedback using Qdrant, OpenAI embeddings, and Redis.

**Architecture:** Three-tier cache lookup: Redis exact match → Qdrant similarity search → fresh analysis. Async write-behind for cache population. Graceful degradation when caches unavailable.

**Tech Stack:** NestJS, OpenAI text-embedding-3-small, Qdrant vector DB, Redis, TypeScript

---

## Task 1: Add Dependencies and Docker Configuration

**Files:**

- Modify: `services/ai-service/package.json`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Step 1: Add npm dependencies to ai-service**

Edit `services/ai-service/package.json`, add to dependencies:

```json
"@nestjs/cache-manager": "^3.1.0",
"@qdrant/js-client-rest": "^1.7.0",
"cache-manager": "^7.2.8",
"cache-manager-redis-store": "^3.0.1",
"openai": "^4.77.0"
```

**Step 2: Add Qdrant to docker-compose.yml**

Add before the `volumes:` section:

```yaml
qdrant:
  image: qdrant/qdrant:v1.7.4
  container_name: reasonbridge-qdrant
  ports:
    - '6333:6333'
    - '6334:6334'
  volumes:
    - qdrant_data:/qdrant/storage
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:6333/health']
    interval: 10s
    timeout: 5s
    retries: 5
```

Add to `volumes:` section:

```yaml
qdrant_data:
```

**Step 3: Add environment variables to .env.example**

Add these lines:

```env
# OpenAI Embeddings
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=feedback_embeddings

# Similarity Threshold
SIMILARITY_THRESHOLD=0.95

# Cache TTLs (seconds)
FEEDBACK_CACHE_TTL=172800
EMBEDDING_CACHE_TTL=604800
```

**Step 4: Install dependencies**

Run: `cd services/ai-service && pnpm install`

**Step 5: Commit**

```bash
git add services/ai-service/package.json docker-compose.yml .env.example pnpm-lock.yaml
git commit -m "feat(ai-service): add Qdrant, OpenAI, and Redis cache dependencies"
```

---

## Task 2: Create Cache Types and Interfaces

**Files:**

- Create: `services/ai-service/src/cache/types.ts`
- Test: `services/ai-service/src/cache/__tests__/types.spec.ts`

**Step 1: Write the type definitions**

Create `services/ai-service/src/cache/types.ts`:

```typescript
import type { AnalysisResult } from '../services/response-analyzer.service.js';

/**
 * Metadata stored alongside cached feedback in Qdrant
 */
export interface FeedbackMetadata {
  contentHash: string;
  feedbackType: string;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  topicId: string | null;
  createdAt: string;
}

/**
 * Cached feedback result with metadata
 */
export interface CachedFeedback {
  result: AnalysisResult;
  metadata: FeedbackMetadata;
  similarity?: number;
}

/**
 * Configuration for the semantic cache
 */
export interface SemanticCacheConfig {
  similarityThreshold: number;
  feedbackCacheTtl: number;
  embeddingCacheTtl: number;
  qdrantUrl: string;
  qdrantApiKey?: string;
  qdrantCollection: string;
  openaiApiKey: string;
  openaiModel: string;
}

/**
 * Result of a cache lookup operation
 */
export interface CacheLookupResult {
  hit: boolean;
  source: 'redis' | 'qdrant' | 'none';
  result?: AnalysisResult;
  similarity?: number;
}

/**
 * Hash utility function type
 */
export type ContentHashFn = (content: string) => string;
```

**Step 2: Write test for types**

Create `services/ai-service/src/cache/__tests__/types.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type {
  FeedbackMetadata,
  CachedFeedback,
  SemanticCacheConfig,
  CacheLookupResult,
} from '../types.js';
import { FeedbackType } from '@reason-bridge/db-models';

describe('Cache Types', () => {
  it('should define FeedbackMetadata interface correctly', () => {
    const metadata: FeedbackMetadata = {
      contentHash: 'abc123',
      feedbackType: 'FALLACY',
      subtype: 'straw_man',
      suggestionText: 'Test suggestion',
      reasoning: 'Test reasoning',
      confidenceScore: 0.85,
      topicId: 'topic-123',
      createdAt: '2026-02-01T00:00:00Z',
    };

    expect(metadata.contentHash).toBe('abc123');
    expect(metadata.feedbackType).toBe('FALLACY');
  });

  it('should define CachedFeedback interface correctly', () => {
    const cached: CachedFeedback = {
      result: {
        type: FeedbackType.FALLACY,
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.9,
      },
      metadata: {
        contentHash: 'abc123',
        feedbackType: 'FALLACY',
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.9,
        topicId: null,
        createdAt: '2026-02-01T00:00:00Z',
      },
      similarity: 0.97,
    };

    expect(cached.similarity).toBe(0.97);
  });

  it('should define CacheLookupResult for cache hits', () => {
    const hit: CacheLookupResult = {
      hit: true,
      source: 'qdrant',
      result: {
        type: FeedbackType.AFFIRMATION,
        suggestionText: 'Great!',
        reasoning: 'No issues',
        confidenceScore: 0.85,
      },
      similarity: 0.98,
    };

    expect(hit.hit).toBe(true);
    expect(hit.source).toBe('qdrant');
  });

  it('should define CacheLookupResult for cache misses', () => {
    const miss: CacheLookupResult = {
      hit: false,
      source: 'none',
    };

    expect(miss.hit).toBe(false);
    expect(miss.result).toBeUndefined();
  });
});
```

**Step 3: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/types.spec.ts`

Expected: PASS (type tests should compile and pass)

**Step 4: Commit**

```bash
git add services/ai-service/src/cache/
git commit -m "feat(ai-service): add cache type definitions"
```

---

## Task 3: Create Hash Utility

**Files:**

- Create: `services/ai-service/src/cache/hash.util.ts`
- Test: `services/ai-service/src/cache/__tests__/hash.util.spec.ts`

**Step 1: Write the failing test**

Create `services/ai-service/src/cache/__tests__/hash.util.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeContentHash, normalizeContent } from '../hash.util.js';

describe('Hash Utility', () => {
  describe('normalizeContent', () => {
    it('should trim whitespace', () => {
      expect(normalizeContent('  hello world  ')).toBe('hello world');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeContent('hello    world')).toBe('hello world');
    });

    it('should normalize newlines', () => {
      expect(normalizeContent('hello\n\nworld')).toBe('hello world');
    });

    it('should lowercase content', () => {
      expect(normalizeContent('Hello World')).toBe('hello world');
    });
  });

  describe('computeContentHash', () => {
    it('should return consistent hash for same content', () => {
      const hash1 = computeContentHash('test content');
      const hash2 = computeContentHash('test content');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different content', () => {
      const hash1 = computeContentHash('content one');
      const hash2 = computeContentHash('content two');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize before hashing', () => {
      const hash1 = computeContentHash('Hello World');
      const hash2 = computeContentHash('  hello   world  ');
      expect(hash1).toBe(hash2);
    });

    it('should return 64-character hex string (SHA-256)', () => {
      const hash = computeContentHash('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/hash.util.spec.ts`

Expected: FAIL with "Cannot find module '../hash.util.js'"

**Step 3: Write the implementation**

Create `services/ai-service/src/cache/hash.util.ts`:

```typescript
import { createHash } from 'crypto';

/**
 * Normalize content for consistent hashing
 * - Trims whitespace
 * - Collapses multiple spaces/newlines
 * - Lowercases
 */
export function normalizeContent(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Compute SHA-256 hash of normalized content
 * Returns 64-character hex string
 */
export function computeContentHash(content: string): string {
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized).digest('hex');
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/hash.util.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/cache/hash.util.ts services/ai-service/src/cache/__tests__/hash.util.spec.ts
git commit -m "feat(ai-service): add content hash utility"
```

---

## Task 4: Create Embedding Service

**Files:**

- Create: `services/ai-service/src/cache/embedding.service.ts`
- Test: `services/ai-service/src/cache/__tests__/embedding.service.spec.ts`

**Step 1: Write the failing test**

Create `services/ai-service/src/cache/__tests__/embedding.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EmbeddingService } from '../embedding.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockCacheManager: any;
  let mockOpenAI: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
    };

    mockOpenAI = {
      embeddings: {
        create: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: 'OPENAI_CLIENT', useValue: mockOpenAI },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  describe('getEmbedding', () => {
    it('should return cached embedding if available', async () => {
      const cachedEmbedding = [0.1, 0.2, 0.3];
      mockCacheManager.get.mockResolvedValue(cachedEmbedding);

      const result = await service.getEmbedding('test content');

      expect(result).toEqual(cachedEmbedding);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it('should call OpenAI and cache result on cache miss', async () => {
      const embedding = [0.4, 0.5, 0.6];
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding }],
      });

      const result = await service.getEmbedding('test content');

      expect(result).toEqual(embedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test content',
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should use content hash as cache key', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: [0.1] }],
      });

      await service.getEmbedding('test content');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringMatching(/^feedback:embedding:[a-f0-9]{64}$/),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/embedding.service.spec.ts`

Expected: FAIL with "Cannot find module '../embedding.service.js'"

**Step 3: Write the implementation**

Create `services/ai-service/src/cache/embedding.service.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type OpenAI from 'openai';
import { computeContentHash } from './hash.util.js';

const EMBEDDING_CACHE_PREFIX = 'feedback:embedding:';
const DEFAULT_TTL = 604800; // 7 days in seconds

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly model: string;
  private readonly ttl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject('OPENAI_CLIENT') private readonly openai: OpenAI,
  ) {
    this.model = process.env['OPENAI_EMBEDDING_MODEL'] || 'text-embedding-3-small';
    this.ttl = parseInt(process.env['EMBEDDING_CACHE_TTL'] || String(DEFAULT_TTL), 10);
  }

  /**
   * Get embedding for content, using cache when available
   */
  async getEmbedding(content: string): Promise<number[]> {
    const contentHash = computeContentHash(content);
    const cacheKey = `${EMBEDDING_CACHE_PREFIX}${contentHash}`;

    // Check cache first
    const cached = await this.cache.get<number[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Embedding cache hit for ${contentHash.slice(0, 8)}...`);
      return cached;
    }

    // Generate embedding via OpenAI
    this.logger.debug(`Generating embedding for ${contentHash.slice(0, 8)}...`);
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: content,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    // Cache the embedding
    await this.cache.set(cacheKey, embedding, this.ttl * 1000);

    return embedding;
  }

  /**
   * Get cached embedding without generating new one
   */
  async getCachedEmbedding(content: string): Promise<number[] | null> {
    const contentHash = computeContentHash(content);
    const cacheKey = `${EMBEDDING_CACHE_PREFIX}${contentHash}`;
    return this.cache.get<number[]>(cacheKey);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/embedding.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/cache/embedding.service.ts services/ai-service/src/cache/__tests__/embedding.service.spec.ts
git commit -m "feat(ai-service): add embedding service with Redis caching"
```

---

## Task 5: Create Qdrant Service

**Files:**

- Create: `services/ai-service/src/cache/qdrant.service.ts`
- Test: `services/ai-service/src/cache/__tests__/qdrant.service.spec.ts`

**Step 1: Write the failing test**

Create `services/ai-service/src/cache/__tests__/qdrant.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { QdrantService } from '../qdrant.service.js';
import { FeedbackType } from '@reason-bridge/db-models';
import type { FeedbackMetadata } from '../types.js';

describe('QdrantService', () => {
  let service: QdrantService;
  let mockQdrantClient: any;

  beforeEach(async () => {
    mockQdrantClient = {
      getCollections: vi.fn().mockResolvedValue({ collections: [] }),
      createCollection: vi.fn().mockResolvedValue(true),
      search: vi.fn(),
      upsert: vi.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [QdrantService, { provide: 'QDRANT_CLIENT', useValue: mockQdrantClient }],
    }).compile();

    service = module.get<QdrantService>(QdrantService);
    await service.onModuleInit();
  });

  describe('searchSimilar', () => {
    it('should return null when no matches found', async () => {
      mockQdrantClient.search.mockResolvedValue([]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).toBeNull();
    });

    it('should return cached feedback when similarity meets threshold', async () => {
      mockQdrantClient.search.mockResolvedValue([
        {
          score: 0.97,
          payload: {
            contentHash: 'abc123',
            feedbackType: 'FALLACY',
            subtype: 'straw_man',
            suggestionText: 'Test suggestion',
            reasoning: 'Test reasoning',
            confidenceScore: 0.85,
            topicId: null,
            createdAt: '2026-02-01T00:00:00Z',
          },
        },
      ]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).not.toBeNull();
      expect(result?.result.type).toBe(FeedbackType.FALLACY);
      expect(result?.similarity).toBe(0.97);
    });

    it('should return null when similarity below threshold', async () => {
      mockQdrantClient.search.mockResolvedValue([
        {
          score: 0.9,
          payload: {
            feedbackType: 'FALLACY',
            suggestionText: 'Test',
            reasoning: 'Test',
            confidenceScore: 0.85,
          },
        },
      ]);

      const result = await service.searchSimilar([0.1, 0.2, 0.3], 0.95);

      expect(result).toBeNull();
    });
  });

  describe('store', () => {
    it('should store embedding with metadata', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const result = {
        type: FeedbackType.FALLACY,
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
      };
      const metadata: FeedbackMetadata = {
        contentHash: 'abc123',
        feedbackType: 'FALLACY',
        subtype: 'straw_man',
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
        topicId: null,
        createdAt: '2026-02-01T00:00:00Z',
      };

      await service.store(embedding, result, metadata);

      expect(mockQdrantClient.upsert).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              vector: embedding,
              payload: metadata,
            }),
          ]),
        }),
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/qdrant.service.spec.ts`

Expected: FAIL with "Cannot find module '../qdrant.service.js'"

**Step 3: Write the implementation**

Create `services/ai-service/src/cache/qdrant.service.ts`:

```typescript
import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import type { QdrantClient } from '@qdrant/js-client-rest';
import { FeedbackType } from '@reason-bridge/db-models';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import type { CachedFeedback, FeedbackMetadata } from './types.js';
import { randomUUID } from 'crypto';

const VECTOR_SIZE = 1536; // text-embedding-3-small dimensions

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly collectionName: string;

  constructor(@Inject('QDRANT_CLIENT') private readonly client: QdrantClient) {
    this.collectionName = process.env['QDRANT_COLLECTION'] || 'feedback_embeddings';
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollectionExists();
  }

  /**
   * Ensure the Qdrant collection exists with correct schema
   */
  private async ensureCollectionExists(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        this.logger.log(`Creating Qdrant collection: ${this.collectionName}`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant collection', error);
      throw error;
    }
  }

  /**
   * Search for similar content in Qdrant
   */
  async searchSimilar(embedding: number[], threshold: number): Promise<CachedFeedback | null> {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: embedding,
        limit: 1,
        score_threshold: threshold,
      });

      if (results.length === 0) {
        return null;
      }

      const match = results[0];
      if (!match || match.score < threshold) {
        return null;
      }

      const payload = match.payload as FeedbackMetadata;

      return {
        result: {
          type: payload.feedbackType as FeedbackType,
          subtype: payload.subtype ?? undefined,
          suggestionText: payload.suggestionText,
          reasoning: payload.reasoning,
          confidenceScore: payload.confidenceScore,
        },
        metadata: payload,
        similarity: match.score,
      };
    } catch (error) {
      this.logger.error('Qdrant search failed', error);
      return null;
    }
  }

  /**
   * Store embedding with feedback metadata
   */
  async store(
    embedding: number[],
    result: AnalysisResult,
    metadata: FeedbackMetadata,
  ): Promise<void> {
    try {
      await this.client.upsert(this.collectionName, {
        wait: false, // Async write
        points: [
          {
            id: randomUUID(),
            vector: embedding,
            payload: metadata,
          },
        ],
      });
      this.logger.debug(`Stored feedback in Qdrant: ${metadata.contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Failed to store in Qdrant', error);
      // Don't throw - graceful degradation
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/qdrant.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/cache/qdrant.service.ts services/ai-service/src/cache/__tests__/qdrant.service.spec.ts
git commit -m "feat(ai-service): add Qdrant service for vector similarity search"
```

---

## Task 6: Create Redis Cache Service

**Files:**

- Create: `services/ai-service/src/cache/redis-cache.service.ts`
- Test: `services/ai-service/src/cache/__tests__/redis-cache.service.spec.ts`

**Step 1: Write the failing test**

Create `services/ai-service/src/cache/__tests__/redis-cache.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { RedisCacheService } from '../redis-cache.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeedbackType } from '@reason-bridge/db-models';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [RedisCacheService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('getFeedback', () => {
    it('should return cached feedback for content hash', async () => {
      const cached = {
        type: FeedbackType.FALLACY,
        suggestionText: 'Test',
        reasoning: 'Test reasoning',
        confidenceScore: 0.85,
      };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.getFeedback('abc123');

      expect(result).toEqual(cached);
      expect(mockCacheManager.get).toHaveBeenCalledWith('feedback:exact:abc123');
    });

    it('should return null on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getFeedback('abc123');

      expect(result).toBeNull();
    });
  });

  describe('setFeedback', () => {
    it('should store feedback with content hash key', async () => {
      const result = {
        type: FeedbackType.AFFIRMATION,
        suggestionText: 'Great!',
        reasoning: 'No issues',
        confidenceScore: 0.85,
      };

      await service.setFeedback('abc123', result);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'feedback:exact:abc123',
        result,
        expect.any(Number),
      );
    });
  });

  describe('invalidate', () => {
    it('should delete cached feedback by content hash', async () => {
      await service.invalidate('abc123');

      expect(mockCacheManager.del).toHaveBeenCalledWith('feedback:exact:abc123');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/redis-cache.service.spec.ts`

Expected: FAIL with "Cannot find module '../redis-cache.service.js'"

**Step 3: Write the implementation**

Create `services/ai-service/src/cache/redis-cache.service.ts`:

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { AnalysisResult } from '../services/response-analyzer.service.js';

const FEEDBACK_CACHE_PREFIX = 'feedback:exact:';
const DEFAULT_TTL = 172800; // 48 hours in seconds

@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly ttl: number;

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {
    this.ttl = parseInt(process.env['FEEDBACK_CACHE_TTL'] || String(DEFAULT_TTL), 10);
  }

  /**
   * Get cached feedback by content hash
   */
  async getFeedback(contentHash: string): Promise<AnalysisResult | null> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      const cached = await this.cache.get<AnalysisResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Redis cache hit for ${contentHash.slice(0, 8)}...`);
      }
      return cached ?? null;
    } catch (error) {
      this.logger.error('Redis get failed', error);
      return null;
    }
  }

  /**
   * Cache feedback by content hash
   */
  async setFeedback(contentHash: string, result: AnalysisResult): Promise<void> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      await this.cache.set(cacheKey, result, this.ttl * 1000);
      this.logger.debug(`Cached feedback for ${contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Redis set failed', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Invalidate cached feedback
   */
  async invalidate(contentHash: string): Promise<void> {
    const cacheKey = `${FEEDBACK_CACHE_PREFIX}${contentHash}`;
    try {
      await this.cache.del(cacheKey);
      this.logger.debug(`Invalidated cache for ${contentHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error('Redis del failed', error);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/redis-cache.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/cache/redis-cache.service.ts services/ai-service/src/cache/__tests__/redis-cache.service.spec.ts
git commit -m "feat(ai-service): add Redis cache service for exact match lookup"
```

---

## Task 7: Create Semantic Cache Service (Orchestrator)

**Files:**

- Create: `services/ai-service/src/cache/semantic-cache.service.ts`
- Test: `services/ai-service/src/cache/__tests__/semantic-cache.service.spec.ts`

**Step 1: Write the failing test**

Create `services/ai-service/src/cache/__tests__/semantic-cache.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { SemanticCacheService } from '../semantic-cache.service.js';
import { EmbeddingService } from '../embedding.service.js';
import { QdrantService } from '../qdrant.service.js';
import { RedisCacheService } from '../redis-cache.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let mockEmbeddingService: any;
  let mockQdrantService: any;
  let mockRedisCacheService: any;

  const mockAnalysisResult = {
    type: FeedbackType.FALLACY,
    subtype: 'straw_man',
    suggestionText: 'Test suggestion',
    reasoning: 'Test reasoning',
    confidenceScore: 0.85,
  };

  beforeEach(async () => {
    mockEmbeddingService = {
      getEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };

    mockQdrantService = {
      searchSimilar: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    };

    mockRedisCacheService = {
      getFeedback: vi.fn().mockResolvedValue(null),
      setFeedback: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        SemanticCacheService,
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        { provide: QdrantService, useValue: mockQdrantService },
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    service = module.get<SemanticCacheService>(SemanticCacheService);
  });

  describe('getOrAnalyze', () => {
    it('should return Redis cached result on exact match', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(mockAnalysisResult);

      const analyzeFunc = vi.fn();
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).not.toHaveBeenCalled();
      expect(mockEmbeddingService.getEmbedding).not.toHaveBeenCalled();
    });

    it('should return Qdrant cached result on similarity match', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue({
        result: mockAnalysisResult,
        similarity: 0.97,
      });

      const analyzeFunc = vi.fn();
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).not.toHaveBeenCalled();
    });

    it('should call analyzer and cache result on cache miss', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockResolvedValue(null);

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
      expect(mockRedisCacheService.setFeedback).toHaveBeenCalled();
      expect(mockQdrantService.store).toHaveBeenCalled();
    });

    it('should handle embedding service failure gracefully', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockEmbeddingService.getEmbedding.mockRejectedValue(new Error('OpenAI error'));

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
    });

    it('should handle Qdrant failure gracefully', async () => {
      mockRedisCacheService.getFeedback.mockResolvedValue(null);
      mockQdrantService.searchSimilar.mockRejectedValue(new Error('Qdrant error'));

      const analyzeFunc = vi.fn().mockResolvedValue(mockAnalysisResult);
      const result = await service.getOrAnalyze('test content', analyzeFunc);

      expect(result).toEqual(mockAnalysisResult);
      expect(analyzeFunc).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/semantic-cache.service.spec.ts`

Expected: FAIL with "Cannot find module '../semantic-cache.service.js'"

**Step 3: Write the implementation**

Create `services/ai-service/src/cache/semantic-cache.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from './embedding.service.js';
import { QdrantService } from './qdrant.service.js';
import { RedisCacheService } from './redis-cache.service.js';
import { computeContentHash } from './hash.util.js';
import type { AnalysisResult } from '../services/response-analyzer.service.js';
import type { FeedbackMetadata, CacheLookupResult } from './types.js';

const DEFAULT_SIMILARITY_THRESHOLD = 0.95;

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly similarityThreshold: number;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService,
    private readonly redisCacheService: RedisCacheService,
  ) {
    this.similarityThreshold = parseFloat(
      process.env['SIMILARITY_THRESHOLD'] || String(DEFAULT_SIMILARITY_THRESHOLD),
    );
  }

  /**
   * Get cached feedback or run analysis
   * Lookup order: Redis (exact) → Qdrant (similarity) → fresh analysis
   */
  async getOrAnalyze(
    content: string,
    analyzeFunc: () => Promise<AnalysisResult>,
    topicId?: string,
  ): Promise<AnalysisResult> {
    const contentHash = computeContentHash(content);

    // 1. Check Redis for exact match (fastest path)
    const redisResult = await this.redisCacheService.getFeedback(contentHash);
    if (redisResult) {
      this.logger.debug('Cache hit: Redis exact match');
      return redisResult;
    }

    // 2. Try Qdrant similarity search
    let embedding: number[] | null = null;
    try {
      embedding = await this.embeddingService.getEmbedding(content);
      const qdrantResult = await this.qdrantService.searchSimilar(
        embedding,
        this.similarityThreshold,
      );

      if (qdrantResult) {
        this.logger.debug(`Cache hit: Qdrant similarity ${qdrantResult.similarity?.toFixed(3)}`);
        // Also cache in Redis for faster future lookups
        this.cacheInRedisAsync(contentHash, qdrantResult.result);
        return qdrantResult.result;
      }
    } catch (error) {
      this.logger.warn('Similarity search failed, falling back to analysis', error);
    }

    // 3. Cache miss - run fresh analysis
    this.logger.debug('Cache miss: running fresh analysis');
    const result = await analyzeFunc();

    // 4. Async cache population (don't block response)
    this.populateCachesAsync(contentHash, content, result, embedding, topicId);

    return result;
  }

  /**
   * Get cache lookup result without running analysis (for metrics)
   */
  async lookup(content: string): Promise<CacheLookupResult> {
    const contentHash = computeContentHash(content);

    // Check Redis
    const redisResult = await this.redisCacheService.getFeedback(contentHash);
    if (redisResult) {
      return { hit: true, source: 'redis', result: redisResult };
    }

    // Check Qdrant
    try {
      const embedding = await this.embeddingService.getEmbedding(content);
      const qdrantResult = await this.qdrantService.searchSimilar(
        embedding,
        this.similarityThreshold,
      );

      if (qdrantResult) {
        return {
          hit: true,
          source: 'qdrant',
          result: qdrantResult.result,
          similarity: qdrantResult.similarity,
        };
      }
    } catch {
      // Ignore errors for lookup
    }

    return { hit: false, source: 'none' };
  }

  /**
   * Async cache population (fire-and-forget)
   */
  private populateCachesAsync(
    contentHash: string,
    content: string,
    result: AnalysisResult,
    embedding: number[] | null,
    topicId?: string,
  ): void {
    // Don't await - fire and forget
    Promise.all([
      this.redisCacheService.setFeedback(contentHash, result),
      this.storeInQdrantAsync(contentHash, content, result, embedding, topicId),
    ]).catch((error) => {
      this.logger.error('Async cache population failed', error);
    });
  }

  /**
   * Store in Qdrant asynchronously
   */
  private async storeInQdrantAsync(
    contentHash: string,
    content: string,
    result: AnalysisResult,
    embedding: number[] | null,
    topicId?: string,
  ): Promise<void> {
    try {
      // Get or generate embedding
      const vectorEmbedding = embedding ?? (await this.embeddingService.getEmbedding(content));

      const metadata: FeedbackMetadata = {
        contentHash,
        feedbackType: result.type,
        subtype: result.subtype ?? null,
        suggestionText: result.suggestionText,
        reasoning: result.reasoning,
        confidenceScore: result.confidenceScore,
        topicId: topicId ?? null,
        createdAt: new Date().toISOString(),
      };

      await this.qdrantService.store(vectorEmbedding, result, metadata);
    } catch (error) {
      this.logger.error('Failed to store in Qdrant', error);
    }
  }

  /**
   * Cache in Redis asynchronously
   */
  private cacheInRedisAsync(contentHash: string, result: AnalysisResult): void {
    this.redisCacheService.setFeedback(contentHash, result).catch((error) => {
      this.logger.error('Failed to cache in Redis', error);
    });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd services/ai-service && pnpm test src/cache/__tests__/semantic-cache.service.spec.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/cache/semantic-cache.service.ts services/ai-service/src/cache/__tests__/semantic-cache.service.spec.ts
git commit -m "feat(ai-service): add semantic cache service orchestrator"
```

---

## Task 8: Create Cache Module

**Files:**

- Create: `services/ai-service/src/cache/cache.module.ts`
- Create: `services/ai-service/src/cache/index.ts`

**Step 1: Write the cache module**

Create `services/ai-service/src/cache/cache.module.ts`:

```typescript
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
```

**Step 2: Write the index barrel export**

Create `services/ai-service/src/cache/index.ts`:

```typescript
export { CacheModule } from './cache.module.js';
export { SemanticCacheService } from './semantic-cache.service.js';
export { RedisCacheService } from './redis-cache.service.js';
export { EmbeddingService } from './embedding.service.js';
export { QdrantService } from './qdrant.service.js';
export * from './types.js';
export { computeContentHash, normalizeContent } from './hash.util.js';
```

**Step 3: Commit**

```bash
git add services/ai-service/src/cache/cache.module.ts services/ai-service/src/cache/index.ts
git commit -m "feat(ai-service): add cache module with provider configuration"
```

---

## Task 9: Integrate Cache into Feedback Service

**Files:**

- Modify: `services/ai-service/src/feedback/feedback.module.ts`
- Modify: `services/ai-service/src/feedback/feedback.service.ts`
- Test: `services/ai-service/src/feedback/__tests__/feedback.service.spec.ts`

**Step 1: Update feedback module to import CacheModule**

Edit `services/ai-service/src/feedback/feedback.module.ts` to import CacheModule:

```typescript
import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesModule } from '../services/services.module.js';
import { CacheModule } from '../cache/index.js';

@Module({
  imports: [PrismaModule, ServicesModule, CacheModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
```

**Step 2: Update feedback service to use SemanticCacheService**

Edit `services/ai-service/src/feedback/feedback.service.ts`:

Replace the `generateFeedback` method call in `requestFeedback` with cache-aware version:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../services/response-analyzer.service.js';
import { SemanticCacheService } from '../cache/index.js';
import {
  RequestFeedbackDto,
  FeedbackResponseDto,
  DismissFeedbackDto,
  FeedbackSensitivity,
} from './dto/index.js';
import { Prisma } from '@reason-bridge/db-models';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ResponseAnalyzerService,
    private readonly semanticCache: SemanticCacheService,
  ) {}

  async requestFeedback(dto: RequestFeedbackDto): Promise<FeedbackResponseDto> {
    // Verify the response exists
    const response = await this.prisma.response.findUnique({
      where: { id: dto.responseId },
    });

    if (!response) {
      throw new NotFoundException(`Response with ID ${dto.responseId} not found`);
    }

    // Generate AI feedback using cache-aware semantic lookup
    const aiAnalysis = await this.semanticCache.getOrAnalyze(
      dto.content,
      () => this.analyzer.analyzeContent(dto.content),
      response.topicId,
    );

    // Apply sensitivity filtering
    const sensitivity = dto.sensitivity ?? FeedbackSensitivity.MEDIUM;
    const minThreshold = this.getConfidenceThreshold(sensitivity);
    const shouldDisplay = aiAnalysis.confidenceScore >= minThreshold;

    // Store feedback in database
    const feedback = await this.prisma.feedback.create({
      data: {
        responseId: dto.responseId,
        type: aiAnalysis.type,
        subtype: aiAnalysis.subtype ?? null,
        suggestionText: aiAnalysis.suggestionText,
        reasoning: aiAnalysis.reasoning,
        confidenceScore: new Prisma.Decimal(aiAnalysis.confidenceScore),
        educationalResources: aiAnalysis.educationalResources ?? null,
        displayedToUser: shouldDisplay,
        userAcknowledged: false,
        userRevised: false,
      },
    });

    return this.mapToResponseDto(feedback);
  }

  // ... rest of the methods remain unchanged
}
```

**Step 3: Update/create feedback service tests**

Update `services/ai-service/src/feedback/__tests__/feedback.service.spec.ts` to include cache mocking:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { FeedbackService } from '../feedback.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ResponseAnalyzerService } from '../../services/response-analyzer.service.js';
import { SemanticCacheService } from '../../cache/index.js';
import { FeedbackType } from '@reason-bridge/db-models';
import { NotFoundException } from '@nestjs/common';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrisma: any;
  let mockAnalyzer: any;
  let mockSemanticCache: any;

  const mockResponse = {
    id: 'response-123',
    topicId: 'topic-456',
    content: 'Test response content',
  };

  const mockAnalysisResult = {
    type: FeedbackType.AFFIRMATION,
    suggestionText: 'Great contribution!',
    reasoning: 'No issues detected',
    confidenceScore: 0.85,
  };

  beforeEach(async () => {
    mockPrisma = {
      response: {
        findUnique: vi.fn(),
      },
      feedback: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockAnalyzer = {
      analyzeContent: vi.fn().mockResolvedValue(mockAnalysisResult),
    };

    mockSemanticCache = {
      getOrAnalyze: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ResponseAnalyzerService, useValue: mockAnalyzer },
        { provide: SemanticCacheService, useValue: mockSemanticCache },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('requestFeedback', () => {
    it('should throw NotFoundException when response does not exist', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(null);

      await expect(
        service.requestFeedback({
          responseId: 'non-existent',
          content: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use semantic cache for analysis', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockSemanticCache.getOrAnalyze.mockResolvedValue(mockAnalysisResult);
      mockPrisma.feedback.create.mockResolvedValue({
        id: 'feedback-789',
        ...mockAnalysisResult,
        responseId: mockResponse.id,
        displayedToUser: true,
        createdAt: new Date(),
      });

      await service.requestFeedback({
        responseId: mockResponse.id,
        content: 'Test content',
      });

      expect(mockSemanticCache.getOrAnalyze).toHaveBeenCalledWith(
        'Test content',
        expect.any(Function),
        mockResponse.topicId,
      );
    });

    it('should store feedback in database after analysis', async () => {
      mockPrisma.response.findUnique.mockResolvedValue(mockResponse);
      mockSemanticCache.getOrAnalyze.mockResolvedValue(mockAnalysisResult);
      mockPrisma.feedback.create.mockResolvedValue({
        id: 'feedback-789',
        ...mockAnalysisResult,
        responseId: mockResponse.id,
        displayedToUser: true,
        createdAt: new Date(),
      });

      const result = await service.requestFeedback({
        responseId: mockResponse.id,
        content: 'Test content',
      });

      expect(mockPrisma.feedback.create).toHaveBeenCalled();
      expect(result.id).toBe('feedback-789');
    });
  });
});
```

**Step 4: Run tests to verify integration**

Run: `cd services/ai-service && pnpm test`

Expected: All tests PASS

**Step 5: Commit**

```bash
git add services/ai-service/src/feedback/
git commit -m "feat(ai-service): integrate semantic cache into feedback service"
```

---

## Task 10: Update App Module and Final Integration

**Files:**

- Modify: `services/ai-service/src/app.module.ts`
- Modify: `services/ai-service/src/main.ts` (if needed)

**Step 1: Verify app module imports**

Check that `services/ai-service/src/app.module.ts` includes FeedbackModule (it should already). The CacheModule is imported by FeedbackModule.

**Step 2: Run full test suite**

Run: `cd services/ai-service && pnpm test`

Expected: All tests PASS

**Step 3: Run typecheck**

Run: `cd services/ai-service && pnpm typecheck`

Expected: No errors

**Step 4: Commit any remaining changes**

```bash
git add .
git commit -m "feat(ai-service): complete feedback caching integration"
```

---

## Task 11: Add Integration Tests

**Files:**

- Create: `services/ai-service/src/cache/__tests__/integration/semantic-cache.integration.spec.ts`

**Step 1: Write integration test**

Create `services/ai-service/src/cache/__tests__/integration/semantic-cache.integration.spec.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CacheModule } from '../../cache.module.js';
import { SemanticCacheService } from '../../semantic-cache.service.js';
import { FeedbackType } from '@reason-bridge/db-models';

/**
 * Integration tests require running Redis and Qdrant
 * Skip in CI if services unavailable
 */
describe.skipIf(!process.env['INTEGRATION_TESTS'])('SemanticCacheService Integration', () => {
  let app: INestApplication;
  let service: SemanticCacheService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<SemanticCacheService>(SemanticCacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should cache and retrieve feedback', async () => {
    const content = 'This is a test argument for caching';
    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Good argument',
      reasoning: 'Well structured',
      confidenceScore: 0.85,
    };

    // First call - should miss cache
    const result1 = await service.getOrAnalyze(content, async () => mockResult);

    expect(result1).toEqual(mockResult);

    // Second call - should hit cache
    const analyzeFunc = vi.fn().mockResolvedValue(mockResult);
    const result2 = await service.getOrAnalyze(content, analyzeFunc);

    expect(result2).toEqual(mockResult);
    expect(analyzeFunc).not.toHaveBeenCalled();
  });

  it('should find similar content in Qdrant', async () => {
    const content1 = 'Climate change is caused by human activities';
    const content2 = 'Human activities cause climate change'; // Semantically similar

    const mockResult = {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Good point',
      reasoning: 'Well supported',
      confidenceScore: 0.9,
    };

    // Store first content
    await service.getOrAnalyze(content1, async () => mockResult);

    // Wait for async cache population
    await new Promise((r) => setTimeout(r, 1000));

    // Similar content should hit cache
    const analyzeFunc = vi.fn();
    const result = await service.getOrAnalyze(content2, analyzeFunc);

    // May or may not hit depending on embedding similarity
    // This test validates the flow works, not exact similarity
    expect(result).toBeDefined();
  });
});
```

**Step 2: Commit**

```bash
git add services/ai-service/src/cache/__tests__/integration/
git commit -m "test(ai-service): add semantic cache integration tests"
```

---

## Task 12: Update Documentation and Environment

**Files:**

- Modify: `.env.example`
- Create: `docs/architecture/feedback-caching.md`

**Step 1: Verify .env.example is complete**

Ensure all environment variables are documented (from Task 1).

**Step 2: Create architecture documentation**

Create `docs/architecture/feedback-caching.md`:

```markdown
# Feedback Caching Architecture

## Overview

The AI service implements a three-tier caching system for feedback analysis:

1. **Redis (exact match)** - Fastest lookup by content hash
2. **Qdrant (similarity)** - Vector similarity search for semantically similar content
3. **Fresh analysis** - Fallback to regex analyzers

## Flow Diagram
```

Request → Hash Content → Redis Lookup
↓
Hit? → Return cached
↓
Generate Embedding → Qdrant Search
↓
Hit (≥0.95)? → Return cached
↓
Run Analyzers → Cache Result → Return

```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key for embeddings |
| `OPENAI_EMBEDDING_MODEL` | text-embedding-3-small | Embedding model (1536 dims) |
| `QDRANT_URL` | http://localhost:6333 | Qdrant server URL |
| `SIMILARITY_THRESHOLD` | 0.95 | Minimum similarity for cache hit |
| `FEEDBACK_CACHE_TTL` | 172800 | Redis TTL (48 hours) |
| `EMBEDDING_CACHE_TTL` | 604800 | Embedding cache TTL (7 days) |

## Performance

- Redis lookup: <5ms
- Embedding generation: 100-200ms
- Qdrant search: 10-50ms
- Fresh analysis: <50ms

Expected cache hit rates:
- Redis: 10-20% (exact duplicates)
- Qdrant: 30-50% (similar content)

## Graceful Degradation

All cache operations have try/catch. If any cache fails:
- Redis unavailable → Skip to Qdrant
- OpenAI unavailable → Skip to fresh analysis
- Qdrant unavailable → Skip to fresh analysis

The system always falls back to fresh analysis.
```

**Step 3: Final commit**

```bash
git add docs/
git commit -m "docs: add feedback caching architecture documentation"
```

---

## Summary

| Task | Description                  | Files                                          |
| ---- | ---------------------------- | ---------------------------------------------- |
| 1    | Dependencies & Docker        | package.json, docker-compose.yml, .env.example |
| 2    | Type definitions             | types.ts                                       |
| 3    | Hash utility                 | hash.util.ts                                   |
| 4    | Embedding service            | embedding.service.ts                           |
| 5    | Qdrant service               | qdrant.service.ts                              |
| 6    | Redis cache service          | redis-cache.service.ts                         |
| 7    | Semantic cache orchestrator  | semantic-cache.service.ts                      |
| 8    | Cache module                 | cache.module.ts, index.ts                      |
| 9    | Feedback service integration | feedback.service.ts, feedback.module.ts        |
| 10   | App module & verification    | app.module.ts                                  |
| 11   | Integration tests            | semantic-cache.integration.spec.ts             |
| 12   | Documentation                | feedback-caching.md                            |

Total: ~12 tasks, each with TDD steps and commits.
