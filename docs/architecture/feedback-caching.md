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
| `QDRANT_API_KEY` | - | Qdrant API key (optional for local) |
| `QDRANT_COLLECTION` | feedback_embeddings | Collection name |
| `SIMILARITY_THRESHOLD` | 0.95 | Minimum similarity for cache hit |
| `FEEDBACK_CACHE_TTL` | 172800 | Redis feedback cache TTL (48h in seconds) |
| `EMBEDDING_CACHE_TTL` | 604800 | Redis embedding cache TTL (7d in seconds) |

## Components

### SemanticCacheService

The main orchestrator that coordinates the caching flow:

```typescript
async getOrAnalyze(
  content: string,
  analyzeFunc: () => Promise<AnalysisResult>,
  topicId?: string,
): Promise<AnalysisResult>
```

### EmbeddingService

Generates and caches OpenAI embeddings:

- Uses `text-embedding-3-small` (1536 dimensions)
- Caches embeddings in Redis with 7-day TTL
- Cache key format: `feedback:embedding:{contentHash}`

### QdrantService

Vector similarity search:

- Collection: `feedback_embeddings`
- Distance metric: Cosine
- Threshold: 0.95 (configurable)
- Auto-creates collection on startup

### RedisCacheService

Exact-match caching:

- Cache key format: `feedback:exact:{contentHash}`
- TTL: 48 hours (configurable)
- Stores full `AnalysisResult`

## Cache Key Patterns

| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| Exact feedback match | `feedback:exact:{contentHash}` | 48 hours |
| Cached embedding | `feedback:embedding:{contentHash}` | 7 days |

## Qdrant Payload Schema

```json
{
  "contentHash": "sha256 hash of normalized content",
  "feedbackType": "FALLACY | INFLAMMATORY | UNSOURCED | BIAS | AFFIRMATION",
  "subtype": "string or null",
  "suggestionText": "feedback suggestion text",
  "reasoning": "explanation of the feedback",
  "confidenceScore": 0.85,
  "topicId": "topic UUID or null",
  "createdAt": "ISO8601 timestamp"
}
```

## Performance Expectations

| Operation | Latency | Cost |
|-----------|---------|------|
| Redis exact match | <5ms | Free |
| Redis embedding lookup | <5ms | Free |
| OpenAI embedding | 100-200ms | $0.00002/1K tokens |
| Qdrant similarity search | 10-50ms | Free (self-hosted) |
| Regex analyzers | <50ms | Free |
| Qdrant write (async) | 20-50ms | Free |

## Expected Cache Hit Rates

- Redis exact: 10-20% (duplicate content)
- Qdrant similarity: 30-50% (similar arguments)
- Fresh analysis: 30-60% (novel content)

## Error Handling

The system implements graceful degradation:

1. **OpenAI unavailable**: Skip embedding cache, fall through to analyzers
2. **Qdrant unavailable**: Skip similarity search, fall through to analyzers
3. **Redis unavailable**: Skip exact cache, continue to embedding/Qdrant
4. **All caches fail**: Graceful degradation to direct analysis (current behavior)

## Use Cases

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

## Docker Setup

Qdrant is included in `docker-compose.yml`:

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

## Testing

### Unit Tests

Each service has comprehensive unit tests:

- `embedding.service.spec.ts` - Tests embedding generation and caching
- `qdrant.service.spec.ts` - Tests vector similarity search
- `redis-cache.service.spec.ts` - Tests exact-match caching
- `semantic-cache.service.spec.ts` - Tests orchestration flow
- `hash.util.spec.ts` - Tests content normalization and hashing

### Integration Tests

Integration tests require running Redis and Qdrant:

```bash
INTEGRATION_TESTS=true pnpm --filter @reason-bridge/ai-service test
```

## Migration Notes

- No database migrations required
- Qdrant collection created on first startup
- Redis keys use new namespace, no conflicts
- Backward compatible: if caches unavailable, falls back to current behavior
