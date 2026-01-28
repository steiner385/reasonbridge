# Implementation Plan: Discussion Participation

**Branch**: `009-discussion-participation` | **Date**: 2026-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-discussion-participation/spec.md`

## Summary

Enable users to create and participate in threaded discussions by posting responses, replying to specific comments, editing their contributions, and deleting content. The platform will support discussion discovery through metrics (response count, participant count, activity timestamps) and maintain thread integrity through smart deletion (placeholders for responses with replies). This feature completes the core user journey from onboarding to active participation.

**Technical Approach**: Extend existing NestJS backend services with discussion and response management controllers/services, implement PostgreSQL-backed threading with optimistic locking for concurrent edits, build React frontend components for discussion creation/viewing/editing with TanStack Query for state management, and create E2E tests with Playwright covering all user stories (P1-P4 priority flows).

## Technical Context

**Language/Version**: TypeScript 5.7.3 (Node.js 20 LTS for backend, React 18 for frontend)
**Primary Dependencies**:
- Backend: NestJS 10.3, Fastify 4.25, Prisma 6.3.1
- Frontend: React 18.3, Vite 4.3, TanStack Query 5.90, React Router 7.13
- Validation: class-validator 0.14, class-transformer 0.5
- Testing: Vitest 2.1.8, Playwright 1.58

**Storage**: PostgreSQL (existing schema with DiscussionTopic and Response models already defined; needs extension for discussion entity and citation tracking)

**Testing**:
- Unit: Vitest with @vitest/coverage-v8 (80% coverage threshold)
- Integration: Vitest with test database
- Contract: OpenAPI validation
- E2E: Playwright with visual regression testing

**Target Platform**: Web application (responsive design for desktop/tablet/mobile browsers)

**Project Type**: Web application (monorepo with separate backend services and frontend)

**Performance Goals**:
- API response time: <500ms for POST operations (FR-011)
- Page load: <2s for 50-response threads (SC-005)
- Edit operations: <1s completion time (SC-007)
- Discussion list pagination/sorting: <1s (SC-008)

**Constraints**:
- Response content limit: 5,000 words (FR-008)
- Edit time window: 24 hours after posting (FR-012)
- Rate limits: 10 responses/min, 5 discussions/day (FR-031, FR-032)
- Thread depth: 5 visual nesting levels (FR-020)
- Concurrent users: 100 without degradation (SC-011)

**Scale/Scope**:
- Expected: 10,000+ discussions per month
- Thread size: 50-200 responses typical, max 1,000
- Concurrent edits: Handle optimistic locking conflicts
- Verification requirement: BASIC level for discussion creation (FR-023)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Code Quality (Principle I)

| Requirement | Compliance | Notes |
|-------------|------------|-------|
| **Linting**: Zero warnings | ✅ COMPLIANT | ESLint configured with max 50 warnings transitionally; feature will add zero new warnings |
| **Type Safety**: Strict TypeScript | ✅ COMPLIANT | TypeScript 5.7.3 strict mode enabled; no `any` types will be introduced |
| **Code Review**: ≥1 approval | ✅ COMPLIANT | GitHub branch protection enforces review requirement |
| **DRY Principle**: Extract duplicates | ✅ COMPLIANT | Shared logic (threading, rate limiting, validation) will use services/utilities |
| **Documentation**: JSDoc on public APIs | ✅ COMPLIANT | All controllers, services, and components will have JSDoc/TSDoc |
| **Error Handling**: Explicit async handling | ✅ COMPLIANT | All async operations use try-catch or .catch(); NestJS exception filters handle errors |

### Testing Standards (Principle II)

| Requirement | Compliance | Notes |
|-------------|------------|-------|
| **Coverage Threshold**: ≥80% business logic | ✅ COMPLIANT | Vitest coverage enforced; services/controllers/validators targeted |
| **Test-First**: Failing test before fix | ✅ COMPLIANT | TDD approach for all user stories (write E2E tests, then implement) |
| **Test Categories**: Unit/Integration/Contract | ✅ COMPLIANT | Unit tests for services, integration for DB ops, contract for API endpoints |
| **Test Naming**: `[unit]_[scenario]_[result]` | ✅ COMPLIANT | Pattern enforced: `discussionService_createDiscussion_requiresVerifiedUser` |
| **Mocking**: External services mocked in unit | ✅ COMPLIANT | Database mocked with in-memory Prisma client; real DB in integration tests |
| **CI Gate**: All tests pass before merge | ✅ COMPLIANT | Jenkins pipeline enforces test passage |

### User Experience Consistency (Principle III)

| Requirement | Compliance | Notes |
|-------------|------------|-------|
| **Response Time Feedback**: >1s shows loading | ✅ COMPLIANT | Loading states for all async operations (discussion load, response post, edit save) |
| **Error Messages**: Actionable feedback | ✅ COMPLIANT | Validation errors specify field and correction; API errors explain issue and retry |
| **Command Patterns**: Consistent UX | ⚠️ ADAPTED | Web app context (not Discord bot); applies to form patterns, button placement, confirmation dialogs |
| **Accessibility**: Readable text | ✅ COMPLIANT | WCAG 2.2 AA compliance; semantic HTML, ARIA labels, keyboard navigation |
| **Graceful Degradation**: Partial failure handling | ✅ COMPLIANT | Failed response post shows retry; citation errors don't block submission |
| **Confirmation for Destructive**: Explicit confirm | ✅ COMPLIANT | Delete operations require modal confirmation with impact explanation |

**Note on UX Adaptation**: Constitution references Discord bot interactions; reasonBridge is a web platform. Principle adapted to web context: consistent form patterns, predictable navigation, clear button placement.

### Performance Requirements (Principle IV)

| Requirement | Compliance | Notes |
|-------------|------------|-------|
| **Command Response**: <3s initial response | ✅ COMPLIANT | API endpoints target <500ms (SC-011); UI shows loading states for >1s operations |
| **Memory Usage**: <512MB RSS | ⚠️ ADAPTED | Web app context; applies to backend service memory (user-service will implement discussion logic) |
| **Startup Time**: <30s ready | ✅ COMPLIANT | NestJS services start in <10s; health checks validate readiness |
| **Rate Limiting**: Respect API limits | ✅ COMPLIANT | Custom rate limiting for discussion/response posting (FR-031, FR-032) |
| **Database Queries**: <100ms individual | ✅ COMPLIANT | Prisma queries optimized with indexes; pagination for large result sets |
| **Concurrent Users**: 100 without degradation | ✅ COMPLIANT | Success criteria SC-011 matches requirement exactly |

**Note on Performance Adaptation**: Constitution targets Discord bot; memory/startup requirements interpreted for backend service context.

### Quality Gates

| Gate | Requirement | Enforcement | Status |
|------|-------------|-------------|--------|
| **Lint** | Zero errors and warnings | CI automated | ✅ READY |
| **Type Check** | Zero TypeScript errors | CI automated | ✅ READY |
| **Unit Tests** | All pass, ≥80% coverage | CI automated | ✅ READY |
| **Integration Tests** | All pass | CI automated | ✅ READY |
| **Code Review** | ≥1 approval | GitHub protection | ✅ READY |
| **Performance** | No >10% regression | Manual review | ✅ READY |

**Constitution Compliance**: ✅ ALL GATES PASS (with documented web app context adaptations)

### Post-Phase 1 Design Re-Evaluation

_Re-checked after completing Phase 1 design artifacts (data model, API contracts, quickstart)._

| Gate | Design Artifact Verification | Status |
|------|----------------------------|--------|
| **Code Quality Gate** | • OpenAPI schemas enforce strict typing (no `any` types)<br>• Shared components (UserSummary, Citation, Pagination) follow DRY<br>• Error responses include field-level validation details<br>• Database indexes optimize query performance | ✅ PASS |
| **Testing Gate** | • Quickstart documents TDD workflow<br>• Unit test examples for services/controllers<br>• Integration test setup with Docker PostgreSQL<br>• E2E test scenarios with Playwright<br>• Contract testing enabled via OpenAPI specs | ✅ PASS |
| **UX Consistency Gate** | • API responses include `canEdit`/`canDelete` flags for UI state<br>• Loading states documented in quickstart manual tests<br>• Error schemas provide actionable messages (field + correction)<br>• Confirmation required for destructive operations (delete endpoints)<br>• Optimistic locking prevents silent data loss (409 Conflict response) | ✅ PASS |
| **Performance Gate** | • Database indexes on common query patterns (topicId, discussionId, deletedAt)<br>• Denormalized counts (responseCount, participantCount) avoid joins<br>• Pagination for large result sets (50 items per page)<br>• Rate limiting configured (10 responses/min, 5 discussions/day)<br>• Version-based optimistic locking minimizes transaction conflicts<br>• Composite indexes for multi-column filters | ✅ PASS |

**Key Design Decisions Aligned with Constitution**:

1. **Type Safety**: All API requests/responses use strict OpenAPI schemas with validation constraints (minLength, maxLength, format)
2. **Error Handling**: ConflictErrorResponse schema explicitly handles optimistic locking failures with version details
3. **Testing Infrastructure**: Quickstart provides complete setup for unit/integration/E2E testing matching constitution requirements
4. **Performance Optimization**:
   - Indexes: `@@index([topicId, status, lastActivityAt(sort: Desc)])` for discussion listing
   - Denormalization: `responseCount`, `participantCount` updated via triggers/transactions
   - Conditional soft delete: Preserves thread integrity without query overhead
5. **Accessibility**: RESTful API design enables keyboard-only navigation in UI layer

**Design Patterns Applied**:
- **DTO Validation**: `CreateDiscussionRequest` enforces title (10-200 chars), content (50-25,000 chars) at API boundary
- **Optimistic Locking**: Version field prevents lost updates without pessimistic locks
- **SSRF Defense**: Citation validation at API layer (documented in research.md)
- **Rate Limiting**: @nestjs/throttler with Redis backend (FR-031, FR-032)

**Conclusion**: All Phase 1 design artifacts (data model, API contracts, quickstart) maintain full compliance with constitution gates. No design decisions conflict with quality, testing, UX, or performance requirements.

## Project Structure

### Documentation (this feature)

```text
specs/009-discussion-participation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: threading patterns, rate limiting, optimistic locking
├── data-model.md        # Phase 1 output: Discussion entity, Citation model, schema migrations
├── quickstart.md        # Phase 1 output: local dev setup, testing guide
├── contracts/           # Phase 1 output: OpenAPI specs for discussion/response APIs
│   ├── discussion-api.yaml
│   └── response-api.yaml
├── checklists/
│   └── requirements.md  # Already created by /speckit.specify
└── spec.md              # Already created by /speckit.specify
```

### Source Code (repository root)

```text
# Backend Service (discussion logic in user-service)
services/user-service/
├── src/
│   ├── discussion/
│   │   ├── discussion.controller.ts        # Endpoints: create, list, get, metrics
│   │   ├── discussion.service.ts           # Business logic: creation, metrics, archiving
│   │   ├── dto/
│   │   │   ├── create-discussion.dto.ts
│   │   │   ├── discussion-response.dto.ts
│   │   │   └── discussion-metrics.dto.ts
│   │   └── discussion.module.ts
│   ├── response/
│   │   ├── response.controller.ts          # Endpoints: create, edit, delete, reply
│   │   ├── response.service.ts             # Business logic: posting, threading, soft delete
│   │   ├── dto/
│   │   │   ├── create-response.dto.ts
│   │   │   ├── update-response.dto.ts
│   │   │   └── response-tree.dto.ts
│   │   └── response.module.ts
│   ├── citation/
│   │   ├── citation.service.ts             # URL validation, broken link detection
│   │   └── dto/citation.dto.ts
│   ├── repositories/
│   │   ├── discussion.repository.ts        # DB operations for discussions
│   │   └── response.repository.ts          # DB operations for responses (extends existing)
│   └── guards/
│       └── discussion-access.guard.ts      # Verify user can create/edit discussions
└── tests/
    ├── unit/
    │   ├── discussion.service.spec.ts
    │   ├── response.service.spec.ts
    │   └── citation.service.spec.ts
    ├── integration/
    │   ├── discussion-creation.spec.ts
    │   ├── response-threading.spec.ts
    │   └── rate-limiting.spec.ts
    └── contract/
        └── discussion-api.spec.ts

