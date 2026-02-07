# Tasks: Discussion Page Redesign for Chat-Style UX

**Input**: Design documents from `/specs/001-discussion-page-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/websocket-messages.md

**Tests**: Tests will be written alongside implementation (following existing codebase pattern). E2E tests will be added at story completion checkpoints.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` for React components, `backend/` unchanged (no backend changes)
- **Tests**: `frontend/tests/unit/`, `frontend/tests/e2e/`
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic structure for three-panel layout

- [x] T001 Install react-window dependency for virtual scrolling via `pnpm add react-window @types/react-window`
- [x] T002 [P] Create discussion-layout component directory at `frontend/src/components/discussion-layout/`
- [x] T003 [P] Create panel state hooks directory at `frontend/src/hooks/`
- [x] T004 [P] Create discussion layout CSS file at `frontend/src/styles/discussion-layout.css`
- [x] T005 [P] Create DiscussionLayoutContext file at `frontend/src/contexts/DiscussionLayoutContext.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement DiscussionLayoutContext with PanelState interface in `frontend/src/contexts/DiscussionLayoutContext.tsx`
- [ ] T007 [P] Implement usePanelState hook with sessionStorage persistence in `frontend/src/hooks/usePanelState.ts`
- [ ] T008 [P] Implement usePanelResize hook for drag-to-resize functionality in `frontend/src/hooks/usePanelResize.ts`
- [ ] T009 [P] Implement useBreakpoint hook for responsive design in `frontend/src/hooks/useBreakpoint.ts`
- [ ] T010 [P] Implement useUnsavedChanges hook for draft detection in `frontend/src/hooks/useUnsavedChanges.ts`
- [ ] T011 Create base DiscussionLayout component with CSS Grid structure in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T012 [P] Create PanelResizer component for draggable dividers in `frontend/src/components/discussion-layout/PanelResizer.tsx`
- [ ] T013 Add CSS Grid layout styles for three-panel desktop layout (≥1280px) in `frontend/src/styles/discussion-layout.css`
- [ ] T014 Add responsive breakpoint styles for tablet (768-1279px) and mobile (<768px) in `frontend/src/styles/discussion-layout.css`

**Checkpoint**: Foundation ready - DiscussionLayout component renders with three empty panels, resizable dividers, and responsive breakpoints working

---

## Phase 3: User Story 1 - Quick Topic Discovery and Entry (Priority: P1) 🎯 MVP

**Goal**: Enable users to browse active discussions and quickly jump into topics without page reloads. Left panel shows topic list with search/filter, clicking a topic loads conversation in center panel.

**Independent Test**: Load the page → see topic list in left panel → click a topic → center panel loads responses without page refresh → scroll left panel → center/right panels stay fixed

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create TopicNavigationPanel component in `frontend/src/components/discussion-layout/TopicNavigationPanel.tsx`
- [ ] T016 [P] [US1] Refactor TopicList component for left panel integration in `frontend/src/components/topics/TopicList.tsx`
- [ ] T017 [P] [US1] Create TopicListItem component for compact topic card in `frontend/src/components/topics/TopicListItem.tsx`
- [ ] T018 [P] [US1] Create TopicSearchFilter component in `frontend/src/components/topics/TopicSearchFilter.tsx`
- [ ] T019 [US1] Implement useTopicNavigation hook for client-side topic switching with URL sync in `frontend/src/hooks/useTopicNavigation.ts`
- [ ] T020 [US1] Implement useVirtualList hook wrapping react-window in `frontend/src/hooks/useVirtualList.ts`
- [ ] T021 [US1] Integrate useVirtualList into TopicList for virtual scrolling (handles 500+ topics) in `frontend/src/components/topics/TopicList.tsx`
- [ ] T022 [US1] Add independent scrolling CSS for left panel in `frontend/src/styles/discussion-layout.css`
- [ ] T023 [US1] Implement real-time topic filtering in TopicSearchFilter (client-side search) in `frontend/src/components/topics/TopicSearchFilter.tsx`
- [ ] T024 [US1] Add unread badge indicator to TopicListItem in `frontend/src/components/topics/TopicListItem.tsx`
- [ ] T025 [US1] Integrate TopicNavigationPanel into DiscussionLayout left panel in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T026 [US1] Create DiscussionPage component with DiscussionLayout in `frontend/src/pages/Topics/DiscussionPage.tsx`
- [ ] T027 [US1] Add routing for /discussions route to DiscussionPage in `frontend/src/routes/index.tsx`
- [ ] T028 [US1] Implement URL-based topic selection (query param ?topic=id) in `frontend/src/pages/Topics/DiscussionPage.tsx`
- [ ] T029 [US1] Add redirect from /topics/:id to /discussions?topic=:id for backward compatibility in `frontend/src/routes/index.tsx`

**Unit Tests**:
- [ ] T030 [P] [US1] Write unit tests for usePanelState hook in `frontend/tests/unit/hooks/usePanelState.test.ts`
- [ ] T031 [P] [US1] Write unit tests for useTopicNavigation hook in `frontend/tests/unit/hooks/useTopicNavigation.test.ts`
- [ ] T032 [P] [US1] Write unit tests for TopicSearchFilter component in `frontend/tests/unit/components/topics/TopicSearchFilter.test.tsx`

**E2E Tests**:
- [ ] T033 [US1] Write E2E test for topic selection flow in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - users can browse topics in left panel, search/filter, click to load conversation in center panel

---

## Phase 4: User Story 2 - Reading Conversation with Contextual Metadata (Priority: P1)

**Goal**: Enable users to read conversations while viewing propositions, alignment, common ground, and bridging suggestions in the right panel without switching views.

**Independent Test**: Select a topic with responses → center panel shows conversation → right panel shows propositions with alignment scores → click a proposition → center panel highlights related responses

### Implementation for User Story 2

- [ ] T034 [P] [US2] Create ConversationPanel component in `frontend/src/components/discussion-layout/ConversationPanel.tsx`
- [ ] T035 [P] [US2] Create MetadataPanel component with tabbed sections in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T036 [P] [US2] Refactor ResponseList component with virtual scrolling in `frontend/src/components/responses/ResponseList.tsx`
- [ ] T037 [P] [US2] Create PropositionList component for right panel in `frontend/src/components/common-ground/PropositionList.tsx`
- [ ] T038 [P] [US2] Refactor CommonGroundSummaryPanel for right panel integration in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T039 [P] [US2] Refactor BridgingSuggestionsSection for right panel in `frontend/src/components/common-ground/BridgingSuggestionsSection.tsx`
- [ ] T040 [US2] Integrate useVirtualList into ResponseList for virtual scrolling (handles 500+ responses) in `frontend/src/components/responses/ResponseList.tsx`
- [ ] T041 [US2] Add independent scrolling CSS for center and right panels in `frontend/src/styles/discussion-layout.css`
- [ ] T042 [US2] Implement proposition hover → highlight related responses in center panel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T043 [US2] Implement proposition click → scroll to/highlight related responses in center panel in `frontend/src/components/common-ground/PropositionList.tsx`
- [ ] T044 [US2] Add collapsible sections (Propositions, Common Ground, Bridging, Topic Info) in MetadataPanel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T045 [US2] Implement lazy loading for common ground analysis (fetch only when right panel tab activated) in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T046 [US2] Implement lazy loading for bridging suggestions (fetch only when tab activated) in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T047 [US2] Add empty state UI for right panel when no metadata available in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T048 [US2] Integrate ConversationPanel into DiscussionLayout center panel in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T049 [US2] Integrate MetadataPanel into DiscussionLayout right panel in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`

