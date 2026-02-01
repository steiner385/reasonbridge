# Feedback Caching Design: Semantic Similarity with Qdrant

**Issue**: #101 - [T105] Implement feedback caching (Redis)
**Date**: 2026-02-01
**Status**: Approved

## Overview

Implement semantic similarity-based caching for AI feedback analysis using Qdrant vector database and OpenAI embeddings. This enables reusing feedback for semantically similar content, not just exact matches.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AI Service                                  │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │   Feedback   │───▶│   Semantic   │───▶│   Cache Providers     │  │
│  │   Service    │    │ Cache Service│    │  ┌───────┐ ┌───────┐  │  │
│  └──────────────┘    └──────────────┘    │  │ Redis │ │Qdrant │  │  │
│         │                   │            │  └───────┘ └───────┘  │  │
│         │                   ▼            └───────────────────────┘  │
│         │            ┌──────────────┐                               │
│         │            │   OpenAI     │                               │
│         │            │  Embeddings  │                               │
│         │            └──────────────┘                               │
│         ▼                                                            │
│  ┌──────────────┐                                                   │
│  │   Analyzers  │  (tone, clarity, fallacy)                        │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Lookup Flow

```
1. Compute content hash (SHA-256)
2. Check Redis for exact match
   ├── HIT → Return cached feedback (fastest path)
   └── MISS → Continue
3. Check Redis for cached embedding
   ├── HIT → Use cached embedding
   └── MISS → Generate embedding via OpenAI, cache it
4. Search Qdrant for similar vectors (threshold ≥ 0.95)
   ├── HIT → Return cached feedback
   └── MISS → Continue
5. Run regex analyzers (tone, clarity, fallacy)
6. Return feedback to user immediately
7. Async: Store result + embedding in Qdrant
8. Async: Store result in Redis (exact match cache)
```

## Components

### 1. SemanticCacheService

Main orchestrator for the caching layer.

```typescript
@Injectable()
export class SemanticCacheService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly qdrantService: QdrantService,
    private readonly redisCache: RedisCacheService,
  ) {}

  async getOrAnalyze(
    content: string,
    analyzeFunc: () => Promise<AnalysisResult>,
  ): Promise<AnalysisResult>;
}
```

### 2. EmbeddingService

Handles OpenAI embedding generation with Redis caching.

```typescript
@Injectable()
export class EmbeddingService {
  // Uses text-embedding-3-small (1536 dimensions)
  // Caches embeddings in Redis by content hash
  async getEmbedding(content: string): Promise<number[]>;
}
```

### 3. QdrantService

Vector database operations.

```typescript
@Injectable()
export class QdrantService {
  // Collection: "feedback_embeddings"
  // Dimensions: 1536 (text-embedding-3-small)
  async searchSimilar(embedding: number[], threshold: number): Promise<CachedFeedback | null>;
  async store(embedding: number[], feedback: AnalysisResult, metadata: FeedbackMetadata): Promise<void>;
}
```

### 4. RedisCacheService

Fast exact-match caching and embedding storage.

```typescript
@Injectable()
export class RedisCacheService {
  async getFeedback(contentHash: string): Promise<AnalysisResult | null>;
  async setFeedback(contentHash: string, result: AnalysisResult): Promise<void>;
  async getEmbedding(contentHash: string): Promise<number[] | null>;
  async setEmbedding(contentHash: string, embedding: number[]): Promise<void>;
}
```

## Cache Keys

| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| Exact feedback match | `feedback:exact:{contentHash}` | 48 hours |
| Cached embedding | `feedback:embedding:{contentHash}` | 7 days |

## Qdrant Collection Schema

**Collection**: `feedback_embeddings`

```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "payload": {
    "contentHash": "string",
    "feedbackType": "FALLACY | INFLAMMATORY | UNSOURCED | BIAS | AFFIRMATION",
    "subtype": "string | null",
    "suggestionText": "string",
    "reasoning": "string",
    "confidenceScore": "number",
    "topicId": "string | null",
    "createdAt": "ISO8601 string"
  }
}
```

## Configuration

Environment variables:

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=           # Optional, for Qdrant Cloud
QDRANT_COLLECTION=feedback_embeddings

# Similarity
SIMILARITY_THRESHOLD=0.95

# Redis (existing)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cache TTLs
FEEDBACK_CACHE_TTL=172800      # 48 hours in seconds
EMBEDDING_CACHE_TTL=604800     # 7 days in seconds
```

## Docker Compose Addition

```yaml
qdrant:
  image: qdrant/qdrant:v1.7.4
  container_name: reasonbridge-qdrant
  ports:
    - '6333:6333'
    - '6334:6334'
  volumes:
    - qdrant_data:/qdrant/storage
  environment:
    - QDRANT__SERVICE__GRPC_PORT=6334
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:6333/health']
    interval: 10s
    timeout: 5s
    retries: 5
```

## Use Cases Enabled

### A. Reuse Feedback for Similar Content
- High threshold (0.95) ensures semantic equivalence
- Saves analysis compute and latency
- Falls back to fresh analysis when unsure

### B. Related Discussions Discovery (Future)
- Query: "Find responses similar to this one"
- Lower threshold (0.7-0.8) for broader matches
- Surface related arguments across topics

### C. Pattern Analytics (Future)
- Aggregate by `feedbackType` and `subtype`
- Cluster similar responses to identify trends
- Platform-wide insights on argument quality

## Performance Expectations

| Operation | Latency | Cost |
|-----------|---------|------|
| Redis exact match | <5ms | Free |
| Redis embedding lookup | <5ms | Free |
| OpenAI embedding | 100-200ms | $0.00002/1K tokens |
| Qdrant similarity search | 10-50ms | Free (self-hosted) |
| Regex analyzers | <50ms | Free |
| Qdrant write (async) | 20-50ms | Free |

**Expected cache hit rates:**
- Redis exact: 10-20% (duplicate content)
- Qdrant similarity: 30-50% (similar arguments)
- Fresh analysis: 30-60% (novel content)

## Error Handling

1. **OpenAI unavailable**: Skip embedding cache, fall through to analyzers
2. **Qdrant unavailable**: Skip similarity search, fall through to analyzers
3. **Redis unavailable**: Skip exact cache, continue to embedding/Qdrant
4. **All caches fail**: Graceful degradation to direct analysis (current behavior)

## Testing Strategy

1. **Unit tests**: Each service in isolation with mocked dependencies
2. **Integration tests**: Full flow with test containers (Redis, Qdrant)
3. **Similarity threshold tests**: Verify 0.95 threshold produces quality matches
4. **Performance tests**: Measure latency improvements vs uncached

## Dependencies

```json
{
  "openai": "^4.x",
  "@qdrant/js-client-rest": "^1.x",
  "@nestjs/cache-manager": "^3.x",
  "cache-manager": "^7.x",
  "cache-manager-redis-store": "^3.x"
}
```

## File Structure

```
services/ai-service/src/
├── cache/
│   ├── cache.module.ts
│   ├── semantic-cache.service.ts
│   ├── redis-cache.service.ts
│   ├── qdrant.service.ts
│   ├── embedding.service.ts
│   └── __tests__/
│       ├── semantic-cache.service.spec.ts
│       ├── redis-cache.service.spec.ts
│       ├── qdrant.service.spec.ts
│       └── embedding.service.spec.ts
├── feedback/
│   └── feedback.service.ts  # Modified to use SemanticCacheService
└── ...
```

## Migration Notes

- No database migrations required
- Qdrant collection created on first startup
- Redis keys use new namespace, no conflicts
- Backward compatible: if caches unavailable, falls back to current behavior