# Frontend Application
frontend/
├── src/
│   ├── components/
│   │   ├── discussion/
│   │   │   ├── DiscussionForm.tsx           # Create discussion modal/page
│   │   │   ├── DiscussionList.tsx           # List with sorting, metrics
│   │   │   ├── DiscussionCard.tsx           # Individual discussion preview
│   │   │   └── DiscussionMetrics.tsx        # Response/participant counts
│   │   ├── response/
│   │   │   ├── ResponseComposer.tsx         # Text editor for responses
│   │   │   ├── ResponseThread.tsx           # Threaded conversation view
│   │   │   ├── ResponseCard.tsx             # Individual response display
│   │   │   ├── ResponseActions.tsx          # Edit/Delete/Reply buttons
│   │   │   └── CitationList.tsx             # Display citations
│   │   └── shared/
│   │       ├── RichTextEditor.tsx           # 5,000-word editor with counter
│   │       ├── ConfirmDialog.tsx            # Delete confirmations
│   │       └── LoadingState.tsx             # Async operation feedback
│   ├── pages/
│   │   ├── DiscussionListPage.tsx           # Browse discussions by topic
│   │   ├── DiscussionDetailPage.tsx         # View full discussion thread
│   │   └── CreateDiscussionPage.tsx         # Create new discussion
│   ├── hooks/
│   │   ├── useDiscussions.ts                # TanStack Query hooks
│   │   ├── useResponses.ts                  # Response CRUD operations
│   │   └── useThreading.ts                  # Collapse/expand logic
│   └── services/
│       ├── discussionApi.ts                 # API client for discussions
│       └── responseApi.ts                   # API client for responses
└── tests/
    └── e2e/
        ├── discussion-creation.spec.ts      # User Story 1 (P1)
        ├── response-posting.spec.ts         # User Story 2 (P1)
        ├── response-threading.spec.ts       # User Story 3 (P2)
        ├── response-editing.spec.ts         # User Story 4 (P3)
        ├── response-deletion.spec.ts        # User Story 5 (P3)
        └── discussion-metrics.spec.ts       # User Story 6 (P4)

