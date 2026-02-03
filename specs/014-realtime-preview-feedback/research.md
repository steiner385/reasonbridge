# Research: Real-Time Preview Feedback

**Feature**: 014-realtime-preview-feedback
**Date**: 2026-02-02
**Status**: Complete

## Executive Summary

Research confirms that the existing ai-service infrastructure supports the preview feedback feature with minimal changes. The core analysis services (ToneAnalyzerService, FallacyDetectorService, ClarityAnalyzerService) and their orchestration via ResponseAnalyzerService are already implemented and tested. The main gaps are:

1. **Authentication guard** on the preview endpoint (FR-015)
2. **Rate limiting** implementation (FR-016)
3. **Frontend components** for the inline feedback panel

## Existing Infrastructure

### Backend Services (ai-service)

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| FeedbackService.previewFeedback() | ✅ Exists | `feedback/feedback.service.ts:90-137` | Returns all items, readyToPost, summary |
| FeedbackController.previewFeedback() | ✅ Exists | `feedback/feedback.controller.ts:52-56` | POST /feedback/preview endpoint |
| PreviewFeedbackDto | ✅ Exists | `feedback/dto/preview-feedback.dto.ts` | Request validation with MinLength(20) |
| PreviewFeedbackResultDto | ✅ Exists | `feedback/dto/preview-feedback.dto.ts` | Response with feedback[], primary, readyToPost |
| ResponseAnalyzerService | ✅ Exists | `services/response-analyzer.service.ts` | Orchestrates analyzers in parallel |
| ToneAnalyzerService | ✅ Exists | `services/tone-analyzer.service.ts` | Detects inflammatory language |
| FallacyDetectorService | ✅ Exists | `services/fallacy-detector.service.ts` | Detects 7 fallacy types |
| ClarityAnalyzerService | ✅ Exists | `services/clarity-analyzer.service.ts` | Detects clarity issues |
| SemanticCacheService | ✅ Exists | `cache/semantic-cache.service.ts` | Optional caching for performance |

### Frontend Infrastructure

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| API client (feedback) | ❌ Needs creation | `lib/api/feedback.ts` | Add previewFeedback method |
| usePreviewFeedback hook | ❌ Needs creation | `hooks/usePreviewFeedback.ts` | Debounced TanStack Query hook |
| PreviewFeedbackPanel | ❌ Needs creation | `components/feedback/` | Inline panel below compose |
| FeedbackItem | ⚠️ May exist | `components/feedback/` | Check for reusable component |
| ReadyToPostIndicator | ❌ Needs creation | `components/feedback/` | Visual ready state |

### Authentication & Rate Limiting

| Component | Status | Notes |
|-----------|--------|-------|
| JWT Auth Guard | ✅ Exists in api-gateway | NestJS @UseGuards pattern |
| Rate limiting | ⚠️ Needs configuration | Use @nestjs/throttler with 10 req/min |

## Technical Decisions

### TD-001: Debounce Strategy

**Decision**: Frontend debounce at 400ms (within 300-500ms spec range)

**Rationale**:
- 300ms feels too aggressive for normal typing
- 500ms feels sluggish when pausing between words
- 400ms balances responsiveness with API efficiency

### TD-002: Authentication Implementation

**Decision**: Use existing JWT guard from api-gateway via `@UseGuards(AuthGuard)`

**Rationale**:
- Consistent with other authenticated endpoints
- Already integrated with user context
- No additional auth infrastructure needed

### TD-003: Rate Limiting Implementation

**Decision**: Use @nestjs/throttler with per-user tracking

**Configuration**:
```typescript
@Throttle({ default: { limit: 10, ttl: 60000 } })
```

**Rationale**:
- 10 requests per 60 seconds matches FR-016
- TTL in milliseconds (60000ms = 1 minute)
- Integrates with existing NestJS patterns

### TD-004: Error Handling Strategy

**Decision**: Graceful degradation - compose always works, feedback optional

**Implementation**:
- On rate limit: Return 429 with retry-after header, UI shows "Feedback paused"
- On service error: Return empty feedback array, UI shows no feedback
- On timeout: Return partial results if available

### TD-005: Feedback Type Priority

**Decision**: Use existing priority order from ResponseAnalyzerService

```typescript
const typePriority = {
  FALLACY: 4,
  INFLAMMATORY: 3,
  UNSOURCED: 2,
  BIAS: 1,
  AFFIRMATION: 0,
};
```

**Rationale**: Already implemented and tested in selectBestFeedback()

### TD-006: Hybrid Caching Strategy

**Decision**: Use two-tier caching for preview feedback performance

**Architecture**:
```
Request → Exact Match Cache (Redis) → Semantic Cache (Qdrant) → Fresh Analysis
              ↓ hit                        ↓ hit                    ↓
           Return                       Return                   Cache & Return
```

**Tier 1: Exact Match Cache (Redis)**
- Key: `preview:${hash(content)}` (content hash)
- TTL: 5 minutes (covers typing sessions)
- Use case: User pauses typing, resumes without changes
- Latency: ~2-5ms