**Unit Tests**:
- [ ] T050 [P] [US2] Write unit tests for useVirtualList hook in `frontend/tests/unit/hooks/useVirtualList.test.ts`
- [ ] T051 [P] [US2] Write unit tests for PropositionList component in `frontend/tests/unit/components/common-ground/PropositionList.test.tsx`
- [ ] T052 [P] [US2] Write unit tests for MetadataPanel component in `frontend/tests/unit/components/discussion-layout/MetadataPanel.test.tsx`

**E2E Tests**:
- [ ] T053 [US2] Write E2E test for reading conversation with metadata panel in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can browse topics, select one, read conversation in center, view metadata in right panel, interact with propositions

---

## Phase 5: User Story 3 - Composing Responses with Real-Time Feedback (Priority: P2)

**Goal**: Enable users to compose responses inline with real-time AI feedback appearing in the right panel without leaving the conversation view.

**Independent Test**: Select a topic → click "Reply" on a response → compose area expands inline → type 20+ characters → preview feedback appears in right panel within 2 seconds → submit → new response appears immediately

### Implementation for User Story 3

- [ ] T054 [P] [US3] Refactor ResponseComposer for inline expand/collapse in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T055 [P] [US3] Refactor PreviewFeedbackPanel for right panel integration in `frontend/src/components/feedback/PreviewFeedbackPanel.tsx`
- [ ] T056 [US3] Add inline "Reply" button to ResponseItem component in `frontend/src/components/responses/ResponseItem.tsx`
- [ ] T057 [US3] Implement inline compose area expansion in conversation thread in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T058 [US3] Integrate preview feedback display in right panel during composition in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T059 [US3] Implement debounced preview feedback API calls (max 1 request per 500ms) in `frontend/src/hooks/usePreviewFeedback.ts`
- [ ] T060 [US3] Add "Ready to Post" indicator when feedback shows no blocking issues in `frontend/src/components/feedback/PreviewFeedbackPanel.tsx`
- [ ] T061 [US3] Implement "Request Full Feedback" button in ResponseComposer in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T062 [US3] Show full feedback in right panel without closing compose area in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T063 [US3] Implement auto-scroll to bottom after successful response submission in `frontend/src/components/responses/ResponseList.tsx`
- [ ] T064 [US3] Clear compose area and hide preview feedback after submission in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T065 [US3] Add loading state while preview feedback is being fetched in `frontend/src/components/feedback/PreviewFeedbackPanel.tsx`

