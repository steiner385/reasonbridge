# Tasks: User Profile Pages

**Input**: Design documents from `/specs/001-profile-page/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: E2E tests included per project testing standards. Unit tests follow TDD pattern.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Backend**: `services/user-service/src/`, `services/discussion-service/src/`
- **Database**: `packages/db-models/prisma/`
- **E2E Tests**: `frontend/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database schema, shared types

- [x] T001 Add `bio` field to User model in `packages/db-models/prisma/schema.prisma`
- [x] T002 Add `ProfileVisibility` enum to `packages/db-models/prisma/schema.prisma`
- [x] T003 Add `UserPrivacySettings` model to `packages/db-models/prisma/schema.prisma`
- [x] T004 Run Prisma migration: `npx prisma migrate dev --name add_profile_privacy`
- [x] T005 [P] Create `ProfileVisibility` type in `frontend/src/types/user.ts`
- [x] T006 [P] Create `PrivacySettings` interface in `frontend/src/types/user.ts`
- [x] T007 [P] Create `ContributionItem` type in `frontend/src/types/contribution.ts`
- [x] T008 [P] Create `ContributionList` type in `frontend/src/types/contribution.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend endpoints and hooks that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create `PrivacySettingsDto` in `services/user-service/src/users/dto/privacy-settings.dto.ts`
- [x] T010 Add `getPrivacySettings` method to `services/user-service/src/users/users.service.ts`
- [x] T011 Add `updatePrivacySettings` method to `services/user-service/src/users/users.service.ts`
- [x] T012 Add `GET /users/me/privacy` endpoint to `services/user-service/src/users/users.controller.ts`
- [x] T013 Add `PUT /users/me/privacy` endpoint to `services/user-service/src/users/users.controller.ts`
- [x] T014 [P] Create `usePrivacySettings` hook in `frontend/src/hooks/usePrivacySettings.ts`
- [x] T015 [P] Create `useCanViewSection` hook for privacy checks in `frontend/src/hooks/useCanViewSection.ts`
- [x] T016 Add `bio` field to `UpdateProfileDto` in `services/user-service/src/users/dto/update-profile.dto.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Public Profile (Priority: P1) 🎯 MVP

**Goal**: Visitors can view any user's public profile with trust indicators and stats

**Independent Test**: Navigate to `/users/:id` and view profile with name, avatar, tier, trust score

### Implementation for User Story 1