**Tier 2: Semantic Similarity Cache (Qdrant via SemanticCacheService)**
- Key: Content embedding vector
- Similarity threshold: 0.95 (very similar content)
- TTL: 30 minutes
- Use case: Minor wording changes, rephrasing
- Latency: ~20-50ms

**Implementation**:
```typescript
async previewFeedback(dto: PreviewFeedbackDto): Promise<PreviewFeedbackResultDto> {
  const contentHash = this.hashContent(dto.content);

  // Tier 1: Exact match
  const cached = await this.redisCache.get(`preview:${contentHash}`);
  if (cached) return cached;

  // Tier 2: Semantic similarity (existing infrastructure)
  const topicId = dto.topicId || dto.discussionId;
  const allResults = await this.semanticCache.getOrAnalyze(
    dto.content,
    () => this.analyzer.analyzeContentFull(dto.content),
    topicId,
  );

  // Build result and cache
  const result = this.buildPreviewResult(allResults, dto.sensitivity);
  await this.redisCache.set(`preview:${contentHash}`, result, 300); // 5 min TTL

  return result;
}
```

**Rationale**:
- Exact match is fastest for common case (user pausing while typing)
- Semantic cache catches minor edits and rephrasing
- Fresh analysis only when content is truly new
- Estimated cache hit rate: 60-80% during active composition

**Cache Invalidation**:
- No explicit invalidation needed (TTL-based)
- Preview feedback is advisory, not authoritative
- Slightly stale feedback is acceptable for real-time UX

## Performance Analysis

### Expected Performance with Hybrid Caching

| Scenario | Expected Time | Cache Tier |
|----------|---------------|------------|
| Exact content match | ~10ms | Redis (Tier 1) |
| Semantically similar | ~50-80ms | Qdrant (Tier 2) |
| Fresh analysis | ~250-350ms | None (cold) |

### Performance by Operation (Cold Path)

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Request validation | <5ms | class-validator |
| Redis cache check | ~3ms | Exact match lookup |
| Semantic cache check | ~30ms | Vector similarity (if Redis miss) |
| Parallel analysis | ~200-300ms | 3 analyzers (if both miss) |
| Cache write | ~5ms | Async, non-blocking |
| Response serialization | <10ms | DTO mapping |
| **Total (cold)** | **<350ms** | Within 500ms target |
| **Total (warm)** | **<50ms** | Excellent UX |

### Cache Hit Rate Estimates

| User Behavior | Estimated Hit Rate | Primary Tier |
|---------------|-------------------|--------------|
| Pausing while typing | 90%+ | Redis exact match |
| Minor edits (typos) | 70%+ | Semantic similarity |
| Significant rewrites | 20-30% | Semantic similarity |
| New content | 0% | Fresh analysis |

**Overall estimated hit rate during active composition: 60-80%**

### Optimization Notes

1. **Hybrid caching** (TD-006): Two-tier approach maximizes hit rate
2. **Parallel analysis**: All 3 analyzers run concurrently on cache miss
3. **Async cache write**: Don't block response on cache storage
4. **Early termination**: Could short-circuit if INFLAMMATORY detected (future optimization)

## Gaps and Mitigations

### Gap 1: Missing Authentication Guard

**Impact**: Currently anyone can call /feedback/preview
**Mitigation**: Add @UseGuards(JwtAuthGuard) decorator
**Effort**: Low - single line addition

### Gap 2: Missing Rate Limiting

**Impact**: No protection against abuse
**Mitigation**: Add @Throttle decorator with 10/min limit
**Effort**: Low - add @nestjs/throttler if not present, configure

### Gap 3: Missing Frontend Components

**Impact**: Users cannot see feedback
**Mitigation**: Create PreviewFeedbackPanel, usePreviewFeedback hook
**Effort**: Medium - new components, requires compose area integration

### Gap 4: Runtime Dependency Injection Issue

**Impact**: FeedbackService may be undefined in controller (discovered in prior testing)
**Mitigation**: Verify FeedbackModule imports and providers
**Effort**: Low - module configuration fix

## Dependencies

### Backend

- `@nestjs/throttler` - Rate limiting (may need to add)
- `@nestjs/passport` - JWT auth (already present via api-gateway)

### Frontend

- `@tanstack/react-query` - Already present, use for caching and retry
- `lodash.debounce` or custom debounce - For typing delay

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance exceeds 500ms | Low | Medium | Analyzers already parallel, cache available |
| Rate limit frustrates users | Low | Low | 10/min is generous for compose use case |
| Module injection issues | Medium | High | Test thoroughly after module changes |
| Frontend integration complexity | Low | Medium | Compose area likely has extension points |

## Recommendations

1. **Start with backend fixes**: Authentication guard and rate limiting are quick wins
2. **Verify module configuration**: Resolve dependency injection before frontend work
3. **Create minimal frontend first**: Simple panel showing feedback, expand later
4. **Test performance early**: Verify 500ms target before building full UI

## Next Steps

1. Phase 1: Generate data-model.md (mostly exists, document DTOs)
2. Phase 1: Generate API contracts (OpenAPI spec for /feedback/preview)
3. Phase 1: Generate quickstart.md (developer setup guide)