**Unit Tests**:
- [ ] T066 [P] [US3] Write unit tests for debounced preview feedback hook in `frontend/tests/unit/hooks/usePreviewFeedback.test.ts`
- [ ] T067 [P] [US3] Write unit tests for ResponseComposer inline expand/collapse in `frontend/tests/unit/components/responses/ResponseComposer.test.tsx`

**E2E Tests**:
- [ ] T068 [US3] Write E2E test for composing response with preview feedback in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work - users can browse topics, read with metadata, and compose responses with real-time feedback

---

## Phase 6: User Story 4 - Exploring Common Ground and Bridging Suggestions (Priority: P3)

**Goal**: Enable users to explore common ground analysis (consensus score, agreement zones, misunderstandings, disagreements) in the right panel.

**Independent Test**: Select a topic with analysis data → right panel shows consensus score → expand "Common Ground" section → see agreement zones with percentages → click an area → center panel highlights related responses

### Implementation for User Story 4

- [ ] T069 [P] [US4] Add consensus score display with visual indicator (progress bar) in MetadataPanel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T070 [P] [US4] Implement agreement zones section with proposition percentages in CommonGroundSummaryPanel in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T071 [P] [US4] Implement misunderstandings section with term definitions in CommonGroundSummaryPanel in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T072 [P] [US4] Implement disagreements section with moral foundations in CommonGroundSummaryPanel in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T073 [US4] Implement click on agreement zone → highlight/filter related responses in center panel in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T074 [US4] Add "View Full Analysis" button that expands detailed breakdown in `frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx`
- [ ] T075 [US4] Implement bridging suggestions section with confidence scores in BridgingSuggestionsSection in `frontend/src/components/common-ground/BridgingSuggestionsSection.tsx`
- [ ] T076 [US4] Add source/target positions and bridging language display in BridgingSuggestionsSection in `frontend/src/components/common-ground/BridgingSuggestionsSection.tsx`

