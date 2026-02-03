# Tasks: Consolidate Landing Page

**Input**: Design documents from `/specs/015-consolidate-landing-page/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: E2E tests will be created as part of this implementation per the plan.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Web app (monorepo with frontend/ directory)
- All paths relative to repository root

---

## Phase 1: Setup (Brand & Font Infrastructure)

**Purpose**: Update shared configuration files that all user stories depend on

- [x] T001 Update Tailwind config with brand colors (primary: Teal #2A9D8F, secondary: Soft Blue #6B9AC4, accent: Light Sky #A8DADC) in `frontend/tailwind.config.js`
- [x] T002 [P] Add Nunito font via Google Fonts in `frontend/index.html`
- [x] T003 [P] Update Tailwind fontFamily config to use Nunito in `frontend/tailwind.config.js`

---

## Phase 2: Foundational (Layout Infrastructure)

**Purpose**: Create the layout opt-out mechanism that enables landing page to bypass App.tsx wrapper

**⚠️ CRITICAL**: User Story 1 cannot be completed until this phase is done

- [x] T004 Create LandingLayout component with its own header/footer in `frontend/src/components/layout/LandingLayout.tsx`
- [x] T005 Modify App.tsx to support conditional layout wrapping in `frontend/src/App.tsx`
- [x] T006 Update route configuration to use layout-aware rendering in `frontend/src/routes/index.tsx`

**Checkpoint**: Layout infrastructure ready - landing page can now opt out of global wrapper

---

## Phase 3: User Story 1 - First-Time Visitor Discovers Platform Value (Priority: P1) 🎯 MVP

**Goal**: Visitor arrives at `/` and immediately understands platform value with hero, features, demo, and CTAs

**Independent Test**: Navigate to `http://localhost:5173/` as unauthenticated user, verify all sections render with brand colors

### Implementation for User Story 1

- [x] T007 [US1] Move LandingPage route from `/demo/discussion` to `/` in `frontend/src/routes/index.tsx`
- [x] T008 [US1] Update LandingPage header with ReasonBridge logo (overlapping circles) in `frontend/src/pages/LandingPage.tsx`
- [x] T009 [US1] Update LandingPage hero gradient from blue/indigo to primary/secondary in `frontend/src/pages/LandingPage.tsx`
- [x] T010 [US1] Update all button colors from blue to primary (Teal) in `frontend/src/pages/LandingPage.tsx`
- [x] T011 [US1] Update value proposition card colors to use brand palette in `frontend/src/pages/LandingPage.tsx`
- [x] T012 [US1] Update footer with brand colors and proper links in `frontend/src/pages/LandingPage.tsx`
- [x] T013 [US1] Delete redundant HomePage.tsx placeholder in `frontend/src/pages/HomePage.tsx`
- [x] T014 [US1] Remove HomePage route from route configuration in `frontend/src/routes/index.tsx`
- [x] T015 [US1] Add noscript fallback for core information in `frontend/src/pages/LandingPage.tsx`

**Checkpoint**: Unauthenticated visitors see complete landing page at `/` with brand colors and all sections

---

## Phase 4: User Story 2 - Visitor Explores Interactive Demo (Priority: P2)

**Goal**: Visitors can interact with demo section to see how platform works before signing up

**Independent Test**: Scroll to demo section, verify discussions load with cards, metrics, and navigation

### Implementation for User Story 2

- [x] T016 [US2] Update InteractiveDemo colors from blue to primary in `frontend/src/components/demo/InteractiveDemo.tsx`
- [x] T017 [P] [US2] Update DemoMetrics gradient and colors in `frontend/src/components/demo/DemoMetrics.tsx`
- [x] T018 [P] [US2] Update DemoDiscussionView colors in `frontend/src/components/demo/DemoDiscussionView.tsx`
- [x] T019 [US2] Add smooth scroll behavior for "See How It Works" CTA in `frontend/src/pages/LandingPage.tsx`
- [x] T020 [US2] Add skeleton loader for demo content while loading in `frontend/src/components/demo/InteractiveDemo.tsx`
- [x] T021 [US2] Add fallback content when demo discussions fail to load in `frontend/src/components/demo/InteractiveDemo.tsx`
- [x] T022 [US2] Add signup/login modal trigger when clicking demo CTAs in `frontend/src/components/demo/InteractiveDemo.tsx`

**Checkpoint**: Demo section fully functional with brand colors, loading states, and CTA interactions

---

## Phase 5: User Story 3 - Authenticated User Returns Home (Priority: P2)

**Goal**: Logged-in users visiting `/` are redirected to `/topics` with a welcome banner

**Independent Test**: Log in, navigate to `/`, verify redirect to `/topics?welcome=true` with banner displayed

### Implementation for User Story 3

