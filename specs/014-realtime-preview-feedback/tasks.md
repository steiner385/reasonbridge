# Tasks: Real-Time Preview Feedback

**Input**: Design documents from `/specs/014-realtime-preview-feedback/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests ARE included per constitution (Testing Standards principle - 80% coverage required).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `services/ai-service/src/`
- **Frontend**: `frontend/src/`
- **Tests**: `services/ai-service/src/__tests__/`, `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify dependencies and fix any module configuration issues

- [ ] T001 Verify @nestjs/throttler is installed in services/ai-service/package.json (add if missing)
- [ ] T002 [P] Verify Redis connection configuration in services/ai-service/src/cache/redis-cache.service.ts
- [ ] T003 [P] Fix FeedbackModule dependency injection issue in services/ai-service/src/feedback/feedback.module.ts (ensure all providers properly registered)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend authentication, rate limiting, and caching infrastructure - MUST complete before frontend work

**⚠️ CRITICAL**: No frontend work can begin until this phase is complete

- [ ] T004 Add JWT authentication guard to previewFeedback endpoint in services/ai-service/src/feedback/feedback.controller.ts
- [ ] T005 Configure rate limiting (10 req/min) for preview endpoint using @Throttle decorator in services/ai-service/src/feedback/feedback.controller.ts
- [ ] T006 Implement Redis exact-match cache layer (Tier 1) with hashContent() helper in services/ai-service/src/feedback/feedback.service.ts
- [ ] T007 Integrate SemanticCacheService (Tier 2) into previewFeedback() method in services/ai-service/src/feedback/feedback.service.ts
- [ ] T008 [P] Add unit test for hybrid caching logic in services/ai-service/src/__tests__/feedback.service.spec.ts
- [ ] T009 [P] Add integration test for /feedback/preview endpoint with auth in services/ai-service/src/__tests__/feedback-preview.integration.spec.ts

**Checkpoint**: Backend API complete with auth, rate limiting, and caching. Test via curl with JWT token.

---

## Phase 3: User Story 1 - View Feedback While Composing (Priority: P1) 🎯 MVP

**Goal**: Users see AI feedback in an inline panel below the compose area as they type (minimum 20 chars)

**Independent Test**: Open a discussion, type 20+ characters in compose area, observe feedback panel appearing without posting

### Tests for User Story 1

- [ ] T010 [P] [US1] E2E test: feedback appears after 20+ chars typed in frontend/e2e/preview-feedback.spec.ts
- [ ] T011 [P] [US1] E2E test: feedback updates when draft modified in frontend/e2e/preview-feedback.spec.ts
- [ ] T012 [P] [US1] E2E test: affirmation shown for constructive content in frontend/e2e/preview-feedback.spec.ts

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create previewFeedback API client method in frontend/src/lib/api/feedback.ts
- [ ] T014 [P] [US1] Create useDebouncedValue hook (400ms) in frontend/src/hooks/useDebouncedValue.ts
- [ ] T015 [US1] Create usePreviewFeedback hook with TanStack Query in frontend/src/hooks/usePreviewFeedback.ts (depends on T013, T014)
- [ ] T016 [P] [US1] Create FeedbackItem component for displaying single feedback in frontend/src/components/feedback/FeedbackItem.tsx
- [ ] T017 [US1] Create PreviewFeedbackPanel component (inline below compose) in frontend/src/components/feedback/PreviewFeedbackPanel.tsx (depends on T016)
- [ ] T018 [US1] Integrate PreviewFeedbackPanel into compose area in frontend/src/components/responses/ResponseComposer.tsx
- [ ] T019 [US1] Add loading state to PreviewFeedbackPanel for async feedback in frontend/src/components/feedback/PreviewFeedbackPanel.tsx
- [ ] T020 [US1] Handle service unavailable gracefully (compose still works) in frontend/src/hooks/usePreviewFeedback.ts

**Checkpoint**: User Story 1 complete. User can type in compose area and see live feedback. Test independently.