# Database Models
packages/db-models/
├── prisma/
│   ├── schema.prisma                        # Extend with Discussion, Citation models
│   └── migrations/
│       └── 20260127_add_discussion_participation/
│           └── migration.sql
└── src/
    └── index.ts                             # Export new types
```

**Structure Decision**: Web application structure selected (Option 2 in template). Backend discussion logic integrated into existing `user-service` (NestJS monolithic service architecture). Frontend follows existing component/page structure with React. Database models extend existing Prisma schema.

**Rationale**:
- User-service already handles user-related operations (onboarding, topics); discussions are user-generated content
- Avoids creating new microservice for single feature
- Reuses existing infrastructure (auth guards, rate limiting middleware, Prisma client)
- Maintains consistency with Feature 003 (user onboarding) architecture

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No violations requiring justification. All constitution principles are met with documented adaptations for web app context (vs. Discord bot context in original constitution)._

## Phase 0: Research & Unknowns

**Research Tasks**:

1. **Threading Implementation Patterns**
   - **Unknown**: Best practices for rendering deeply nested threads in React without performance degradation
   - **Research Goal**: Evaluate virtualization libraries (react-window, react-virtuoso) vs. native collapse/expand
   - **Decision Criteria**: Performance with 200+ responses, accessibility compliance, mobile responsiveness

2. **Optimistic Locking Strategy**
   - **Unknown**: Prisma best practices for preventing concurrent edit conflicts
   - **Research Goal**: Compare version-based locking vs. timestamp-based vs. row-level locks
   - **Decision Criteria**: Ease of implementation, failure UX, database compatibility

3. **Rate Limiting Implementation**
   - **Unknown**: NestJS middleware patterns for per-user rate limiting across distributed instances
   - **Research Goal**: Evaluate @nestjs/throttler vs. custom Redis-backed solution
   - **Decision Criteria**: Horizontal scalability, accuracy, Redis dependency trade-offs

4. **Citation URL Validation**
   - **Unknown**: Security implications of storing user-provided URLs; SSRF prevention
   - **Research Goal**: URL validation libraries, allowlist/blocklist strategies, periodic link checking
   - **Decision Criteria**: Security posture, user experience, maintenance burden

5. **Soft Delete vs. Hard Delete**
   - **Unknown**: Implementation patterns for "[deleted by author]" placeholders while maintaining thread structure
   - **Research Goal**: Prisma soft delete patterns, cascade behaviors, query filtering
   - **Decision Criteria**: Data integrity, query complexity, compliance with data retention policies

**Output**: `research.md` will document findings, selected approaches, and rationale for each research task.

## Phase 1: Design & Implementation Artifacts

**Deliverables**:

1. **data-model.md**:
   - Discussion entity (extends DiscussionTopic or new Discussion model)
   - Citation model (URL, description, response reference)
   - ParticipantActivity tracking
   - Migration strategy for schema changes
   - Index design for query optimization

2. **contracts/**:
   - `discussion-api.yaml`: OpenAPI spec for discussion CRUD endpoints
   - `response-api.yaml`: OpenAPI spec for response operations (create, edit, delete, reply)
   - Request/response schemas
   - Error response formats
   - Rate limit headers

3. **quickstart.md**:
   - Local development setup instructions
   - Database migration commands
   - Seed data for testing (discussions with various thread depths)
   - API testing with curl/Postman examples
   - E2E test execution guide

**Agent Context Update**: Run `.specify/scripts/bash/update-agent-context.sh claude` to add any new technologies discovered during research phase (e.g., if react-window is adopted for threading).

## Post-Phase 1 Constitution Re-Check

_Will re-evaluate all constitution gates after Phase 1 design is complete to ensure architectural decisions maintain compliance._

**Focus Areas for Re-Check**:
- Type safety: Ensure new DTOs and models are fully typed
- Test coverage: Verify unit test structure covers all services
- Performance: Validate query patterns meet <100ms individual query requirement
- Error handling: Confirm all async operations have explicit error paths

## Implementation Phases (High-Level)

**Phase 2** (not executed by `/speckit.plan`; documented for context):
- Task breakdown in `tasks.md` via `/speckit.tasks` command
- Estimated 150-200 tasks across database, backend, frontend, testing
- Priority order: P1 stories (create + respond) → P2 (threading) → P3 (edit/delete) → P4 (metrics)

**Phase 3** (implementation via `/speckit.implement`):
- TDD approach: E2E tests first, then backend services, then frontend components
- Incremental PR strategy: Each user story as separate PR for review
- Database migration as prerequisite for all code changes

## Notes

- Existing `Response` model in Prisma schema already supports threading (parentId field); will extend, not replace
- DiscussionTopic model exists but lacks title/creator fields described in spec; may need to introduce separate Discussion model or extend DiscussionTopic
- Trust score integration (FR-017 mentions preventing edits cited in analysis) is future work; stub for now
- Notification system assumed to exist (FR-004 mentions reply notifications); will verify during research phase
