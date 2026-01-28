# Tasks: Discussion Participation

**Input**: Design documents from `/specs/009-discussion-participation/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `services/discussion-service/src/`
- **Frontend**: `frontend/src/`
- **Database**: `packages/db-models/prisma/`
- **Tests**: Co-located with implementation files in `__tests__/` directories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema

- [X] T001 [P] Create Prisma schema for Discussion entity in packages/db-models/prisma/schema.prisma
- [X] T002 [P] Create Prisma schema for Citation entity in packages/db-models/prisma/schema.prisma
- [X] T003 [P] Create Prisma schema for ParticipantActivity entity in packages/db-models/prisma/schema.prisma
- [X] T004 [P] Add version, deletedAt, editedAt, editCount fields to Response model in packages/db-models/prisma/schema.prisma
- [X] T005 [P] Add discussionId foreign key to Response model in packages/db-models/prisma/schema.prisma
- [X] T006 Create Phase 1 migration (additive): Add nullable discussionId, new tables in packages/db-models/prisma/migrations/
- [X] T007 Create Phase 2 backfill script to link existing responses to discussions in packages/db-models/scripts/backfill-discussions.ts
- [X] T008 Create Phase 3 migration (finalize): Make discussionId NOT NULL and add constraints in packages/db-models/prisma/migrations/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 [P] Configure @nestjs/throttler for rate limiting in services/discussion-service/src/app.module.ts
- [X] T010 [P] Create shared SSRF validation utility for citation URLs in services/discussion-service/src/utils/ssrf-validator.ts
- [X] T011 [P] Create base DTO classes for discussion requests/responses in services/discussion-service/src/dto/
- [X] T012 [P] Create base DTO classes for response requests/responses in services/discussion-service/src/dto/
- [X] T013 [P] Setup Prisma Client Extensions for soft delete logic in services/discussion-service/src/prisma/extensions/soft-delete.ts
- [X] T014 [P] Create shared error handling for optimistic locking conflicts in services/discussion-service/src/utils/optimistic-lock-handler.ts
- [X] T015 [P] Configure logging for discussion operations in services/discussion-service/src/utils/logger.ts
- [X] T016 Create discussion module structure in services/discussion-service/src/discussions/discussions.module.ts
- [X] T017 Create response module structure (extend existing) in services/discussion-service/src/responses/responses.module.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Start a New Discussion (Priority: P1) 🎯 MVP

**Goal**: Enable verified users to create discussions with title, initial response, and optional citations. Display discussions in topic lists.

**Independent Test**: User navigates to topic, clicks "Start Discussion", fills form, publishes, and sees discussion appear in topic list.

### Implementation for User Story 1

- [x] T018 [P] [US1] Create CreateDiscussionDto with validation (title 10-200 chars, content 50-25000 chars) in services/discussion-service/src/discussions/dto/create-discussion.dto.ts
- [x] T019 [P] [US1] Create DiscussionResponseDto with mapped fields in services/discussion-service/src/discussions/dto/discussion-response.dto.ts
- [x] T020 [P] [US1] Create CitationInputDto with URL validation in services/discussion-service/src/dto/citation-input.dto.ts
- [x] T021 [US1] Implement DiscussionService.createDiscussion() with verification check and transaction in services/discussion-service/src/discussions/discussions.service.ts
- [x] T022 [US1] Implement DiscussionService.listDiscussions() with filtering and pagination in services/discussion-service/src/discussions/discussions.service.ts
- [x] T023 [US1] Implement DiscussionController POST /discussions endpoint with rate limiting (5/day) in services/discussion-service/src/discussions/discussions.controller.ts
- [x] T024 [US1] Implement DiscussionController GET /discussions endpoint with query params in services/discussion-service/src/discussions/discussions.controller.ts
- [x] T025 [US1] Add unit tests for DiscussionService.createDiscussion() in services/discussion-service/src/discussions/__tests__/discussions.service.spec.ts
- [x] T026 [US1] Add unit tests for DiscussionService.listDiscussions() in services/discussion-service/src/discussions/__tests__/discussions.service.spec.ts
- [x] T027 [P] [US1] Create React DiscussionListPage component in frontend/src/pages/DiscussionListPage.tsx
- [x] T028 [P] [US1] Create React CreateDiscussionForm component in frontend/src/components/discussions/CreateDiscussionForm.tsx
- [x] T029 [P] [US1] Create React DiscussionCard component for list view in frontend/src/components/discussions/DiscussionCard.tsx
- [x] T030 [US1] Implement TanStack Query hooks for discussion creation in frontend/src/hooks/useCreateDiscussion.ts
- [x] T031 [US1] Implement TanStack Query hooks for discussion listing in frontend/src/hooks/useDiscussions.ts
- [x] T032 [US1] Add form validation for discussion creation in CreateDiscussionForm component
- [x] T033 [US1] Add E2E test for discussion creation flow in frontend/e2e/discussion-creation.spec.ts
- [x] T034 [US1] Add integration test for POST /discussions API endpoint in services/discussion-service/src/__tests__/discussions.integration.spec.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create and view discussions

---

## Phase 4: User Story 2 - Post Responses to Discussions (Priority: P1)

**Goal**: Enable users to post top-level responses to discussions with optional citations. Display responses in thread with author info.

**Independent Test**: User views discussion, clicks "Add Response", writes content, posts, and sees response appear at bottom of thread.

### Implementation for User Story 2

- [x] T035 [P] [US2] Create CreateResponseDto with validation (content 50-25000 chars) in services/discussion-service/src/responses/dto/create-response.dto.ts
- [x] T036 [P] [US2] Create ResponseDetailDto with threading support in services/discussion-service/src/responses/dto/response-detail.dto.ts
- [x] T037 [US2] Implement ResponseService.createResponse() with discussion validation in services/discussion-service/src/responses/responses.service.ts
- [x] T038 [US2] Implement ResponseService.getDiscussionResponses() with threading logic in services/discussion-service/src/responses/responses.service.ts
- [x] T039 [US2] Update ParticipantActivity counts when response is posted in ResponseService
- [x] T040 [US2] Implement ResponseController POST /responses endpoint with rate limiting (10/min) in services/discussion-service/src/responses/responses.controller.ts
- [x] T041 [US2] Implement ResponseController GET /responses endpoint in services/discussion-service/src/responses/responses.controller.ts
- [x] T042 [US2] Add unit tests for ResponseService.createResponse() in services/discussion-service/src/responses/__tests__/responses.service.spec.ts
- [x] T043 [P] [US2] Create React ResponseList component with threading display in frontend/src/components/responses/ResponseList.tsx
- [x] T044 [P] [US2] Create React ResponseItem component for individual response in frontend/src/components/responses/ResponseItem.tsx
- [x] T045 [P] [US2] Create React CreateResponseForm component in frontend/src/components/responses/CreateResponseForm.tsx
- [x] T046 [US2] Implement TanStack Query hooks for response creation in frontend/src/hooks/useCreateResponse.ts
- [x] T047 [US2] Implement TanStack Query hooks for response fetching in frontend/src/hooks/useResponses.ts
- [x] T048 [US2] Add optimistic updates for response posting in TanStack Query config
- [x] T049 [US2] Add E2E test for response posting flow in frontend/e2e/response-posting.spec.ts
- [x] T050 [US2] Add integration test for POST /responses API endpoint in services/discussion-service/src/__tests__/responses.integration.spec.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can create discussions and post responses

---

## Phase 5: User Story 3 - Reply to Specific Responses (Priority: P2)

**Goal**: Enable threaded replies to specific responses with visual nesting indicators. Support collapse/expand for threads.

**Independent Test**: User clicks "Reply" on response, composes reply, submits, and sees it nested under original with indentation.

### Implementation for User Story 3

- [ ] T051 [P] [US3] Create ReplyToResponseDto extending CreateResponseDto in services/discussion-service/src/responses/dto/reply-to-response.dto.ts
- [ ] T052 [US3] Implement ResponseService.replyToResponse() with parent validation in services/discussion-service/src/responses/responses.service.ts
- [ ] T053 [US3] Implement recursive threading logic in ResponseService.buildThreadTree() in services/discussion-service/src/responses/responses.service.ts
- [ ] T054 [US3] Add thread depth calculation (limit to 5 visual levels) in ResponseService
- [ ] T055 [US3] Implement ResponseController POST /responses/:id/replies endpoint in services/discussion-service/src/responses/responses.controller.ts
- [ ] T056 [US3] Add unit tests for threading logic in services/discussion-service/src/responses/__tests__/threading.spec.ts
- [ ] T057 [P] [US3] Create React ThreadedResponse component with recursive rendering in frontend/src/components/responses/ThreadedResponse.tsx
- [ ] T058 [P] [US3] Create React ReplyButton component in frontend/src/components/responses/ReplyButton.tsx
- [ ] T059 [P] [US3] Add collapse/expand state management for threads in frontend/src/components/responses/ThreadedResponse.tsx
- [ ] T060 [US3] Implement thread depth limit visual flattening (after level 5) in ThreadedResponse component
- [ ] T061 [US3] Add visual indentation styling for nested threads in frontend/src/styles/threading.css
- [ ] T062 [US3] Implement TanStack Query hooks for reply posting in frontend/src/hooks/useReplyToResponse.ts
- [ ] T063 [US3] Add E2E test for threaded reply flow in frontend/e2e/threaded-replies.spec.ts
- [ ] T064 [US3] Add integration test for POST /responses/:id/replies endpoint in services/discussion-service/src/__tests__/replies.integration.spec.ts

**Checkpoint**: All core participation features work - create discussions, post responses, thread replies

---

## Phase 6: User Story 4 - Edit Own Contributions (Priority: P3)

**Goal**: Allow users to edit their responses within 24h with optimistic locking. Display "edited" indicator with timestamp.

**Independent Test**: User edits own response, saves changes, and sees updated content with edit indicator.

### Implementation for User Story 4

- [ ] T065 [P] [US4] Create EditResponseDto with version field for optimistic locking in services/discussion-service/src/responses/dto/edit-response.dto.ts
- [ ] T066 [US4] Implement ResponseService.editResponse() with version check and 24h window in services/discussion-service/src/responses/responses.service.ts
- [ ] T067 [US4] Add version increment logic on successful edit in ResponseService
- [ ] T068 [US4] Add editedAt timestamp and editCount increment in ResponseService
- [ ] T069 [US4] Implement ResponseController PUT /responses/:id endpoint in services/discussion-service/src/responses/responses.controller.ts
- [ ] T070 [US4] Add ConflictException handling for version mismatch (409 response) in ResponseController
- [ ] T071 [US4] Add ForbiddenException for edit window expiration in ResponseController
- [ ] T072 [US4] Add unit tests for optimistic locking conflicts in services/discussion-service/src/responses/__tests__/edit-conflicts.spec.ts
- [ ] T073 [P] [US4] Create React EditResponseForm component in frontend/src/components/responses/EditResponseForm.tsx
- [ ] T074 [P] [US4] Create React EditIndicator component showing timestamp in frontend/src/components/responses/EditIndicator.tsx
- [ ] T075 [US4] Add edit button conditional rendering (only show for author, within 24h) in ResponseItem component
- [ ] T076 [US4] Implement TanStack Query hooks for response editing in frontend/src/hooks/useEditResponse.ts
- [ ] T077 [US4] Add conflict resolution UI for version mismatch errors in EditResponseForm
- [ ] T078 [US4] Add E2E test for response editing flow in frontend/e2e/response-editing.spec.ts
- [ ] T079 [US4] Add E2E test for optimistic locking conflict handling in frontend/e2e/edit-conflicts.spec.ts
- [ ] T080 [US4] Add integration test for PUT /responses/:id with version conflicts in services/discussion-service/src/__tests__/edit-integration.spec.ts

**Checkpoint**: Response editing with conflict prevention works correctly

---

## Phase 7: User Story 5 - Delete Own Contributions (Priority: P3)

**Goal**: Allow users to delete responses with conditional soft/hard delete. Maintain thread integrity with placeholders.

**Independent Test**: User deletes response (with and without replies) and sees appropriate removal/placeholder behavior.

### Implementation for User Story 5

- [ ] T081 [US5] Implement ResponseService.deleteResponse() with conditional logic in services/discussion-service/src/responses/responses.service.ts
- [ ] T082 [US5] Add soft delete logic (set deletedAt, replace content) for responses with replies in ResponseService
- [ ] T083 [US5] Add hard delete logic (permanent removal) for responses without replies in ResponseService
- [ ] T084 [US5] Update ParticipantActivity counts when response is deleted in ResponseService
- [ ] T085 [US5] Implement ResponseController DELETE /responses/:id endpoint in services/discussion-service/src/responses/responses.controller.ts
- [ ] T086 [US5] Add deletion type response (soft vs hard) in ResponseController
- [ ] T087 [US5] Add unit tests for conditional soft/hard delete logic in services/discussion-service/src/responses/__tests__/deletion.spec.ts
- [ ] T088 [P] [US5] Create React DeleteConfirmationDialog component in frontend/src/components/responses/DeleteConfirmationDialog.tsx
- [ ] T089 [P] [US5] Add delete button conditional rendering (only for author) in ResponseItem component
- [ ] T090 [US5] Implement TanStack Query hooks for response deletion in frontend/src/hooks/useDeleteResponse.ts
- [ ] T091 [US5] Add confirmation dialog with impact explanation (thread preservation) in DeleteConfirmationDialog
- [ ] T092 [US5] Add visual styling for soft-deleted responses ([deleted by author] placeholder) in frontend/src/styles/responses.css
- [ ] T093 [US5] Add E2E test for soft delete (response with replies) in frontend/e2e/soft-delete.spec.ts
- [ ] T094 [US5] Add E2E test for hard delete (response without replies) in frontend/e2e/hard-delete.spec.ts
- [ ] T095 [US5] Add integration test for DELETE /responses/:id endpoint in services/discussion-service/src/__tests__/deletion.integration.spec.ts

**Checkpoint**: Response deletion with thread integrity preservation works correctly

---

## Phase 8: User Story 6 - View Discussion Activity and Metrics (Priority: P4)

**Goal**: Display discussion metrics (response count, participant count, last activity) in lists. Enable sorting by activity/recency.

**Independent Test**: User views discussion list and sees accurate metrics, can sort by activity/response count.

### Implementation for User Story 6

- [ ] T096 [P] [US6] Create DiscussionMetricsDto with count fields in services/discussion-service/src/discussions/dto/discussion-metrics.dto.ts
- [ ] T097 [US6] Implement DiscussionService.getDiscussionMetrics() for individual discussion in services/discussion-service/src/discussions/discussions.service.ts
- [ ] T098 [US6] Add sorting logic (activity, recency, response count) to listDiscussions() in DiscussionService
- [ ] T099 [US6] Add participant list query for discussion in DiscussionService
- [ ] T100 [US6] Implement DiscussionController GET /discussions/:id/metrics endpoint in services/discussion-service/src/discussions/discussions.controller.ts
- [ ] T101 [US6] Implement DiscussionController GET /discussions/:id/participants endpoint in services/discussion-service/src/discussions/discussions.controller.ts
- [ ] T102 [US6] Add unit tests for metrics calculation in services/discussion-service/src/discussions/__tests__/metrics.spec.ts
- [ ] T103 [P] [US6] Create React DiscussionMetrics component showing counts/timestamps in frontend/src/components/discussions/DiscussionMetrics.tsx
- [ ] T104 [P] [US6] Create React ParticipantList component in frontend/src/components/discussions/ParticipantList.tsx
- [ ] T105 [P] [US6] Add sorting controls (activity, recency, count) to DiscussionListPage in frontend/src/pages/DiscussionListPage.tsx
- [ ] T106 [US6] Implement TanStack Query hooks for metrics fetching in frontend/src/hooks/useDiscussionMetrics.ts
- [ ] T107 [US6] Add visual highlighting for active discussions (recent activity) in DiscussionCard component
- [ ] T108 [US6] Add "inactive" badge for stale discussions (30+ days) in DiscussionCard component
- [ ] T109 [US6] Add E2E test for metrics display and sorting in frontend/e2e/discussion-metrics.spec.ts
- [ ] T110 [US6] Add integration test for metrics endpoints in services/discussion-service/src/__tests__/metrics.integration.spec.ts

**Checkpoint**: All user stories complete - full discussion participation feature ready

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T111 [P] Add JSDoc documentation to all public service methods in services/discussion-service/src/
- [ ] T112 [P] Add OpenAPI documentation decorators to all controller endpoints in services/discussion-service/src/
- [ ] T113 [P] Implement citation URL validation background job in services/discussion-service/src/jobs/validate-citations.job.ts
- [ ] T114 [P] Add monitoring metrics for discussion operations (creation rate, response rate) in services/discussion-service/src/utils/metrics.ts
- [ ] T115 [P] Add error boundary components for React components in frontend/src/components/ErrorBoundary.tsx
- [ ] T116 [P] Add accessibility improvements (ARIA labels, keyboard navigation) across frontend components
- [ ] T117 [P] Add loading skeletons for discussion/response lists in frontend/src/components/LoadingSkeleton.tsx
- [ ] T118 Code review and refactoring for DRY violations across all modules
- [ ] T119 Performance optimization: Add database query indexes per data-model.md
- [ ] T120 Security audit: Verify SSRF defense in citation validation
- [ ] T121 Run full test suite and achieve ≥80% coverage threshold
- [ ] T122 Run quickstart.md validation and update if needed
- [ ] T123 Update CLAUDE.md with feature completion status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User Stories 1-2 (P1): Core MVP - complete these first
  - User Story 3 (P2): Threading - can proceed after US1-2 or in parallel
  - User Stories 4-5 (P3): Edit/Delete - can proceed after US2 or in parallel
  - User Story 6 (P4): Metrics - can proceed after US1 or in parallel
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Needs US1 discussions to exist but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Builds on US2 responses but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Needs US2 responses to exist but independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Needs US2 responses to exist but independently testable
- **User Story 6 (P4)**: Can start after Foundational (Phase 2) - Needs US1 discussions but independently testable

### Within Each User Story

- DTOs and models can run in parallel
- Services depend on DTOs/models
- Controllers depend on services
- Frontend components can run in parallel with backend
- Tests can run in parallel with implementation (TDD approach)

### Parallel Opportunities

**Setup Phase (Phase 1)**: All tasks T001-T005 can run in parallel (different schema entities)

**Foundational Phase (Phase 2)**: Tasks T009-T015 can run in parallel (different files)

**User Story 1**:
- T018-T020 (DTOs) can run in parallel
- T027-T029 (React components) can run in parallel
- T030-T031 (React hooks) can run in parallel after T027-T029

**User Story 2**:
- T035-T036 (DTOs) can run in parallel
- T043-T045 (React components) can run in parallel
- T046-T047 (React hooks) can run in parallel

**User Story 3**:
- T057-T059 (React components) can run in parallel

**User Story 4**:
- T073-T074 (React components) can run in parallel

**User Story 5**:
- T088-T089 (React components) can run in parallel

**User Story 6**:
- T103-T105 (React components) can run in parallel

**Polish Phase**: All tasks T111-T117 can run in parallel (different concerns)

**Cross-Story Parallelization**: After Phase 2, different developers can work on different user stories simultaneously:
- Developer A: User Stories 1-2 (MVP)
- Developer B: User Story 3 (Threading)
- Developer C: User Stories 4-5 (Edit/Delete)

---

## Parallel Example: User Story 1

```bash
# Launch all DTO creation tasks together:
Task: "[US1] Create CreateDiscussionDto in services/discussion-service/src/discussions/dto/create-discussion.dto.ts"
Task: "[US1] Create DiscussionResponseDto in services/discussion-service/src/discussions/dto/discussion-response.dto.ts"
Task: "[US1] Create CitationInputDto in services/discussion-service/src/dto/citation-input.dto.ts"