**Unit Tests**:
- [ ] T077 [P] [US4] Write unit tests for CommonGroundSummaryPanel component in `frontend/tests/unit/components/common-ground/CommonGroundSummaryPanel.test.tsx`
- [ ] T078 [P] [US4] Write unit tests for BridgingSuggestionsSection component in `frontend/tests/unit/components/common-ground/BridgingSuggestionsSection.test.tsx`

**E2E Tests**:
- [ ] T079 [US4] Write E2E test for exploring common ground and bridging suggestions in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

**Checkpoint**: At this point, all P1-P3 user stories work - users can browse, read, compose, and explore analysis

---

## Phase 7: User Story 5 - Responsive Experience on Tablet and Mobile (Priority: P3)

**Goal**: Enable users on tablet/mobile devices to access discussions with adapted layouts (hamburger menu, vertical stack).

**Independent Test**: Resize browser to tablet width (1024px) → left panel collapses to hamburger menu → click hamburger → left panel slides in → tap outside → panel closes. Resize to mobile (375px) → panels stack vertically

### Implementation for User Story 5

- [ ] T080 [P] [US5] Implement hamburger menu icon for tablet viewports in TopicNavigationPanel in `frontend/src/components/discussion-layout/TopicNavigationPanel.tsx`
- [ ] T081 [P] [US5] Implement left panel slide-in overlay for tablet in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T082 [P] [US5] Add backdrop overlay that closes left panel on tap (tablet) in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T083 [US5] Implement vertical stacking for mobile viewports (<768px) in `frontend/src/styles/discussion-layout.css`
- [ ] T084 [US5] Convert right panel metadata to accordion sections on mobile in MetadataPanel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T085 [US5] Implement full-viewport compose area on mobile with "Back to Conversation" button in ResponseComposer in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T086 [US5] Add swipe gesture support for opening/closing left panel on mobile (use react-swipeable) in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T087 [US5] Test and adjust touch target sizes (min 44px) for mobile accessibility in `frontend/src/styles/discussion-layout.css`

**E2E Tests**:
- [ ] T088 [US5] Write E2E test for tablet responsive layout (hamburger menu) in `frontend/tests/e2e/discussion-page-redesign.spec.ts`
- [ ] T089 [US5] Write E2E test for mobile responsive layout (vertical stack) in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

**Checkpoint**: At this point, ALL user stories work across desktop, tablet, and mobile viewports

---

## Phase 8: Real-Time Updates and Edge Cases

**Purpose**: Implement WebSocket real-time updates and handle edge cases from spec

### Real-Time WebSocket Integration

- [ ] T090 [P] Implement useWebSocket hook for real-time updates in `frontend/src/hooks/useWebSocket.ts`
- [ ] T091 [P] Add WebSocket message handlers for NEW_RESPONSE in `frontend/src/hooks/useWebSocket.ts`
- [ ] T092 [P] Add WebSocket message handlers for COMMON_GROUND_UPDATE in `frontend/src/hooks/useWebSocket.ts`
- [ ] T093 [P] Add WebSocket message handlers for TOPIC_STATUS_CHANGE in `frontend/src/hooks/useWebSocket.ts`
- [ ] T094 Implement "N new responses - Click to load" notification banner in ConversationPanel in `frontend/src/components/discussion-layout/ConversationPanel.tsx`
- [ ] T095 Implement "Updated - Refresh to see changes" indicator for common ground updates in MetadataPanel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T096 Implement unread badge update when new responses arrive in TopicListItem in `frontend/src/components/topics/TopicListItem.tsx`
- [ ] T097 Implement topic status change banner ("Topic is now archived - read-only") in ConversationPanel in `frontend/src/components/discussion-layout/ConversationPanel.tsx`

### Edge Case Handling

