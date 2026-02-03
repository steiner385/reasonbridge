# Implementation Plan: Real-Time Preview Feedback

**Branch**: `014-realtime-preview-feedback` | **Date**: 2026-02-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-realtime-preview-feedback/spec.md`

## Summary

Real-time AI-generated feedback for draft content during composition. The feature provides coaching to users before they post, detecting fallacies, inflammatory language, unsourced claims, and bias. Returns all detected issues with a readyToPost indicator and summary message. Target 500ms response time using existing analyzer services with semantic caching.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (Node.js 20 LTS)
**Primary Dependencies**:

- Backend: NestJS 10.x with Fastify adapter
- Frontend: React 18 with Vite, TanStack Query
- Validation: class-validator, class-transformer
- AI: @reason-bridge/ai-client (AWS Bedrock via OpenAI SDK)

**Storage**: PostgreSQL 15 via Prisma ORM (post-submission only), Redis 7 (exact-match cache), Qdrant (semantic cache)
**Testing**: Vitest (unit/integration), Playwright 1.58.0 (E2E)
**Target Platform**: Web application (frontend + backend microservices)
**Project Type**: Web application (monorepo with services/ and frontend/)
**Performance Goals**: 500ms response time for preview feedback (real-time feel)
**Constraints**: <500ms p95 latency, 10 requests/minute rate limit per user
**Scale/Scope**: Target 100 concurrent users with preview feedback

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | Status | Notes                                                               |
| ------------------------------- | ------ | ------------------------------------------------------------------- |
| I. Code Quality                 | ✅ Pass | TypeScript strict mode, NestJS patterns, existing service structure |
| II. Testing Standards           | ✅ Pass | Unit tests for analyzer, integration tests for API, E2E for frontend |
| III. User Experience Consistency | ✅ Pass | Inline feedback panel, loading states, graceful degradation         |
| IV. Performance Requirements    | ✅ Pass | 500ms target aligns with constitution's 3s command response         |

**Quality Gates**:

- Lint: CI automated via ESLint
- Type Check: CI automated via TypeScript strict
- Unit Tests: 80% coverage for business logic
- Integration Tests: API endpoint coverage
- Code Review: Required before merge

## Project Structure

### Documentation (this feature)

```text
specs/014-realtime-preview-feedback/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI spec)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
services/ai-service/
├── src/
│   ├── feedback/
│   │   ├── dto/
│   │   │   ├── preview-feedback.dto.ts     # Request/response DTOs
│   │   │   └── index.ts                    # DTO exports
│   │   ├── feedback.controller.ts          # POST /feedback/preview endpoint
│   │   ├── feedback.service.ts             # previewFeedback() method
│   │   └── feedback.module.ts              # Module configuration
│   └── services/
│       └── response-analyzer.service.ts    # analyzeContentFull() method
└── tests/
    ├── unit/
    │   └── feedback.service.spec.ts
    └── integration/
        └── feedback-preview.integration.spec.ts

frontend/
├── src/
│   ├── components/
│   │   └── feedback/
│   │       ├── PreviewFeedbackPanel.tsx    # Inline feedback display
│   │       ├── FeedbackItem.tsx            # Individual feedback item
│   │       └── ReadyToPostIndicator.tsx    # Ready status indicator
│   ├── hooks/
│   │   └── usePreviewFeedback.ts           # Debounced API hook
│   └── lib/
│       └── api/
│           └── feedback.ts                 # API client methods
└── e2e/
    └── preview-feedback.spec.ts            # E2E tests
```

**Structure Decision**: Web application structure following existing monorepo patterns. Backend changes in ai-service (feedback module), frontend changes in feedback components.

## Complexity Tracking

> No constitution violations. Feature uses existing patterns and infrastructure.

| Aspect              | Complexity | Justification                                      |
| ------------------- | ---------- | -------------------------------------------------- |
| New API Endpoint    | Low        | Follows existing feedback controller patterns      |
| Frontend Component  | Low        | Inline panel, reuses existing feedback display     |
| Rate Limiting       | Low        | Standard NestJS throttler with existing auth       |
| Hybrid Caching      | Medium     | Two-tier: Redis (exact) + Qdrant (semantic)        |
| Performance Target  | Low        | With caching, 60-80% requests <50ms                |

## Caching Architecture

**Two-Tier Hybrid Cache (TD-006 from research.md)**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │ ──▶ │ Redis Cache │ ──▶ │ Qdrant Cache│ ──▶ │  Analyzers  │
│             │     │ (exact hit) │     │ (semantic)  │     │  (fresh)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                         ~10ms              ~50ms              ~300ms
```

- **Tier 1 (Redis)**: Exact content hash match, 5-min TTL
- **Tier 2 (Qdrant)**: Semantic similarity (0.95 threshold), 30-min TTL
- **Expected hit rate**: 60-80% during active composition
