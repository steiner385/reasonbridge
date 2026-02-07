# Tasks: Topic Management

**Branch**: `016-topic-management` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Index

Total Tasks: 48 | Parallelizable: 23 | Sequential: 25

### By Phase
- Phase 1: Setup (5 tasks)
- Phase 2: Foundational (8 tasks)
- Phase 3: US1 - Create Topic (7 tasks)
- Phase 4: US4 - Discover Topics (6 tasks)
- Phase 5: US2 - Manage Status (5 tasks)
- Phase 6: US3 - Edit Topics (6 tasks)
- Phase 7: US5 - Analytics (5 tasks)
- Phase 8: US6 - Merge Topics (4 tasks)
- Phase 9: Polish (2 tasks)

### By Priority
- P1 (MVP): 20 tasks (US1, US4)
- P2: 5 tasks (US2)
- P3: 6 tasks (US3)
- P4: 5 tasks (US5)
- P5: 4 tasks (US6)
- Setup/Polish: 8 tasks

## Phase 1: Setup and Infrastructure

**Goal**: Prepare database schema, indexes, and shared infrastructure

- [X] T001 [P] Extend Topic model in Prisma schema with new fields (status, visibility, slug, lastActivityAt, participantCount, responseCount) - `packages/db-models/prisma/schema.prisma`
- [X] T002 Create TopicEdit entity in Prisma schema for edit history tracking - `packages/db-models/prisma/schema.prisma`
- [X] T003 Create TopicMerge entity in Prisma schema for merge operations - `packages/db-models/prisma/schema.prisma`
- [X] T004 Create TopicLink entity in Prisma schema for topic relationships - `packages/db-models/prisma/schema.prisma`
- [X] T005 Generate and run Prisma migration for new entities and indexes (tsvector GIN, slug unique, status/visibility composite) - `packages/db-models/prisma/migrations/`

**Dependencies**: None (start here)
**Validation**: Run `pnpm prisma:migrate dev` successfully, verify all entities and indexes created in PostgreSQL

---

## Phase 2: Foundational Services and DTOs

**Goal**: Build shared services and validation infrastructure needed by all user stories

- [X] T006 [P] Create CreateTopicDto with validation (title 10-200 chars, description 50-5000 chars, tags 1-5) - `services/discussion-service/src/topics/dto/create-topic.dto.ts`
- [X] T007 [P] Create UpdateTopicDto with validation (partial fields, edit reason required if >24h old) - `services/discussion-service/src/topics/dto/update-topic.dto.ts`
- [X] T008 [P] Create TopicFilterDto with validation (status, visibility, tags, dateRange, sortBy) - `services/discussion-service/src/topics/dto/topic-filter.dto.ts`
- [X] T009 [P] Create MergeTopicsDto with validation (sourceIds, targetId, merge reason) - `services/discussion-service/src/topics/dto/merge-topics.dto.ts`
- [X] T010 Implement TopicsSearchService with PostgreSQL tsvector full-text search and pg_trgm similarity - `services/discussion-service/src/topics/topics-search.service.ts`
- [X] T011 Implement duplicate detection in TopicsSearchService using hybrid trigram + embeddings approach - `services/discussion-service/src/topics/topics-search.service.ts`
- [X] T012 Implement TopicsEditService for edit history CRUD operations - `services/discussion-service/src/topics/topics-edit.service.ts`
- [X] T013 Create SlugGeneratorService for unique slug generation from titles - `services/discussion-service/src/topics/slug-generator.service.ts`

**Dependencies**: Phase 1 complete (T001-T005)
**Validation**: Unit tests for all DTOs and services with 80%+ coverage

---

## Phase 3: User Story 1 - Create a New Discussion Topic (P1 - MVP)

**Goal**: Enable authenticated users to create topics with validation and duplicate detection

**User Story**: As an authenticated user, I want to create a new discussion topic by providing a title, description, and tags, so that I can start a conversation on a subject I care about.