- [ ] T098 [P] Implement unsaved changes confirmation dialog when switching topics in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T099 [P] Disable "Post" button until preview feedback completes or show warning in ResponseComposer in `frontend/src/components/responses/ResponseComposer.tsx`
- [ ] T100 [P] Implement error state for API failures in ConversationPanel with "Retry" button in `frontend/src/components/discussion-layout/ConversationPanel.tsx`
- [ ] T101 [P] Implement error handling for bridging suggestions failure in MetadataPanel in `frontend/src/components/discussion-layout/MetadataPanel.tsx`
- [ ] T102 Implement keyboard navigation shortcuts (arrow keys for topics, Ctrl+F for search, Esc to close) in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T103 Add ARIA landmarks (nav, main, complementary) to panels in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T104 Add ARIA live regions for dynamic content announcements in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`
- [ ] T105 Implement focus management when panels collapse/expand in DiscussionLayout in `frontend/src/components/discussion-layout/DiscussionLayout.tsx`

**E2E Tests**:
- [ ] T106 Write E2E test for real-time response notification in `frontend/tests/e2e/discussion-page-redesign.spec.ts`
- [ ] T107 Write E2E test for unsaved changes confirmation in `frontend/tests/e2e/discussion-page-redesign.spec.ts`
- [ ] T108 Write E2E test for keyboard navigation in `frontend/tests/e2e/discussion-page-redesign.spec.ts`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, performance optimization, and final validation

- [ ] T109 [P] Add loading skeletons for panel data fetching in all panels in `frontend/src/components/discussion-layout/`
- [ ] T110 [P] Optimize bundle size - verify react-window adds <100KB gzipped via `pnpm build --analyze`
- [ ] T111 [P] Run Lighthouse performance audit - verify <3 second page load
- [ ] T112 [P] Run WCAG 2.1 AA accessibility audit (automated + manual keyboard testing)
- [ ] T113 [P] Verify panel resize performance <100ms via Chrome DevTools Performance tab
- [ ] T114 [P] Verify virtual scrolling maintains 60fps with 500+ items via DevTools
- [ ] T115 Code cleanup - remove deprecated TopicDetailPage and DiscussionDetailPage components (keep for redirects only)
- [ ] T116 Update route configuration to make /discussions the primary route in `frontend/src/routes/index.tsx`
- [ ] T117 Add TSDoc comments to all new components and hooks
- [ ] T118 Run full linting and formatting check via `pnpm lint && pnpm format:check`
- [ ] T119 Run unit test suite with coverage report - verify 80% coverage via `pnpm test:unit --coverage`
- [ ] T120 Run full E2E test suite via `pnpm test:e2e`
- [ ] T121 Validate quickstart.md instructions by following setup steps
- [ ] T122 Update CLAUDE.md with any new patterns or learnings from implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion (can start in parallel with US1 if staffed)
- **User Story 3 (Phase 5)**: Depends on Foundational + US2 completion (needs MetadataPanel for feedback display)
- **User Story 4 (Phase 6)**: Depends on Foundational + US2 completion (needs MetadataPanel for analysis display)
- **User Story 5 (Phase 7)**: Depends on US1, US2, US3, US4 completion (responsive adaptations need base layout complete)
- **Real-Time & Edge Cases (Phase 8)**: Depends on US1, US2 completion (needs topic list and conversation panel)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - only depends on Foundational phase
- **User Story 2 (P1)**: Independent - only depends on Foundational phase (can develop in parallel with US1)
- **User Story 3 (P2)**: Depends on US2 (needs MetadataPanel for feedback integration)
- **User Story 4 (P3)**: Depends on US2 (needs MetadataPanel for analysis sections)
- **User Story 5 (P3)**: Depends on US1-US4 (responsive adaptations need all panels complete)

### Within Each User Story

- Components can be created in parallel if they don't depend on each other
- Hooks should be implemented before components that use them
- CSS can be added in parallel with component development
- Unit tests can be written in parallel with implementation (or test-first if preferred)
- E2E tests written at story completion checkpoint

### Parallel Opportunities

**Setup Phase (Phase 1) - All tasks [P] can run in parallel**:
```bash
# All 5 setup tasks can run simultaneously:
T002: Create discussion-layout/ directory
T003: Create hooks/ directory
T004: Create CSS file
T005: Create context file
```

**Foundational Phase (Phase 2) - Marked [P] tasks can run in parallel**:
```bash
# After T006 (context), these can run in parallel:
T007: usePanelState hook
T008: usePanelResize hook
T009: useBreakpoint hook
T010: useUnsavedChanges hook
T012: PanelResizer component
```

**User Story 1 - Component tasks can run in parallel**:
```bash
# These components don't depend on each other:
T015: TopicNavigationPanel
T016: TopicList refactor
T017: TopicListItem
T018: TopicSearchFilter
```

**User Story 2 - Large parallel opportunity**:
```bash
# These components can all be built simultaneously:
T034: ConversationPanel
T035: MetadataPanel
T036: ResponseList refactor
T037: PropositionList
T038: CommonGroundSummaryPanel
T039: BridgingSuggestionsSection
```

**Cross-Story Parallelism**:
- After Foundational (Phase 2) completes, US1 and US2 can both start in parallel (different panels, no overlap)
- US3 and US4 can both start after US2 completes (both extend MetadataPanel, but different sections)

---

## Parallel Example: User Story 2

**Maximize parallelism for US2 implementation**:

```bash
# Step 1: Launch all component creation tasks together (6 parallel tasks):
Task: "Create ConversationPanel in frontend/src/components/discussion-layout/ConversationPanel.tsx"
Task: "Create MetadataPanel in frontend/src/components/discussion-layout/MetadataPanel.tsx"
Task: "Refactor ResponseList in frontend/src/components/responses/ResponseList.tsx"
Task: "Create PropositionList in frontend/src/components/common-ground/PropositionList.tsx"
Task: "Refactor CommonGroundSummaryPanel in frontend/src/components/common-ground/CommonGroundSummaryPanel.tsx"
Task: "Refactor BridgingSuggestionsSection in frontend/src/components/common-ground/BridgingSuggestionsSection.tsx"