---

## Phase 4: User Story 2 - Understand Specific Issues (Priority: P1)

**Goal**: Users see ALL detected issues (not just one), each with type, suggestion, and reasoning

**Independent Test**: Compose content with multiple issues (e.g., "You're an idiot and everyone knows this is true"), verify both INFLAMMATORY and FALLACY feedback appear

### Tests for User Story 2

- [ ] T021 [P] [US2] E2E test: multiple issues displayed for content with multiple problems in frontend/e2e/preview-feedback.spec.ts
- [ ] T022 [P] [US2] E2E test: each feedback item shows type, suggestion, and reasoning in frontend/e2e/preview-feedback.spec.ts
- [ ] T023 [P] [US2] E2E test: feedback sorted by severity in frontend/e2e/preview-feedback.spec.ts

### Implementation for User Story 2

- [ ] T024 [US2] Enhance FeedbackItem to display full details (type badge, suggestion, reasoning) in frontend/src/components/feedback/FeedbackItem.tsx
- [ ] T025 [US2] Add educational resources expandable section to FeedbackItem in frontend/src/components/feedback/FeedbackItem.tsx
- [ ] T026 [US2] Display summary message in PreviewFeedbackPanel header in frontend/src/components/feedback/PreviewFeedbackPanel.tsx
- [ ] T027 [US2] Style feedback items by severity (FALLACY/INFLAMMATORY: error, others: warning) in frontend/src/components/feedback/FeedbackItem.tsx

**Checkpoint**: User Story 2 complete. Multiple feedback items display with full details. Test independently.

---

## Phase 5: User Story 3 - Ready-to-Post Indicator (Priority: P2)

**Goal**: Visual indicator showing when content is ready to post (no critical issues)

**Independent Test**: Type problematic content → see "revision suggested", edit to remove issues → see "ready to post"

### Tests for User Story 3

- [ ] T028 [P] [US3] E2E test: ready indicator shows green checkmark when no critical issues in frontend/e2e/preview-feedback.spec.ts
- [ ] T029 [P] [US3] E2E test: revision indicator shows when critical issues present in frontend/e2e/preview-feedback.spec.ts
- [ ] T030 [P] [US3] E2E test: indicator updates when user edits content in frontend/e2e/preview-feedback.spec.ts

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create ReadyToPostIndicator component in frontend/src/components/feedback/ReadyToPostIndicator.tsx
- [ ] T032 [US3] Integrate ReadyToPostIndicator into PreviewFeedbackPanel in frontend/src/components/feedback/PreviewFeedbackPanel.tsx
- [ ] T033 [US3] Add visual transition animation when readyToPost state changes in frontend/src/components/feedback/ReadyToPostIndicator.tsx
- [ ] T034 [US3] Connect Post button state to readyToPost (optional warning, not blocking) in frontend/src/components/responses/ResponseComposer.tsx

**Checkpoint**: User Story 3 complete. Ready indicator reflects content state. Test independently.

---

## Phase 6: User Story 4 - Adjust Feedback Sensitivity (Priority: P3)

**Goal**: Users can set sensitivity level (LOW/MEDIUM/HIGH) to see more or fewer suggestions

**Independent Test**: Set sensitivity to LOW → see more feedback, set to HIGH → see fewer feedback for same content

### Tests for User Story 4

- [ ] T035 [P] [US4] E2E test: LOW sensitivity shows more feedback items in frontend/e2e/preview-feedback.spec.ts
- [ ] T036 [P] [US4] E2E test: HIGH sensitivity shows fewer feedback items in frontend/e2e/preview-feedback.spec.ts
- [ ] T037 [P] [US4] E2E test: sensitivity preference persists in session in frontend/e2e/preview-feedback.spec.ts

### Implementation for User Story 4