- [X] T014 [US1] Implement createTopic() method in TopicsService with slug generation and duplicate check - `services/discussion-service/src/topics/topics.service.ts`
- [X] T015 [US1] Add POST /topics endpoint in TopicsController with authentication guard - `services/discussion-service/src/topics/topics.controller.ts`
- [X] T016 [US1] Implement rate limiting for topic creation (5 per day per user) using NestJS Throttler - `services/discussion-service/src/topics/topics.controller.ts`
- [X] T017 [US1] Create CreateTopicModal component with form validation and duplicate warnings - `frontend/src/components/topics/CreateTopicModal.tsx`
- [X] T018 [US1] Create useCreateTopic hook for topic creation mutation with optimistic updates - `frontend/src/hooks/useCreateTopic.ts`
- [X] T019 [US1] Add "Create Topic" button to TopicsPage with modal trigger - `frontend/src/pages/Topics/TopicsPage.tsx`
- [X] T020 [US1] Write E2E test for complete topic creation flow including duplicate detection - `frontend/e2e/create-topic.spec.ts`

**Dependencies**: Phase 2 complete (T006, T010, T011, T013)
**Validation**: E2E test passes, user can create topic with duplicate warning, rate limit enforced
**MVP Checkpoint**: After this phase, users can create topics (core value delivered)

---

## Phase 4: User Story 4 - Discover and Filter Topics (P1 - MVP)

**Goal**: Enable users to search, filter, and discover relevant topics

**User Story**: As a user (authenticated or guest), I want to search and filter topics by keywords, tags, status, and recency, so that I can quickly find discussions relevant to my interests.

- [X] T021 [P] [US4] Extend GET /topics endpoint with filtering (status, visibility, tags, search) and pagination - `services/discussion-service/src/topics/topics.controller.ts`
- [X] T022 [P] [US4] Implement findTopics() method in TopicsService with full-text search integration - `services/discussion-service/src/topics/topics.service.ts`
- [X] T023 [P] [US4] Add Redis caching layer for topic listings (5min TTL, invalidate on create/update) - `services/discussion-service/src/topics/topics.service.ts`
- [X] T024 [US4] Create TopicFilters component with search bar, status/tag filters, and sort options - `frontend/src/components/topics/TopicFilters.tsx`
- [X] T025 [US4] Extend useTopics hook to support filtering and search parameters - `frontend/src/hooks/useTopics.ts`
- [X] T026 [US4] Write E2E test for topic search and filtering flows - `frontend/e2e/topic-search.spec.ts`

**Dependencies**: Phase 2 complete (T008, T010), Phase 3 complete (T014-T015)
**Validation**: E2E test passes, users can search/filter topics, results are cached
**MVP Checkpoint**: After this phase, users can find topics (discovery complete)

---

## Phase 5: User Story 2 - Manage Topic Status and Visibility (P2)

**Goal**: Enable creators and moderators to manage topic lifecycle states

**User Story**: As a topic creator or moderator, I want to change a topic's status (Active/Archived/Locked) and visibility (Public/Private/Unlisted), so that I can control participation and content lifecycle.

- [X] T027 [US2] Implement updateTopicStatus() method in TopicsService with permission checks - `services/discussion-service/src/topics/topics.service.ts`
- [X] T028 [US2] Add PATCH /topics/:id/status endpoint in TopicsController - `services/discussion-service/src/topics/topics.controller.ts`
- [X] T029 [US2] Create TopicStatusActions component with Archive/Lock/Reopen buttons - `frontend/src/components/topics/TopicStatusActions.tsx`
- [X] T030 [US2] Create useUpdateTopicStatus hook for status mutation - `frontend/src/hooks/useUpdateTopicStatus.ts`
- [X] T031 [US2] Write E2E test for status change workflows (archive, lock, reopen) - `frontend/e2e/topic-status.spec.ts`

**Dependencies**: Phase 3 complete (T014-T015)
**Validation**: E2E test passes, creators can change status, moderators have elevated permissions

---

## Phase 6: User Story 3 - Edit and Update Topic Details (P3)

**Goal**: Enable creators to edit topics with full history tracking

**User Story**: As a topic creator, I want to edit the title, description, or tags of my topic and see a history of all changes, so that I can refine the topic over time while maintaining transparency.

- [ ] T032 [US3] Implement updateTopic() method in TopicsService with edit history creation - `services/discussion-service/src/topics/topics.service.ts`
- [ ] T033 [US3] Add PATCH /topics/:id endpoint in TopicsController with edit reason validation - `services/discussion-service/src/topics/topics.controller.ts`
- [ ] T034 [US3] Add GET /topics/:id/history endpoint for edit history retrieval - `services/discussion-service/src/topics/topics.controller.ts`
- [ ] T035 [US3] Create EditTopicModal component with edit reason field and change preview - `frontend/src/components/topics/EditTopicModal.tsx`
- [ ] T036 [US3] Create TopicEditHistory component showing diff view of changes - `frontend/src/components/topics/TopicEditHistory.tsx`
- [ ] T037 [US3] Write E2E test for topic edit flow with history validation - `frontend/e2e/edit-topic.spec.ts`