# Step 2: After components exist, launch integration tasks sequentially:
# T040: Virtual scrolling in ResponseList
# T041: CSS for center/right panels
# T042-T047: Interactive features (depends on base components)
# T048-T049: Integration into DiscussionLayout

# Step 3: Launch all unit tests in parallel (3 parallel tasks):
Task: "Unit test for useVirtualList hook"
Task: "Unit test for PropositionList component"
Task: "Unit test for MetadataPanel component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

**Recommended MVP Scope**: Complete Phase 1, 2, 3, and 4 (US1 + US2)

1. Complete Phase 1: Setup (install dependencies, create directories)
2. Complete Phase 2: Foundational (hooks, context, base layout) - **CRITICAL CHECKPOINT**
3. Complete Phase 3: User Story 1 (topic navigation in left panel)
4. **VALIDATE US1**: Test topic browsing independently
5. Complete Phase 4: User Story 2 (conversation + metadata in center/right panels)
6. **VALIDATE US1 + US2**: Test full three-panel reading experience
7. **DEPLOY MVP**: Users can browse topics and read with analysis - core value proposition delivered

**Why US1 + US2 is a strong MVP**:
- Both are P1 (highest priority)
- Together they deliver the core redesign value (three-panel chat-style layout)
- US1 alone is just navigation (no conversation viewing)
- US2 alone is just viewing (no topic selection)
- US1 + US2 together = complete reading experience (MVP!)

### Incremental Delivery

1. **Foundation** (Phase 1 + 2) → CSS Grid layout with resizable panels works
2. **+US1** (Phase 3) → Topic browsing works, center panel empty
3. **+US2** (Phase 4) → Full reading experience works (DEPLOY AS MVP!)
4. **+US3** (Phase 5) → Composition with feedback works (DEPLOY)
5. **+US4** (Phase 6) → Advanced analysis exploration works (DEPLOY)
6. **+US5** (Phase 7) → Mobile/tablet support works (DEPLOY)
7. **+Real-Time** (Phase 8) → Live updates work (DEPLOY)
8. **+Polish** (Phase 9) → Performance optimized, fully tested (FINAL RELEASE)

