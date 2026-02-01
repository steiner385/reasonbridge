# Feedback Caching Design (Redis)

**Issue**: #101 - [T105] Implement feedback caching (Redis)
**Date**: 2026-01-31
**Status**: Approved

## Overview

Add Redis-based caching to the AI feedback service to avoid re-analyzing identical content. This improves response times from 60-150ms to <5ms for cache hits.

## Cache Key Strategy

**Format**: `feedback:${sha256(content.trim().toLowerCase())}:${sensitivity}`

- Content is normalized (trimmed, lowercased) before hashing
- Sensitivity level included because threshold filtering affects results
- SHA256 provides collision-resistant, fixed-length keys

**Examples**:

```
feedback:a1b2c3d4...:LOW
feedback:a1b2c3d4...:MEDIUM
feedback:a1b2c3d4...:HIGH
```

## Architecture

### New Files

```
services/ai-service/src/cache/
├── cache.module.ts           # NestJS CacheModule with Redis
└── feedback-cache.service.ts # Feedback-specific caching logic
```

### Dependencies

```json
"@nestjs/cache-manager": "^3.1.0",
"cache-manager": "^7.2.8",
"cache-manager-redis-store": "^3.0.1",
"redis": "^4"
```

## API Design

### FeedbackCacheService

```typescript
@Injectable()
export class FeedbackCacheService {
  generateCacheKey(content: string, sensitivity: FeedbackSensitivity): string;
  getCachedFeedback(
    content: string,
    sensitivity: FeedbackSensitivity,
  ): Promise<CachedFeedbackResult | null>;
  cacheFeedback(
    content: string,
    sensitivity: FeedbackSensitivity,
    result: CachedFeedbackResult,
  ): Promise<void>;
  invalidate(content: string, sensitivity: FeedbackSensitivity): Promise<void>;
}
```

### CachedFeedbackResult

```typescript
interface CachedFeedbackResult {
  type: FeedbackType;
  subtype: string | null;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources: string[];
  cachedAt: string;
}
```

## Integration Flow

```
FeedbackService.requestFeedback(dto):
  1. Generate cache key from content + sensitivity
  2. Check Redis cache
     → HIT: Create DB record from cached result, return
     → MISS: Continue to step 3
  3. Run analyzers (tone, fallacy, clarity)
  4. Cache the result in Redis
  5. Create DB record
  6. Return response
```

## Error Handling

- **Redis unavailable**: Log warning, proceed without cache
- **Cache miss**: Return null, analyze fresh
- **Serialization errors**: Log error, skip caching for this request

Caching is an optimization - failures should never block feedback generation.

## Configuration

| Variable             | Default   | Description                   |
| -------------------- | --------- | ----------------------------- |
| `REDIS_HOST`         | localhost | Redis server hostname         |
| `REDIS_PORT`         | 6379      | Redis server port             |
| `REDIS_TLS`          | false     | Enable TLS for production     |
| `FEEDBACK_CACHE_TTL` | 3600      | Cache TTL in seconds (1 hour) |

## Performance Impact

| Scenario   | Before   | After                     |
| ---------- | -------- | ------------------------- |
| Cache hit  | N/A      | <5ms                      |
| Cache miss | 60-150ms | 80-180ms (+cache write)   |
| Redis down | N/A      | Same as before (graceful) |

## Testing Strategy

- Unit tests: Mock Redis, test hit/miss/error paths
- Integration tests: Real Redis via Docker, verify caching behavior
