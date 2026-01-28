# Tasks: OAuth2 E2E Test Infrastructure

**Input**: Design documents from `/specs/009-oauth-e2e-tests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests for mock utilities are included as they are explicitly part of the implementation plan (Vitest for mock utility functions).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend E2E**: `frontend/e2e/` - Playwright tests and fixtures
- **Frontend Utils**: `frontend/e2e/utils/` - Mock utilities
- **Backend Auth**: `services/user-service/src/auth/` - Auth service modifications

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure and base types for OAuth mocking

- [ ] T001 Create fixtures directory at `frontend/e2e/fixtures/`
- [ ] T002 Create utils directory at `frontend/e2e/utils/`
- [ ] T003 [P] Create TypeScript type definitions for OAuthMockConfig in `frontend/e2e/utils/oauth-types.ts`
- [ ] T004 [P] Create TypeScript type definitions for OAuthScenario enum in `frontend/e2e/utils/oauth-types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core mock utilities and fixtures that ALL user stories depend on

**⚠️ CRITICAL**: No OAuth test work can begin until this phase is complete

- [ ] T005 Implement mock data generators (generateMockEmail, generateMockStateToken, generateMockAuthCode) in `frontend/e2e/utils/oauth-mock.ts`
- [ ] T006 Implement MockOAuthTokens generator in `frontend/e2e/utils/oauth-mock.ts`
- [ ] T007 [P] Write unit tests for mock data generators in `frontend/e2e/utils/oauth-mock.test.ts`
- [ ] T008 Create base Playwright fixture with route interception in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T009 Implement OAuth initiation route interception (`**/auth/oauth/initiate**`) in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T010 Add mock OAuth callback handler to AuthService when AUTH_MOCK=true in `services/user-service/src/auth/auth.service.ts`
- [ ] T011 Verify AUTH_MOCK=true is set in `docker-compose.e2e.yml` for user-service

**Checkpoint**: Foundation ready - OAuth mock infrastructure is in place

---

## Phase 3: User Story 1 - Enable OAuth E2E Tests in CI (Priority: P1) 🎯 MVP

**Goal**: Remove `test.describe.skip` and enable all OAuth tests to run in CI with mock infrastructure

**Independent Test**: Run `pnpm test:e2e --grep "OAuth"` and verify all 29 tests pass without timeouts

### Implementation for User Story 1

- [ ] T012 [US1] Import oauth-mock.fixture in `frontend/e2e/oauth-flow.spec.ts` replacing standard test import
- [ ] T013 [US1] Replace `test.describe.skip` with `test.describe` in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T014 [US1] Update test helper `simulateOAuthCallback` to use fixture's mock route in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T015 [US1] Run OAuth tests locally to verify they execute (not necessarily pass yet)
- [ ] T016 [US1] Fix any test selector issues due to UI changes since tests were written in `frontend/e2e/oauth-flow.spec.ts`

**Checkpoint**: OAuth tests run in CI (may have failures, but no longer skipped/timing out)

---

## Phase 4: User Story 2 - Mock Google OAuth Provider (Priority: P1)

**Goal**: Implement complete Google OAuth mock so all Google-related tests pass

**Independent Test**: Run `pnpm test:e2e --grep "Google OAuth"` and verify all Google tests pass

### Implementation for User Story 2

- [ ] T017 [P] [US2] Implement MockGoogleProfile generator in `frontend/e2e/utils/oauth-mock.ts`
- [ ] T018 [P] [US2] Write unit test for MockGoogleProfile generator in `frontend/e2e/utils/oauth-mock.test.ts`
- [ ] T019 [US2] Implement Google-specific route interception for OAuth callback in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T020 [US2] Add handleMockGoogleOAuthCallback method in `services/user-service/src/auth/auth.service.ts`
- [ ] T021 [US2] Verify Google OAuth success scenario test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T022 [US2] Verify Google OAuth cancellation test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T023 [US2] Verify Google OAuth auto-verify email test passes in `frontend/e2e/oauth-flow.spec.ts`

**Checkpoint**: All 9 Google OAuth tests pass

---

## Phase 5: User Story 3 - Mock Apple OAuth Provider (Priority: P2)

**Goal**: Implement complete Apple OAuth mock including "Hide My Email" relay addresses

**Independent Test**: Run `pnpm test:e2e --grep "Apple OAuth"` and verify all Apple tests pass

### Implementation for User Story 3

- [ ] T024 [P] [US3] Implement MockAppleProfile generator with private relay support in `frontend/e2e/utils/oauth-mock.ts`
- [ ] T025 [P] [US3] Implement generateAppleRelayEmail function in `frontend/e2e/utils/oauth-mock.ts`
- [ ] T026 [P] [US3] Write unit tests for Apple mock generators in `frontend/e2e/utils/oauth-mock.test.ts`
- [ ] T027 [US3] Implement Apple-specific route interception for OAuth callback in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T028 [US3] Add handleMockAppleOAuthCallback method in `services/user-service/src/auth/auth.service.ts`
- [ ] T029 [US3] Verify Apple OAuth success scenario test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T030 [US3] Verify Apple OAuth cancellation test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T031 [US3] Verify Apple "Hide My Email" relay email test passes in `frontend/e2e/oauth-flow.spec.ts`

**Checkpoint**: All 5 Apple OAuth tests pass

---

## Phase 6: User Story 4 - OAuth Error Scenario Testing (Priority: P2)

**Goal**: Enable all error scenario tests (network failures, expired tokens, CSRF attacks)