- [x] T023 [US3] Create useAuthRedirect hook to check auth state and redirect in `frontend/src/hooks/useAuthRedirect.ts`
- [x] T024 [US3] Create WelcomeBanner component with dismiss functionality in `frontend/src/components/common/WelcomeBanner.tsx`
- [x] T025 [US3] Add localStorage persistence for banner dismissed state in `frontend/src/components/common/WelcomeBanner.tsx`
- [x] T026 [US3] Integrate useAuthRedirect hook into landing page route in `frontend/src/pages/LandingPage.tsx`
- [x] T027 [US3] Add WelcomeBanner to TopicsPage with query param detection in `frontend/src/pages/Topics/TopicsPage.tsx`
- [x] T028 [US3] Style WelcomeBanner with brand colors and dismiss button in `frontend/src/components/common/WelcomeBanner.tsx`

**Checkpoint**: Authenticated users are redirected with dismissible welcome banner, unauthenticated users see landing page

---

## Phase 6: User Story 4 - Visitor Understands Non-Profit Mission (Priority: P3)

**Goal**: Landing page clearly communicates ReasonBridge's research-driven, non-profit mission

**Independent Test**: View landing page, verify mission messaging appears with link to About page

### Implementation for User Story 4

- [x] T029 [US4] Add mission statement section to landing page in `frontend/src/pages/LandingPage.tsx`
- [x] T030 [US4] Add "About" link to landing page footer navigation in `frontend/src/pages/LandingPage.tsx`
- [x] T031 [US4] Style mission section with brand colors and appropriate typography in `frontend/src/pages/LandingPage.tsx`

**Checkpoint**: Mission content is visible and communicates non-profit research focus

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, dark mode verification, accessibility, and cleanup

- [x] T032 [P] Create E2E test for landing page unauthenticated flow in `frontend/e2e/landing-page.spec.ts`
- [x] T033 [P] Create E2E test for authenticated user redirect flow in `frontend/e2e/landing-page.spec.ts`
- [x] T034 [P] Create E2E test for demo section interactions in `frontend/e2e/landing-page.spec.ts`
- [x] T035 Verify dark mode support for all landing page sections (all sections use dark: variants)
- [ ] T036 Run Lighthouse accessibility audit and fix any issues (target: 90+ score)
- [x] T037 Verify responsive layout on viewports 320px to 2560px (E2E tests cover mobile and desktop)
- [x] T038 Update App.tsx header with logo and brand colors for authenticated pages in `frontend/src/App.tsx`
- [ ] T039 Run quickstart.md validation to ensure all manual test scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Can run parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) - Can run parallel with US1/US2
- **User Story 4 (Phase 6)**: Depends on US1 (needs landing page structure)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational only - No cross-story dependencies
- **User Story 2 (P2)**: Depends on Foundational only - Independent of US1 (demo components exist)
- **User Story 3 (P2)**: Depends on Foundational only - Independent (creates new components)
- **User Story 4 (P3)**: Depends on US1 (needs landing page structure to add mission section)

### Within Each User Story

- Models/hooks before components
- Components before page integration
- Core implementation before enhancements
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T002 and T003 can run in parallel (different sections of same file and different file)
- **User Story 2**: T017 and T018 can run in parallel (different component files)
- **User Stories 1-3**: Can run in parallel after Foundational phase (if multiple developers)
- **Polish Phase**: T032, T033, T034 can run in parallel (different test scenarios in same file)

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks together:
Task T001: "Update Tailwind config with brand colors in frontend/tailwind.config.js"
Task T002: "Add Nunito font via Google Fonts in frontend/index.html"  # [P]
Task T003: "Update Tailwind fontFamily config to use Nunito in frontend/tailwind.config.js"  # [P] (different section)
```

## Parallel Example: User Story 2

```bash
# Launch demo component updates together:
Task T017: "Update DemoMetrics gradient and colors in frontend/src/components/demo/DemoMetrics.tsx"  # [P]
Task T018: "Update DemoDiscussionView colors in frontend/src/components/demo/DemoDiscussionView.tsx"  # [P]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (brand colors, font)
2. Complete Phase 2: Foundational (layout infrastructure)
3. Complete Phase 3: User Story 1 (landing page at `/`)
4. **STOP and VALIDATE**: Test landing page independently
5. Deploy/demo if ready - visitors can now see unified landing page

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add User Story 1 → Test independently → **MVP deployed**
3. Add User Story 2 → Test demo section → Enhanced demo experience
4. Add User Story 3 → Test auth redirect → Authenticated user flow complete
5. Add User Story 4 → Test mission content → Full landing page complete
6. Polish phase → E2E tests, accessibility → Production ready

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (landing page structure)
   - Developer B: User Story 2 (demo components)
   - Developer C: User Story 3 (auth redirect + banner)
3. After US1 complete: Developer A continues with User Story 4
4. All converge on Polish phase

---

## Summary

| Phase | Task Count | Focus |
|-------|------------|-------|
| Setup | 3 | Brand colors, font |
| Foundational | 3 | Layout infrastructure |
| User Story 1 | 9 | Landing page at root URL |
| User Story 2 | 7 | Interactive demo |
| User Story 3 | 6 | Auth redirect + banner |
| User Story 4 | 3 | Mission content |
| Polish | 8 | E2E tests, accessibility |
| **Total** | **39** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Brand color migration affects entire app - test visual regression