**Dependencies**: Phase 2 complete (T007, T012), Phase 3 complete (T014-T015)
**Validation**: E2E test passes, edits are tracked in history, diff view displays correctly

---

## Phase 7: User Story 5 - Track Topic Participation and Analytics (P4)

**Goal**: Display participation metrics and engagement trends

**User Story**: As a user, I want to see analytics for a topic (views, responses, participants, engagement over time), so that I can gauge interest and activity levels.

- [ ] T038 [P] [US5] Create TopicAnalytics entity in Prisma schema for pre-aggregated metrics - `packages/db-models/prisma/schema.prisma`
- [ ] T039 [P] [US5] Run migration for TopicAnalytics table - `packages/db-models/prisma/migrations/`
- [ ] T040 [US5] Implement TopicsAnalyticsService with real-time and aggregated metrics calculation - `services/discussion-service/src/topics/topics-analytics.service.ts`
- [ ] T041 [US5] Add GET /topics/:id/analytics endpoint in TopicsController - `services/discussion-service/src/topics/topics.controller.ts`
- [ ] T042 [US5] Create TopicAnalytics component with charts (views, responses, participants over time) - `frontend/src/components/topics/TopicAnalytics.tsx`

**Dependencies**: Phase 3 complete (T014-T015)
**Validation**: Analytics display correctly, metrics update in real-time for recent data

---

## Phase 8: User Story 6 - Merge or Link Related Topics (P5)

**Goal**: Enable moderators to consolidate duplicate or related topics

**User Story**: As a moderator, I want to merge duplicate topics or link related topics together, so that conversations stay organized and users don't fragment discussions across multiple threads.

- [ ] T043 [US6] Implement mergeTopics() method in TopicsService with transaction and rollback support - `services/discussion-service/src/topics/topics.service.ts`
- [ ] T044 [US6] Add POST /topics/merge endpoint in TopicsController with moderator permission check - `services/discussion-service/src/topics/topics.controller.ts`
- [ ] T045 [US6] Create MergeTopicsModal component with source/target selection and merge preview - `frontend/src/components/topics/MergeTopicsModal.tsx`
- [ ] T046 [US6] Write E2E test for topic merge flow with rollback validation - `frontend/e2e/merge-topics.spec.ts`

**Dependencies**: Phase 2 complete (T009), Phase 3 complete (T014-T015)
**Validation**: E2E test passes, merge creates redirect, responses are preserved, rollback works

---

## Phase 9: Polish and Cross-Cutting Concerns

**Goal**: Final integration, performance optimization, and documentation

- [ ] T047 Update OpenAPI documentation in api-gateway with all new topic endpoints - `services/api-gateway/src/swagger/topics.yaml`
- [ ] T048 Add topic management user guide to frontend docs - `frontend/docs/user-guides/topic-management.md`

**Dependencies**: All previous phases complete
**Validation**: All tests pass, documentation is accurate, no lint errors

---

## Dependency Graph

```
T001-T005 (Setup)
    ↓
T006-T013 (Foundational)
    ↓
    ├─→ T014-T020 (US1: Create) ──→ T021-T026 (US4: Discover) ─┐
    │                     ↓                                       │
    │                  T027-T031 (US2: Status)                   │
    │                                                             │
    ├─→ T032-T037 (US3: Edit)                                   │
    │                                                             │
    ├─→ T038-T042 (US5: Analytics)                              │
    │                                                             │
    └─→ T043-T046 (US6: Merge)                                  │
                                    ↓                             │
                                T047-T048 (Polish) ←─────────────┘
```

## Parallel Execution Strategies

**Session 1: Setup + DTOs (Parallelizable)**
- Run T001-T005 sequentially (database migrations)
- Run T006-T009 in parallel (DTOs are independent)

**Session 2: Core Services (Partially Parallelizable)**
- T010, T011 sequential (search depends on duplicate detection)
- T012, T013 parallel (independent services)