# Launch all React components together:
Task: "[US1] Create DiscussionListPage in frontend/src/pages/DiscussionListPage.tsx"
Task: "[US1] Create CreateDiscussionForm in frontend/src/components/discussions/CreateDiscussionForm.tsx"
Task: "[US1] Create DiscussionCard in frontend/src/components/discussions/DiscussionCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (database schema) - T001-T008
2. Complete Phase 2: Foundational (rate limiting, validation, modules) - T009-T017
3. Complete Phase 3: User Story 1 (create and list discussions) - T018-T034
4. Complete Phase 4: User Story 2 (post responses) - T035-T050
5. **STOP and VALIDATE**: Test US1 and US2 independently
6. Deploy/demo if ready - basic discussion platform functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T017)
2. Add User Story 1 → Test independently → Deploy/Demo - discussions work (T018-T034)
3. Add User Story 2 → Test independently → Deploy/Demo - responses work (T035-T050)
4. Add User Story 3 → Test independently → Deploy/Demo - threading works (T051-T064)
5. Add User Story 4 → Test independently → Deploy/Demo - editing works (T065-T080)
6. Add User Story 5 → Test independently → Deploy/Demo - deletion works (T081-T095)
7. Add User Story 6 → Test independently → Deploy/Demo - metrics work (T096-T110)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T017)
2. Once Foundational is done:
   - **Developer A**: User Stories 1-2 (MVP) - T018-T050
   - **Developer B**: User Story 3 (Threading) - T051-T064
   - **Developer C**: User Stories 4-5 (Edit/Delete) - T065-T095
   - **Developer D**: User Story 6 (Metrics) - T096-T110