- [ ] T038 [P] [US4] Create SensitivitySelector dropdown component in frontend/src/components/feedback/SensitivitySelector.tsx
- [ ] T039 [US4] Add sensitivity state to usePreviewFeedback hook in frontend/src/hooks/usePreviewFeedback.ts
- [ ] T040 [US4] Integrate SensitivitySelector into PreviewFeedbackPanel in frontend/src/components/feedback/PreviewFeedbackPanel.tsx
- [ ] T041 [US4] Store sensitivity preference in localStorage for persistence in frontend/src/hooks/usePreviewFeedback.ts
- [ ] T042 [US4] Pass sensitivity parameter to API calls in frontend/src/lib/api/feedback.ts

**Checkpoint**: User Story 4 complete. Sensitivity control affects feedback display. Test independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Performance verification, edge cases, documentation

- [ ] T043 Verify 500ms performance target with cache enabled (run load test) in services/ai-service/
- [ ] T044 [P] Add rate limit UI feedback ("Feedback paused, try again in X seconds") in frontend/src/components/feedback/PreviewFeedbackPanel.tsx
- [ ] T045 [P] Handle network timeout gracefully (show stale feedback or hide panel) in frontend/src/hooks/usePreviewFeedback.ts
- [ ] T046 [P] Add logging for cache hit/miss rates in services/ai-service/src/feedback/feedback.service.ts
- [ ] T047 Run quickstart.md validation scenarios (all curl commands pass)
- [ ] T048 [P] Accessibility audit for feedback panel (ARIA labels, keyboard navigation) in frontend/src/components/feedback/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all frontend work
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 - can run in parallel after Foundational
  - US3 (P2) can start after Foundational, independent of US1/US2
  - US4 (P3) can start after Foundational, independent of others
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core MVP functionality
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Enhances US1 display
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Adds visual indicator
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - User preference feature

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- API client before hooks
- Hooks before components
- Simple components before composite components
- Integration last within story

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003 can run in parallel

**Phase 2 (Foundational)**:
- T008, T009 can run in parallel (tests)

**Phase 3 (US1)**:
- T010, T011, T012 can run in parallel (E2E tests)
- T013, T014, T016 can run in parallel (independent modules)

**Phase 4 (US2)**:
- T021, T022, T023 can run in parallel (E2E tests)

**Phase 5 (US3)**:
- T028, T029, T030 can run in parallel (E2E tests)
- T031 is independent of other story work

**Phase 6 (US4)**:
- T035, T036, T037 can run in parallel (E2E tests)
- T038 is independent of other story work

**Phase 7 (Polish)**:
- T044, T045, T046, T048 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all E2E tests for User Story 1 together:
Task T010: "E2E test: feedback appears after 20+ chars typed in frontend/e2e/preview-feedback.spec.ts"
Task T011: "E2E test: feedback updates when draft modified in frontend/e2e/preview-feedback.spec.ts"
Task T012: "E2E test: affirmation shown for constructive content in frontend/e2e/preview-feedback.spec.ts"

# Launch independent modules for User Story 1 together:
Task T013: "Create previewFeedback API client method in frontend/src/lib/api/feedback.ts"
Task T014: "Create useDebouncedValue hook (400ms) in frontend/src/hooks/useDebouncedValue.ts"
Task T016: "Create FeedbackItem component in frontend/src/components/feedback/FeedbackItem.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all frontend)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test typing in compose area, see feedback appear
5. Deploy/demo if ready - users can see real-time feedback!

### Incremental Delivery

1. Setup + Foundational → Backend API ready with auth/caching
2. User Story 1 → Live feedback panel (MVP - ship this!)
3. User Story 2 → Multiple issues with full details
4. User Story 3 → Ready-to-post indicator
5. User Story 4 → Sensitivity control
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core feedback panel)
   - Developer B: User Story 3 (ready indicator - simpler)
3. After US1 done:
   - Developer A: User Story 2 (enhances US1 display)
   - Developer B: User Story 4 (sensitivity control)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify E2E tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend API (Phases 1-2) is largely complete - focus on frontend components