**Session 3: MVP Features (2 branches)**
- Branch A: T014-T020 (Create Topic) → T027-T031 (Status)
- Branch B: T021-T026 (Discover Topics)
- These can run in parallel as they don't depend on each other

**Session 4: Extended Features (3 branches)**
- Branch A: T032-T037 (Edit Topics)
- Branch B: T038-T042 (Analytics)
- Branch C: T043-T046 (Merge Topics)
- All can run in parallel

**Session 5: Polish**
- T047-T048 sequentially after all features complete

## Testing Strategy

### Unit Tests (Vitest)
- All DTOs: Validation rules (T006-T009)
- TopicsService: Business logic for create, update, filter, merge (T014, T022, T027, T032, T043)
- TopicsSearchService: Duplicate detection algorithm (T011)
- SlugGeneratorService: Unique slug generation (T013)
- TopicsEditService: Edit history CRUD (T012)
- TopicsAnalyticsService: Metrics calculation (T040)

### Integration Tests (Vitest + Docker)
- Prisma queries with PostgreSQL (T014, T022, T032)
- Redis caching behavior (T023)
- Full-text search with tsvector (T010, T022)
- Transaction rollback for merge (T043)

### Contract Tests (Pact)
- POST /topics endpoint schema (T015)
- GET /topics with filters schema (T021)
- PATCH /topics/:id/status schema (T028)
- GET /topics/:id/history schema (T034)
- POST /topics/merge schema (T044)

### E2E Tests (Playwright)
- Create topic flow with duplicate warning (T020)
- Search and filter topics (T026)
- Change topic status (archive, lock, reopen) (T031)
- Edit topic with history view (T037)
- Merge topics with rollback (T046)

### Coverage Targets
- Services: 80%+ line coverage
- Controllers: 75%+ (mostly integration-tested)
- Components: 70%+ (focus on business logic, not UI rendering)

## Success Criteria Mapping

| Success Criterion | Validated By Tasks |
|-------------------|--------------------|
| SC-001: Topic creation completes within 2 seconds | T014, T015, T020 (E2E timing) |
| SC-002: Duplicate detection suggests similar topics with 80%+ accuracy | T011, T020 (E2E validation) |
| SC-003: Search results return within 1 second for 10,000 topics | T010, T022, T026 (E2E performance) |
| SC-004: Status changes propagate within 5 seconds | T027, T028, T031 (E2E timing) |
| SC-005: Edit history displays complete change log | T012, T032, T034, T037 (E2E validation) |
| SC-006: Analytics dashboard loads within 2 seconds | T040, T041, T042 (E2E timing) |
| SC-007: Topic merge completes within 10 seconds | T043, T044, T046 (E2E timing) |
| SC-008: 80%+ test coverage for business logic | All unit test tasks |

## Risk Mitigation

### High Risk: Full-Text Search Performance (T010, T022)
- **Mitigation**: Validate PostgreSQL tsvector performance with 10K test dataset before implementation
- **Fallback**: If <1s requirement not met, implement Elasticsearch integration
- **Validation**: Load test with 10K topics, measure p95 latency

### Medium Risk: Duplicate Detection Accuracy (T011)
- **Mitigation**: Implement hybrid approach (trigram + embeddings) with configurable thresholds
- **Validation**: Test with 100 topic pairs (50 duplicates, 50 unique), measure precision/recall
- **Target**: 85%+ accuracy for both exact and semantic duplicates

### Medium Risk: Redis Cache Invalidation (T023)
- **Mitigation**: Implement cache invalidation on all write operations (create, update, merge)
- **Validation**: Integration test verifying cache clears correctly
- **Monitoring**: Add cache hit/miss metrics to detect stale data

### Low Risk: Merge Transaction Rollback (T043)
- **Mitigation**: Comprehensive integration tests for transaction boundaries
- **Validation**: Test rollback scenarios (network failure, constraint violation)
- **Safety**: 30-day rollback window for manual intervention

## Notes

- **MVP Delivery**: Phases 1-4 (T001-T026) deliver core value (create + discover topics)
- **Incremental Value**: Each subsequent phase adds independent features
- **Independent Testing**: Each user story phase includes its own E2E tests
- **Parallel Development**: Multiple developers can work on different user stories simultaneously after Phase 2
- **Database Migrations**: Run T005 and T039 carefully in production (coordinate with DBA)
