# Data Model: Real-Time Preview Feedback

**Feature**: 014-realtime-preview-feedback
**Date**: 2026-02-02
**Status**: Complete

## Overview

The preview feedback feature uses **hybrid caching** for performance while remaining ephemeral at the database level:

- **No PostgreSQL storage**: Unlike standard feedback, preview results are not persisted
- **Redis caching**: Exact content matches cached for 5 minutes (typing sessions)
- **Qdrant caching**: Semantic similarity matches cached for 30 minutes (rephrasing)

This approach delivers <50ms response times for 60-80% of requests during active composition.

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PreviewFeedbackDto                            │
│                        (Request Body)                               │
├─────────────────────────────────────────────────────────────────────┤
│  content: string          ← Draft text to analyze (min 20 chars)   │
│  discussionId?: UUID      ← Optional context for semantic caching   │
│  topicId?: UUID           ← Optional context for semantic caching   │
│  sensitivity?: enum       ← LOW | MEDIUM | HIGH (default: MEDIUM)   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (analysis)
┌─────────────────────────────────────────────────────────────────────┐
│                     PreviewFeedbackResultDto                        │
│                        (Response Body)                              │
├─────────────────────────────────────────────────────────────────────┤
│  feedback: PreviewFeedbackResponseDto[]  ← All detected items       │
│  primary?: PreviewFeedbackResponseDto    ← Highest priority item    │
│  readyToPost: boolean                    ← No critical issues       │
│  summary: string                         ← User-friendly message    │
│  analysisTimeMs: number                  ← Performance metric       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (contains)
┌─────────────────────────────────────────────────────────────────────┐
│                   PreviewFeedbackResponseDto                        │
│                       (Individual Item)                             │
├─────────────────────────────────────────────────────────────────────┤
│  type: FeedbackType       ← FALLACY | INFLAMMATORY | UNSOURCED |   │
│                             BIAS | AFFIRMATION                      │
│  subtype?: string         ← e.g., "strawman", "ad_hominem"          │
│  suggestionText: string   ← Actionable advice for the user          │
│  reasoning: string        ← Explanation of why flagged              │
│  confidenceScore: number  ← 0.00 to 1.00                            │
│  educationalResources?: object ← Links to learn more                │
│  shouldDisplay: boolean   ← Meets sensitivity threshold             │
└─────────────────────────────────────────────────────────────────────┘
```

## DTOs (Data Transfer Objects)

### PreviewFeedbackDto (Request)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| content | string | Yes | MinLength(20) | Draft text to analyze |
| discussionId | UUID | No | IsUUID | Context for semantic caching |
| topicId | UUID | No | IsUUID | Context for semantic caching |
| sensitivity | FeedbackSensitivity | No | IsEnum | Filtering threshold (default: MEDIUM) |

**Location**: `services/ai-service/src/feedback/dto/preview-feedback.dto.ts`

### PreviewFeedbackResultDto (Response)

| Field | Type | Description |
|-------|------|-------------|
| feedback | PreviewFeedbackResponseDto[] | All feedback items that meet sensitivity threshold |
| primary | PreviewFeedbackResponseDto? | Highest priority item (if any issues) |
| readyToPost | boolean | True if no critical issues detected |
| summary | string | User-friendly message about content status |
| analysisTimeMs | number | Time taken for analysis (ms) |

**Location**: `services/ai-service/src/feedback/dto/preview-feedback.dto.ts`

### PreviewFeedbackResponseDto (Item)

| Field | Type | Description |
|-------|------|-------------|
| type | string | FeedbackType enum value |
| subtype | string? | Specific categorization (e.g., "strawman") |
| suggestionText | string | Actionable advice |
| reasoning | string | Explanation for the user |
| confidenceScore | number | Confidence level (0.00-1.00) |
| educationalResources | object? | Links and resources |
| shouldDisplay | boolean | Meets sensitivity threshold |

**Location**: `services/ai-service/src/feedback/dto/preview-feedback.dto.ts`

## Enums

### FeedbackType

Existing Prisma enum, no changes needed.

```typescript
enum FeedbackType {
  FALLACY      // Logical reasoning errors
  INFLAMMATORY // Personal attacks, hostile language
  UNSOURCED    // Claims without evidence
  BIAS         // One-sided framing
  AFFIRMATION  // Positive feedback (no issues)
}
```

**Location**: `packages/db-models/prisma/schema.prisma`

### FeedbackSensitivity

Existing enum, no changes needed.

```typescript
enum FeedbackSensitivity {
  LOW    // Confidence >= 0.50 (show more feedback)
  MEDIUM // Confidence >= 0.70 (default)
  HIGH   // Confidence >= 0.85 (show less feedback)
}
```

**Location**: `services/ai-service/src/feedback/dto/request-feedback.dto.ts`

## Internal Types (Not DTOs)

### AnalysisResult (Internal)

Used by analyzer services, not exposed via API.

```typescript
interface AnalysisResult {
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources?: any;
}
```

**Location**: `services/ai-service/src/services/response-analyzer.service.ts`

## Database Schema

**No PostgreSQL changes required.**

Preview feedback is not persisted to the database. The existing `Feedback` table is used only for post-submission feedback (via `/feedback/request` endpoint).

## Cache Structures

### Tier 1: Redis Exact-Match Cache

| Field | Type | Description |
|-------|------|-------------|
| Key | string | `preview:${sha256(content)}` |
| Value | JSON | Serialized PreviewFeedbackResultDto |
| TTL | 300s | 5 minutes (covers typing sessions) |

**Example Key**: `preview:a1b2c3d4e5f6...` (64-char SHA-256 hash)

### Tier 2: Qdrant Semantic Cache

Uses existing `SemanticCacheService` infrastructure:

| Field | Type | Description |
|-------|------|-------------|
| Vector | float[1536] | OpenAI text-embedding-3-small |
| Payload | JSON | AnalysisResult[] from analyzers |
| Collection | string | `feedback_cache` (existing) |
| Similarity | float | 0.95 threshold for match |
| TTL | 1800s | 30 minutes |

**Lookup Flow**:
1. Generate embedding for content
2. Query Qdrant for vectors with similarity >= 0.95
3. If found, return cached analysis results
4. If not found, run fresh analysis and store

## Validation Rules

### Content Validation

| Rule | Value | Rationale |
|------|-------|-----------|
| Minimum length | 20 characters | Meaningful analysis requires sufficient content |
| Maximum length | None specified | Reasonable limit may be added for performance |
| Character types | Any | Support international content |

### Sensitivity Thresholds

| Level | Confidence Threshold | User Experience |
|-------|---------------------|-----------------|
| LOW | >= 0.50 | See all suggestions |
| MEDIUM | >= 0.70 | Balanced feedback |
| HIGH | >= 0.85 | Only high-confidence items |

### ReadyToPost Determination

Content is marked as NOT ready to post when:
- Any FALLACY with confidence >= 0.75
- Any INFLAMMATORY with confidence >= 0.75

This is implemented in `FeedbackService.previewFeedback()`.

## Data Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│ PreviewFeedbackDto │  (validated by class-validator)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│               FeedbackService.previewFeedback()              │
│                                                              │
│  1. Hash content → check Redis exact-match cache            │
│     └── HIT? Return cached result (~10ms)                   │
│                                                              │
│  2. MISS → Check Qdrant semantic cache                      │
│     └── HIT (similarity >= 0.95)? Return cached (~50ms)     │
│                                                              │
│  3. MISS → Run fresh analysis in parallel:                  │
│     ├── ToneAnalyzerService.analyze()                       │
│     ├── FallacyDetectorService.analyze()                    │
│     └── ClarityAnalyzerService.analyze()                    │
│                                                              │
│  4. Apply sensitivity filtering                              │
│  5. Determine primary feedback                               │
│  6. Calculate readyToPost                                    │
│  7. Generate summary message                                 │
│  8. Cache result (async, non-blocking):                     │
│     ├── Redis: exact hash → result (5 min TTL)              │
│     └── Qdrant: embedding → analysis (30 min TTL)           │
│  9. Return PreviewFeedbackResultDto                          │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│ PreviewFeedbackResultDto │  (serialized to JSON)
└─────────────────────┘
         │
         ▼
    Client Response

Expected latency:
  - Redis hit:     ~10ms  (60% of requests)
  - Qdrant hit:    ~50ms  (20% of requests)
  - Fresh analysis: ~300ms (20% of requests)
```

## Relationship to Existing Models

| Existing Model | Relationship | Notes |
|----------------|--------------|-------|
| FeedbackType | Reused | Same enum for consistency |
| FeedbackSensitivity | Reused | Same enum for consistency |
| Feedback (table) | None | Preview does not persist |
| Response (table) | None | Preview doesn't require existing response |
| Topic (table) | Reference only | Used for semantic caching context |
| Discussion (table) | Reference only | Used for semantic caching context |

## Migration Notes

**No database migrations required.**

All changes are in application code (DTOs, services). The existing database schema supports the preview feedback feature without modification.