### Parallel Team Strategy

With 2-3 developers:

**Phase 1-2**: Team collaborates on Setup + Foundational together (critical path)

**After Foundational completes**:
- **Developer A**: User Story 1 (left panel - 15 tasks)
- **Developer B**: User Story 2 (center + right panels - 16 tasks)
- **Developer C**: Start on User Story 3 tests/planning (can't implement until US2 done)

**After US1 + US2 complete** (MVP ready):
- **Developer A**: User Story 3 (composition feedback)
- **Developer B**: User Story 4 (analysis exploration)
- **Developer C**: User Story 5 (responsive design)

**Final phases**: All developers collaborate on Phase 8 (real-time) and Phase 9 (polish)

---

## Notes

- **[P] tasks** = different files, no dependencies on incomplete work, safe to parallelize
- **[Story] label** maps task to specific user story for traceability and independent testing
- **Each user story delivers incremental value** - can stop at any checkpoint and deploy
- **MVP recommendation**: Complete through Phase 4 (US1 + US2) for core redesign value
- **Verify tests pass** before marking tasks complete (if implementing test-first)
- **Commit frequently** - after each task or logical group of related tasks
- **Run pre-commit hooks** - NEVER bypass with `--no-verify` (per CLAUDE.md)
- **Monitor performance** - virtual scrolling critical for 500+ items (measure with DevTools)
- **Accessibility first** - keyboard navigation and screen reader support non-negotiable

---

## Task Summary

**Total Tasks**: 122 tasks
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 9 tasks
- Phase 3 (US1): 19 tasks
- Phase 4 (US2): 20 tasks
- Phase 5 (US3): 15 tasks
- Phase 6 (US4): 11 tasks
- Phase 7 (US5): 10 tasks
- Phase 8 (Real-Time + Edge Cases): 19 tasks
- Phase 9 (Polish): 14 tasks

**Tasks per User Story**:
- User Story 1 (P1): 19 implementation + 4 test tasks = 23 total
- User Story 2 (P1): 16 implementation + 4 test tasks = 20 total
- User Story 3 (P2): 12 implementation + 3 test tasks = 15 total
- User Story 4 (P3): 8 implementation + 3 test tasks = 11 total
- User Story 5 (P3): 8 implementation + 2 test tasks = 10 total

**Parallel Opportunities Identified**:
- Phase 1: All 5 tasks can run in parallel
- Phase 2: 5 of 9 tasks can run in parallel (after context setup)
- US1: 4 component tasks can run in parallel
- US2: 6 component tasks can run in parallel (largest parallel opportunity)
- US3: 2 refactor tasks can run in parallel
- US4: 4 implementation tasks can run in parallel
- US5: 3 implementation tasks can run in parallel
- Phase 8: 4 WebSocket handlers can run in parallel
- Phase 9: 6 validation tasks can run in parallel

**Independent Test Criteria**:
- ✅ US1: Topic browsing and selection works independently
- ✅ US2: Reading with metadata works independently (requires US1 for topic selection, but US2 features independently testable)
- ✅ US3: Composition with feedback works independently (requires US2 for panel structure)
- ✅ US4: Analysis exploration works independently (requires US2 for panel structure)
- ✅ US5: Responsive design works independently (requires US1-US4 for base layout)

**Suggested MVP Scope**: Phases 1 + 2 + 3 + 4 (Setup + Foundational + US1 + US2) = 53 tasks
- Delivers core three-panel reading experience (browse topics + read with analysis)
- Smallest viable increment that provides full redesign value
- Can be deployed and tested with real users before adding composition/mobile

**Format Validation**: ✅ All 122 tasks follow the checklist format:
- Checkbox: `- [ ]`
- Task ID: T001-T122 (sequential)
- [P] marker: 49 tasks marked as parallelizable
- [Story] label: 92 tasks labeled with user story (US1-US5)
- File paths: All implementation tasks include exact file path