3. Stories complete and integrate independently
4. Team collaborates on Polish phase (T111-T123)

### TDD Workflow (Recommended)

For each user story:
1. Write E2E tests first (should fail)
2. Write integration tests (should fail)
3. Write unit tests (should fail)
4. Implement backend (tests pass)
5. Implement frontend (tests pass)
6. Run full test suite
7. Commit and move to next story

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database migrations follow 3-phase strategy (additive → backfill → finalize)
- Rate limiting: 5 discussions/day, 10 responses/minute
- Optimistic locking prevents concurrent edit conflicts
- Soft delete preserves thread integrity, hard delete for privacy
- Thread depth limited to 5 visual levels (flatten beyond)

---

## Summary

**Total Tasks**: 123
**MVP Tasks (US1-US2)**: 50 tasks (T001-T050)
**Full Feature Tasks**: 110 user story tasks (T001-T110) + 13 polish tasks

**Task Breakdown by User Story**:
- Setup: 8 tasks
- Foundational: 9 tasks
- User Story 1 (P1): 17 tasks
- User Story 2 (P1): 16 tasks
- User Story 3 (P2): 14 tasks
- User Story 4 (P3): 16 tasks
- User Story 5 (P3): 15 tasks
- User Story 6 (P4): 15 tasks
- Polish: 13 tasks

**Parallel Opportunities**: 42 tasks marked [P] can run in parallel within their phase

**Independent Test Criteria**:
- US1: Create discussion, verify in topic list
- US2: Post response, verify in thread
- US3: Reply to response, verify nesting
- US4: Edit response, verify indicator
- US5: Delete response, verify placeholder/removal
- US6: View metrics, verify accuracy

**Suggested MVP Scope**: Phases 1-4 (User Stories 1-2) = 50 tasks for basic discussion platform

**Format Validation**: ✅ All 123 tasks follow checklist format with checkbox, ID, optional [P] marker, [Story] label (where applicable), and file paths