**Independent Test**: Run `pnpm test:e2e --grep "OAuth Error"` and verify all error tests pass

### Implementation for User Story 4

- [ ] T032 [P] [US4] Add `scenario` configuration support for error cases in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T033 [US4] Implement network error simulation via route.abort() in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T034 [US4] Implement server error simulation (500 response) in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T035 [US4] Implement expired state token scenario in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T036 [US4] Verify network error test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T037 [US4] Verify server error test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T038 [US4] Verify expired state token test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T039 [US4] Verify invalid state token (CSRF) test passes in `frontend/e2e/oauth-flow.spec.ts`

**Checkpoint**: All 7 OAuth error handling tests pass

---

## Phase 7: User Story 5 - OAuth Account Linking (Priority: P3)

**Goal**: Enable account linking tests (existing email + OAuth)

**Independent Test**: Run `pnpm test:e2e --grep "OAuth Account Linking"` and verify linking tests pass

### Implementation for User Story 5

- [ ] T040 [US5] Configure test to create email/password account before OAuth attempt in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T041 [US5] Implement mock response for "account exists" scenario in `frontend/e2e/fixtures/oauth-mock.fixture.ts`
- [ ] T042 [US5] Verify account linking prompt test passes in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T043 [US5] Verify both auth methods work after linking (if implemented) in `frontend/e2e/oauth-flow.spec.ts`

**Checkpoint**: Account linking tests pass (or are properly skipped if feature not implemented)

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: UI/UX tests, responsive tests, accessibility tests, security tests, and documentation

- [ ] T044 [P] Verify OAuth UI tests pass (buttons visible, loading states) in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T045 [P] Verify responsive design tests pass (mobile, tablet viewports) in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T046 [P] Verify accessibility tests pass (keyboard navigation, ARIA) in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T047 [P] Verify security tests pass (tokens not in URL) in `frontend/e2e/oauth-flow.spec.ts`
- [ ] T048 Run full OAuth test suite and verify all 29 tests pass
- [ ] T049 Run OAuth tests 10 times consecutively to verify no flakiness
- [ ] T050 Verify OAuth test suite completes within 5 minutes total
- [ ] T051 Update quickstart.md with actual file paths and working examples in `specs/009-oauth-e2e-tests/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - enables tests to run
- **User Story 2 (Phase 4)**: Depends on User Story 1 - Google OAuth mock
- **User Story 3 (Phase 5)**: Depends on Foundational - can run parallel to US2
- **User Story 4 (Phase 6)**: Depends on US2 or US3 - error scenarios
- **User Story 5 (Phase 7)**: Depends on US2 - account linking
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
    ├── Phase 3: US1 - Enable Tests (P1) ← MVP
    │       ↓
    │   Phase 4: US2 - Google OAuth (P1)
    │       ↓
    │       ├── Phase 6: US4 - Error Scenarios (P2)
    │       └── Phase 7: US5 - Account Linking (P3)
    │
    └── Phase 5: US3 - Apple OAuth (P2) ← Can start parallel to US2
            ↓
        Phase 6: US4 - Error Scenarios (can use Apple too)

Phase 8: Polish (after all stories complete)
```

### Within Each User Story

- Mock utilities before fixtures
- Fixtures before test updates
- Backend changes alongside frontend
- Verify tests pass before moving on

### Parallel Opportunities

**Phase 1 (all parallel):**
- T001, T002 (directory creation)
- T003, T004 (type definitions)

**Phase 2 (some parallel):**
- T007 (unit tests) can run parallel to T005, T006

**Phase 4-5 (US2 and US3 can run in parallel if team capacity allows):**
- T017, T018 (Google profile) parallel
- T024, T025, T026 (Apple profile) parallel

**Phase 8 (all parallel):**
- T044, T045, T046, T047 (UI/responsive/a11y/security tests)

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# Launch model/utility tasks in parallel:
Task: "Implement MockGoogleProfile generator in frontend/e2e/utils/oauth-mock.ts"
Task: "Write unit test for MockGoogleProfile generator in frontend/e2e/utils/oauth-mock.test.ts"

# Then sequentially:
Task: "Implement Google-specific route interception"
Task: "Add handleMockGoogleOAuthCallback method"
Task: "Verify Google OAuth tests pass"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (enable tests)
4. Complete Phase 4: User Story 2 (Google OAuth)
5. **STOP and VALIDATE**: All Google OAuth tests should pass
6. Deploy/demo if ready (Google is primary OAuth provider)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Tests run (may fail) → Progress visible
3. Add US2 → Google tests pass → **MVP Complete**
4. Add US3 → Apple tests pass → iOS users covered
5. Add US4 → Error scenarios pass → Production ready
6. Add US5 → Account linking pass → Edge cases covered
7. Polish → All 29 tests pass, no flakiness → Feature complete

### Success Metrics

| Milestone | Tests Passing | Description |
|-----------|---------------|-------------|
| Foundation | 0 | Infrastructure ready |
| US1 Complete | ~5-10 | Tests run, some pass |
| US2 Complete | ~15 | All Google tests pass |
| US3 Complete | ~20 | All Apple tests pass |
| US4 Complete | ~27 | Error scenarios pass |
| US5 Complete | ~29 | Account linking pass |
| Feature Complete | 29/29 | 100% pass rate |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Existing tests in `oauth-flow.spec.ts` are well-written; focus is on enabling, not rewriting
- Backend changes are minimal (just add mock code path when AUTH_MOCK=true)
- If tests fail after enabling, fix selectors/assertions rather than rewriting tests
- Commit after each phase for easy rollback
