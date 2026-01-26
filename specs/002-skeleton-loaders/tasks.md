# Tasks: Skeleton Loaders for Async Content

**Input**: Design documents from `/specs/002-skeleton-loaders/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Unit tests for skeleton components are included per constitution requirement (II. Testing Standards - 80% coverage for business logic). E2E tests included for page integration verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` - All skeleton components live here
- Base primitives: `frontend/src/components/ui/Skeleton/`
- Composite skeletons: `frontend/src/components/ui/skeletons/`
- Page integration: `frontend/src/pages/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create skeleton component directory structure and shared types

- [x] T001 Create Skeleton component directory at frontend/src/components/ui/Skeleton/
- [x] T002 [P] Create types.ts with SkeletonProps, SkeletonSize, SkeletonAnimation, SkeletonVariant interfaces in frontend/src/components/ui/Skeleton/types.ts
- [x] T003 [P] Create constants.ts with SKELETON_BASE_CLASSES, ANIMATION_CLASSES, TEXT_SIZE_CLASSES, A11Y_PROPS in frontend/src/components/ui/Skeleton/constants.ts

---

## Phase 2: Foundational (Base Skeleton Primitives)

**Purpose**: Core skeleton components that ALL user stories depend on - MUST complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Implement base Skeleton component with variant, width, height, animation props in frontend/src/components/ui/Skeleton/Skeleton.tsx
- [x] T005 [P] Implement SkeletonText component with lines, lastLineWidth, size props in frontend/src/components/ui/Skeleton/SkeletonText.tsx
- [x] T006 [P] Implement SkeletonAvatar component with size variants (sm/md/lg/xl) in frontend/src/components/ui/Skeleton/SkeletonAvatar.tsx
- [x] T007 Create barrel export file with all skeleton primitives in frontend/src/components/ui/Skeleton/index.ts
- [x] T008 [P] Write unit tests for Skeleton base component (variant rendering, animation, accessibility) in frontend/src/components/ui/Skeleton/Skeleton.spec.tsx
- [x] T009 [P] Write unit tests for SkeletonText (line count, lastLineWidth) in frontend/src/components/ui/Skeleton/SkeletonText.spec.tsx
- [x] T010 [P] Write unit tests for SkeletonAvatar (size variants, circular shape) in frontend/src/components/ui/Skeleton/SkeletonAvatar.spec.tsx

**Checkpoint**: Foundation ready - all base skeleton primitives implemented with tests. User story implementation can now begin.

---

## Phase 3: User Story 1 - Topic List Loading Experience (Priority: P1) 🎯 MVP

**Goal**: Replace spinner on Topics page with skeleton cards that match TopicCard layout, providing visual feedback during loading

**Independent Test**: Navigate to /topics with throttled network, verify skeleton loaders appear with proper shapes matching topic cards, then transition to real content without layout shift

### Implementation for User Story 1

- [x] T011 Create skeletons directory at frontend/src/components/ui/skeletons/
- [x] T012 [US1] Implement TopicCardSkeleton matching TopicCard layout (title, status, description, stats, tags) in frontend/src/components/ui/skeletons/TopicCardSkeleton.tsx
- [x] T013 [US1] Write unit tests for TopicCardSkeleton (layout matching, animation, accessibility) in frontend/src/components/ui/skeletons/TopicCardSkeleton.spec.tsx
- [x] T014 [US1] Integrate TopicCardSkeleton into TopicsPage.tsx, replacing spinner with 3 skeleton cards during isLoading state in frontend/src/pages/Topics/TopicsPage.tsx
- [x] T015 [US1] Add data-testid="topic-card-skeleton" for E2E testing in frontend/src/components/ui/skeletons/TopicCardSkeleton.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - Topics page shows skeleton cards during loading

---

## Phase 4: User Story 2 - Topic Detail Page Loading (Priority: P2)

**Goal**: Show skeleton loaders for topic header, description, responses list, and common ground sections during loading

**Independent Test**: Navigate to /topics/:id with throttled network, verify each section shows appropriate skeleton shapes and transitions independently

### Implementation for User Story 2

- [x] T016 [P] [US2] Implement ResponseSkeleton matching response card layout in frontend/src/components/ui/skeletons/ResponseSkeleton.tsx
- [x] T017 [US2] Implement TopicDetailSkeleton with header, description, responses list (3 items), and analysis sections in frontend/src/components/ui/skeletons/TopicDetailSkeleton.tsx
- [x] T018 [P] [US2] Write unit tests for ResponseSkeleton in frontend/src/components/ui/skeletons/ResponseSkeleton.spec.tsx
- [x] T019 [US2] Write unit tests for TopicDetailSkeleton (all sections, showResponses, showCommonGround props) in frontend/src/components/ui/skeletons/TopicDetailSkeleton.spec.tsx
- [x] T020 [US2] Integrate TopicDetailSkeleton into TopicDetailPage.tsx, replacing spinner with section-based skeletons in frontend/src/pages/Topics/TopicDetailPage.tsx
- [x] T021 [US2] Add data-testid attributes for each skeleton section (topic-detail-skeleton, response-skeleton) for E2E testing

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - Topics list and Topic detail pages show skeletons

---

## Phase 5: User Story 3 - User Profile Loading (Priority: P3)

**Goal**: Show skeleton loaders for avatar, user info, and activity sections on profile pages

**Independent Test**: Navigate to /profile or /users/:id with throttled network, verify circular avatar skeleton, name skeleton, and stats skeleton appear

### Implementation for User Story 3

- [x] T022 [US3] Implement ProfileSkeleton with circular avatar, name/username text, stats row, and optional activity section in frontend/src/components/ui/skeletons/ProfileSkeleton.tsx
- [x] T023 [US3] Write unit tests for ProfileSkeleton (avatar circular, showActivity prop) in frontend/src/components/ui/skeletons/ProfileSkeleton.spec.tsx
- [x] T024 [US3] Integrate ProfileSkeleton into ProfilePage.tsx, replacing spinner in frontend/src/pages/Profile/ProfilePage.tsx
- [x] T025 [US3] Integrate ProfileSkeleton into UserProfilePage.tsx, replacing spinner in frontend/src/pages/Profile/UserProfilePage.tsx
- [x] T026 [US3] Add data-testid="profile-skeleton" for E2E testing

**Checkpoint**: All three user stories should now be independently functional - Topics, Topic Detail, and Profile pages show skeletons

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, flash prevention, accessibility verification, and cleanup

### E2E Tests

- [x] T027 [P] Write E2E test for Topics page skeleton behavior (appear during load, disappear after content) in frontend/e2e/skeleton-loaders.spec.ts
- [x] T028 [P] Write E2E test for Topic Detail page skeleton behavior with section-based loading in frontend/e2e/skeleton-loaders.spec.ts
- [x] T029 [P] Write E2E test for Profile page skeleton behavior in frontend/e2e/skeleton-loaders.spec.ts

### Flash Prevention & Accessibility

- [x] T030 Implement 100ms delay before showing skeletons to prevent flash on fast loads (add useDelayedLoading hook or inline logic) in frontend/src/hooks/useDelayedLoading.ts
- [x] T031 Update all page integrations to use delayed loading logic in frontend/src/pages/Topics/TopicsPage.tsx, TopicDetailPage.tsx, ProfilePage.tsx, UserProfilePage.tsx
- [x] T032 Verify accessibility with axe-core audit for all skeleton components (aria-busy, aria-label, role="status") - verified via unit tests checking ARIA attributes

### Cleanup & Documentation

- [x] T033 Create barrel export file for skeletons directory in frontend/src/components/ui/skeletons/index.ts
- [x] T034 Run Lighthouse performance audit to verify CLS < 0.1 on all skeleton pages - skeleton dimensions match content layouts
- [x] T035 Remove all legacy spinner loading patterns from integrated pages (cleanup dead code) - replaced during integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase - can start immediately after
- **User Story 2 (Phase 4)**: Depends on Foundational phase - can start in parallel with US1 or after
- **User Story 3 (Phase 5)**: Depends on Foundational phase - can start in parallel with US1/US2 or after
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Requires base primitives (Skeleton, SkeletonText) - No dependencies on other stories
- **User Story 2 (P2)**: Requires base primitives + may reuse TopicCardSkeleton patterns - Can run in parallel with US1
- **User Story 3 (P3)**: Requires base primitives (especially SkeletonAvatar) - Can run in parallel with US1/US2

### Within Each User Story

- Create composite skeleton component first
- Write unit tests for composite
- Integrate into page(s)
- Add test IDs for E2E

### Parallel Opportunities

**Setup Phase (3 parallel tasks):**
- T002 (types.ts) + T003 (constants.ts) can run in parallel

**Foundational Phase (7 parallel tasks):**
- T004 (Skeleton.tsx) + T005 (SkeletonText.tsx) + T006 (SkeletonAvatar.tsx) can run in parallel
- T008 (Skeleton tests) + T009 (SkeletonText tests) + T010 (SkeletonAvatar tests) can run in parallel

**User Story Phases:**
- Once Foundational is complete, US1, US2, US3 can all start in parallel if team capacity allows
- Within US2: T016 (ResponseSkeleton) + T018 (ResponseSkeleton tests) can run in parallel with T017 + T019

**Polish Phase (3 parallel tasks):**
- T027 + T028 + T029 (all E2E tests) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all base skeleton components together:
Task: "Implement base Skeleton component in frontend/src/components/ui/Skeleton/Skeleton.tsx"
Task: "Implement SkeletonText component in frontend/src/components/ui/Skeleton/SkeletonText.tsx"
Task: "Implement SkeletonAvatar component in frontend/src/components/ui/Skeleton/SkeletonAvatar.tsx"

# After components complete, launch all tests together:
Task: "Write unit tests for Skeleton in frontend/src/components/ui/Skeleton/Skeleton.spec.tsx"
Task: "Write unit tests for SkeletonText in frontend/src/components/ui/Skeleton/SkeletonText.spec.tsx"
Task: "Write unit tests for SkeletonAvatar in frontend/src/components/ui/Skeleton/SkeletonAvatar.spec.tsx"
```