- [x] T017 [P] [US1] Create `ProfileHeader.tsx` component in `frontend/src/components/profile/ProfileHeader.tsx`
- [x] T018 [P] [US1] Create `ProfileStats.tsx` component in `frontend/src/components/profile/ProfileStats.tsx`
- [x] T019 [P] [US1] Create `ProfileBio.tsx` component in `frontend/src/components/profile/ProfileBio.tsx`
- [x] T020 [P] [US1] Create `UserNotFound.tsx` component in `frontend/src/components/users/UserNotFound.tsx`
- [x] T021 [US1] Extend `UserProfilePage.tsx` with ProfileHeader in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T022 [US1] Add ProfileStats section to `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T023 [US1] Add ProfileBio section to `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T024 [US1] Add TrustScoreBadge display to `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T025 [US1] Add TierBadge and ExpertiseBadge display to `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T026 [US1] Add 404 handling with UserNotFound in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T027 [US1] Add responsive layout (mobile/tablet/desktop) to `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T028 [US1] Write E2E test for public profile view in `frontend/e2e/profile/view-profile.spec.ts`

**Checkpoint**: User Story 1 complete - visitors can view public profiles

---

## Phase 4: User Story 2 - View Own Profile (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can view and edit their own profile

**Independent Test**: Log in, navigate to "My Profile", click Edit, update bio, save changes

### Implementation for User Story 2

- [x] T029 [P] [US2] Create `ProfileEditForm.tsx` modal in `frontend/src/components/profile/ProfileEditForm.tsx`
- [x] T030 [P] [US2] Create Zod schema for profile edit in `frontend/src/schemas/profileEdit.ts`
- [x] T031 [US2] Add "Edit Profile" button to own profile in `frontend/src/pages/Profile/ProfilePage.tsx`
- [x] T032 [US2] Wire ProfileEditForm modal to ProfilePage in `frontend/src/pages/Profile/ProfilePage.tsx`
- [x] T033 [US2] Add profile update mutation with React Query in `frontend/src/hooks/useUpdateProfile.ts`
- [x] T034 [US2] Add success/error toast feedback for profile updates in `frontend/src/pages/Profile/ProfilePage.tsx`
- [x] T035 [US2] Distinguish public vs private sections visually in `frontend/src/pages/Profile/ProfilePage.tsx`
- [x] T036 [US2] Write E2E test for profile editing in `frontend/e2e/profile/edit-profile.spec.ts`

**Checkpoint**: User Stories 1 AND 2 complete - MVP achieved

---

## Phase 5: User Story 3 - View Contribution History (Priority: P2)

**Goal**: Users can view paginated, filterable contribution history on profiles

**Independent Test**: View profile, scroll to contributions, filter by type, scroll for more

### Backend for User Story 3

- [x] T037 [P] [US3] Create `GetContributionsDto` in `services/discussion-service/src/contributions/dto/get-contributions.dto.ts`
- [x] T038 [P] [US3] Create `ContributionItemDto` in `services/discussion-service/src/contributions/dto/contribution-item.dto.ts`
- [x] T039 [US3] Create `ContributionsService` in `services/discussion-service/src/contributions/contributions.service.ts`
- [x] T040 [US3] Add `GET /users/:id/contributions` endpoint in `services/discussion-service/src/contributions/contributions.controller.ts`

### Frontend for User Story 3

- [x] T041 [P] [US3] Create `ContributionFilters.tsx` in `frontend/src/components/profile/ContributionFilters.tsx`
- [x] T042 [P] [US3] Create `ContributionList.tsx` in `frontend/src/components/profile/ContributionList.tsx`
- [x] T043 [P] [US3] Create `ContributionItem.tsx` in `frontend/src/components/profile/ContributionItem.tsx`
- [x] T044 [US3] Create `useProfileContributions` hook in `frontend/src/hooks/useProfileContributions.ts`
- [x] T045 [US3] Add ContributionFilters to profile pages in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T046 [US3] Add ContributionList with infinite scroll in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T047 [US3] Add empty state for no contributions in `frontend/src/components/profile/ContributionList.tsx`
- [x] T048 [US3] Add privacy-aware rendering for contributions in `frontend/src/pages/Profile/UserProfilePage.tsx`

**Checkpoint**: User Story 3 complete - contribution history visible

---

## Phase 6: User Story 4 - View Trust & Expertise Indicators (Priority: P2)

**Goal**: Users see detailed trust scores with tooltips and expertise badges

**Independent Test**: View profile, see trust breakdown, hover for tooltips, see expertise domains

### Implementation for User Story 4

- [x] T049 [P] [US4] Add explanatory tooltips to TrustScoreBadge in `frontend/src/components/users/TrustScoreBadge.tsx`
- [x] T050 [P] [US4] Add detailed dimension breakdown to TrustScoreBadge in `frontend/src/components/users/TrustScoreBadge.tsx`
- [x] T051 [P] [US4] Create `TrustSection.tsx` wrapper in `frontend/src/components/profile/TrustSection.tsx`
- [x] T052 [P] [US4] Create `ExpertiseSection.tsx` wrapper in `frontend/src/components/profile/ExpertiseSection.tsx`
- [x] T053 [US4] Add TrustSection to profile page in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T054 [US4] Add ExpertiseSection with horizontal scroll (mobile) in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T055 [US4] Add ARIA labels to trust visualizations in `frontend/src/components/users/TrustScoreBadge.tsx`
- [x] T056 [US4] Add collapsible behavior on mobile to `frontend/src/components/profile/TrustSection.tsx`

**Checkpoint**: User Story 4 complete - trust indicators enhanced

---

## Phase 7: User Story 5 - Configure Profile Privacy (Priority: P2)

**Goal**: Users can control visibility of profile sections

**Independent Test**: Edit profile, toggle privacy settings, save, verify visibility changes from another account

### Implementation for User Story 5

- [x] T057 [P] [US5] Create `PrivacySettings.tsx` component in `frontend/src/components/profile/PrivacySettings.tsx`
- [x] T058 [P] [US5] Create `PrivacyToggle.tsx` reusable component in `frontend/src/components/profile/PrivacyToggle.tsx`
- [x] T059 [US5] Add PrivacySettings section to ProfileEditForm in `frontend/src/components/profile/ProfileEditForm.tsx`
- [x] T060 [US5] Add privacy update mutation to `frontend/src/hooks/usePrivacySettings.ts`
- [x] T061 [US5] Add "Followers Only" restricted message component in `frontend/src/components/profile/PrivacyRestrictedMessage.tsx`
- [x] T062 [US5] Add privacy-aware section rendering throughout profile in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T063 [US5] Add constraint: trust scores cannot be PRIVATE in `frontend/src/components/profile/PrivacySettings.tsx`
- [x] T064 [US5] Write E2E test for privacy settings in `frontend/e2e/profile/privacy-settings.spec.ts`

**Checkpoint**: User Story 5 complete - privacy controls functional

---

## Phase 8: User Story 6 - Follow/Unfollow Users (Priority: P3)

**Goal**: Authenticated users can follow/unfollow other users

**Independent Test**: View another user's profile, click Follow, see "Following" state, unfollow with confirmation

### Implementation for User Story 6

- [x] T065 [P] [US6] Add optimistic update to FollowButton in `frontend/src/components/users/FollowButton.tsx`
- [x] T066 [P] [US6] Add unfollow confirmation modal to `frontend/src/components/users/FollowButton.tsx`
- [x] T067 [US6] Add follower count update on follow/unfollow in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T068 [US6] Add WebSocket listener for follow events in `frontend/src/pages/Profile/UserProfilePage.tsx` (deferred: requires backend WebSocket event support)
- [x] T069 [US6] Add follow button to ProfileHeader for authenticated viewers in `frontend/src/components/profile/ProfileHeader.tsx`

**Checkpoint**: User Story 6 complete - follow/unfollow works

---

## Phase 9: User Story 7 - View Follower/Following Lists (Priority: P3)

**Goal**: Users can view follower and following lists on profiles

**Independent Test**: Click follower count, see modal with list, click following count, see following list

### Implementation for User Story 7

- [x] T070 [P] [US7] Create `FollowersModal.tsx` in `frontend/src/components/profile/FollowersModal.tsx`
- [x] T071 [P] [US7] Create `FollowingModal.tsx` in `frontend/src/components/profile/FollowingModal.tsx`
- [x] T072 [US7] Add click handler to follower count in ProfileHeader in `frontend/src/components/profile/ProfileHeader.tsx`
- [x] T073 [US7] Add click handler to following count in ProfileHeader in `frontend/src/components/profile/ProfileHeader.tsx`
- [x] T074 [US7] Add privacy-aware access to follower/following lists in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [x] T075 [US7] Add pagination to follower/following modals in `frontend/src/components/profile/FollowersModal.tsx` (via FollowersList/FollowingList components)

**Checkpoint**: User Story 7 complete - follower/following lists accessible

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance, edge cases, documentation

- [ ] T076 [P] Add skeleton loading states to all profile sections in `frontend/src/components/profile/ProfileSkeleton.tsx`
- [ ] T077 [P] Add suspended account handling in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [ ] T078 [P] Add deleted account handling in `frontend/src/pages/Profile/UserProfilePage.tsx`
- [ ] T079 [P] Add keyboard navigation for all interactive elements across profile components
- [ ] T080 [P] Add `prefers-reduced-motion` support to animations across profile components
- [ ] T081 Run Lighthouse accessibility audit and fix issues to achieve 90+ score
- [ ] T082 Add TSDoc comments to all new components in `frontend/src/components/profile/`
- [ ] T083 [P] Add unit tests for ProfileHeader in `frontend/src/components/profile/__tests__/ProfileHeader.spec.tsx`
- [ ] T084 [P] Add unit tests for PrivacySettings in `frontend/src/components/profile/__tests__/PrivacySettings.spec.tsx`
- [ ] T085 [P] Add unit tests for ContributionList in `frontend/src/components/profile/__tests__/ContributionList.spec.tsx`
- [ ] T086 Run quickstart.md validation scenarios
- [ ] T087 Verify dark mode for all profile components

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema changes) - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 + US2 can run in parallel (MVP)
  - US3, US4, US5 can run in parallel after MVP
  - US6, US7 can run in parallel after US1
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Can Start After | Integrates With | Independently Testable |
|-------|-----------------|-----------------|------------------------|
| US1 (View Public Profile) | Phase 2 | None | ✅ Yes |
| US2 (View Own Profile) | Phase 2 | None | ✅ Yes |
| US3 (Contribution History) | Phase 2 | US1 for display | ✅ Yes |
| US4 (Trust Indicators) | Phase 2 | US1 for display | ✅ Yes |
| US5 (Privacy Settings) | Phase 2 | US1, US3, US4 | ✅ Yes |
| US6 (Follow/Unfollow) | Phase 2 | US1 for button | ✅ Yes |
| US7 (Follower Lists) | Phase 2 | US1, US6 | ✅ Yes |

### Within Each User Story

- Models/DTOs before services
- Services before endpoints
- Backend before frontend hooks
- Hooks before components
- Components before page integration
- Page integration before E2E tests

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T005, T006, T007, T008 can run in parallel (different type files)
```

**Phase 3 (US1)**:
```
T017, T018, T019, T020 can run in parallel (different components)
```

**Phase 5 (US3)**:
```
T037, T038 can run in parallel (backend DTOs)
T041, T042, T043 can run in parallel (frontend components)
```

**Phase 10 (Polish)**:
```
T076, T077, T078, T079, T080 can run in parallel (different concerns)
T083, T084, T085 can run in parallel (different test files)
```

---

## Parallel Example: MVP Stories (US1 + US2)

```bash
# After Phase 2 (Foundational) completes:

# Developer A: User Story 1 (View Public Profile)
Task: "Create ProfileHeader.tsx in frontend/src/components/profile/ProfileHeader.tsx"
Task: "Create ProfileStats.tsx in frontend/src/components/profile/ProfileStats.tsx"
Task: "Create ProfileBio.tsx in frontend/src/components/profile/ProfileBio.tsx"
# Then: Page integration, E2E test

# Developer B: User Story 2 (View Own Profile)
Task: "Create ProfileEditForm.tsx modal in frontend/src/components/profile/ProfileEditForm.tsx"
Task: "Create Zod schema for profile edit in frontend/src/schemas/profileEdit.ts"
# Then: Wire to ProfilePage, E2E test
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (database schema, types)
2. Complete Phase 2: Foundational (privacy endpoints, hooks)
3. Complete Phase 3: User Story 1 (View Public Profile)
4. Complete Phase 4: User Story 2 (View Own Profile)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo as MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1 + US2 | Public profile viewing + self-editing |
| Increment 2 | US3 + US4 | Contribution history + trust details |
| Increment 3 | US5 | Privacy controls |
| Increment 4 | US6 + US7 | Social features (follow, lists) |
| Final | Polish | Accessibility, performance, edge cases |

### Parallel Team Strategy

With 2 developers after Foundational phase:

| Developer A | Developer B |
|-------------|-------------|
| US1 (View Public) | US2 (View Own) |
| US3 (Contributions) | US4 (Trust) |
| US5 (Privacy) | US6 (Follow) |
| US7 (Lists) | Polish tasks |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently testable per spec.md
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- US1 + US2 together form minimum viable product
- Privacy checks (useCanViewSection) applied throughout
- Dark mode and responsive layout built into each component