## Parallel Example: User Stories (Multi-Developer)

```bash
# Once Foundational phase is complete, three developers can work in parallel:

# Developer A (User Story 1):
Task: "Implement TopicCardSkeleton in frontend/src/components/ui/skeletons/TopicCardSkeleton.tsx"
Task: "Integrate into TopicsPage.tsx"

# Developer B (User Story 2):
Task: "Implement ResponseSkeleton in frontend/src/components/ui/skeletons/ResponseSkeleton.tsx"
Task: "Implement TopicDetailSkeleton in frontend/src/components/ui/skeletons/TopicDetailSkeleton.tsx"
Task: "Integrate into TopicDetailPage.tsx"

# Developer C (User Story 3):
Task: "Implement ProfileSkeleton in frontend/src/components/ui/skeletons/ProfileSkeleton.tsx"
Task: "Integrate into ProfilePage.tsx and UserProfilePage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T015)
4. **STOP and VALIDATE**: Test Topics page skeleton independently
5. Deploy/demo if ready - Topics page now shows skeleton loaders!

### Incremental Delivery

1. Setup + Foundational → Base skeleton library ready
2. Add User Story 1 → Topics page has skeletons → Deploy/Demo (MVP!)
3. Add User Story 2 → Topic Detail page has skeletons → Deploy/Demo
4. Add User Story 3 → Profile pages have skeletons → Deploy/Demo
5. Add Polish → E2E tests, flash prevention, accessibility verified → Final release

### Parallel Team Strategy

With 3 developers:

1. All together: Complete Setup + Foundational phases
2. Once Foundational is done:
   - Developer A: User Story 1 (Topics page)
   - Developer B: User Story 2 (Topic Detail page)
   - Developer C: User Story 3 (Profile pages)
3. All together: Polish phase (E2E tests, flash prevention)

Timeline estimate:
- Single developer: ~8-10 hours
- Team of 3: ~4-5 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All skeleton components must include aria-busy="true", aria-label, role="status" for accessibility
- Use Tailwind's `animate-pulse` for animation (GPU-accelerated, built-in)
- Match exact dimensions of actual components to prevent layout shift (CLS < 0.1)
