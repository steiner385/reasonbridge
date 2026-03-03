# Implementation Plan: User Profile Pages

**Branch**: `001-profile-page` | **Date**: 2026-03-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-profile-page/spec.md`

## Summary

Implement comprehensive user profile pages that display user identity (name, avatar), credibility indicators (trust scores, tier, expertise badges), activity history (contributions, statistics), and social connections (followers, following). The feature extends existing profile infrastructure with privacy controls, contribution filtering, and responsive layouts optimized for mobile-first usage.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode), React 19.2.4, Node.js 20 LTS (NestJS backend)
**Primary Dependencies**: React Query 5.90.21, React Hook Form 7.71.2, Zod 4.3.5, Tailwind CSS 3.4.19, Socket.io-client 4.8.3
**Storage**: PostgreSQL 15 via Prisma ORM (existing User, UserRank, TopicExpertise, UserFollow models)
**Testing**: Vitest 2.x (unit/integration), Playwright 1.58.0 (E2E)
**Target Platform**: Web (desktop/tablet/mobile), minimum 320px viewport width
**Project Type**: Web application (frontend + backend microservices)
**Performance Goals**: Profile page load <2s, follow/unfollow <500ms, privacy changes <1s
**Constraints**: 90+ Lighthouse accessibility score, WCAG AA compliance, 44px minimum touch targets
**Scale/Scope**: ~10k users, extends existing user-service, ~15 new frontend components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Code Quality - Linting | Zero warnings before merge | ✅ Pass | ESLint configured, strict mode enabled |
| I. Code Quality - Type Safety | TypeScript strict, no `any` | ✅ Pass | Existing patterns use strict types |
| I. Code Quality - Code Review | At least one reviewer | ✅ Pass | PR workflow enforced |
| I. Code Quality - Documentation | Public APIs with JSDoc | ✅ Pass | Existing components have TSDoc |
| II. Testing - Coverage | 80% minimum for business logic | ✅ Pass | Unit + integration tests planned |
| II. Testing - Test-First | Failing test before fix | ✅ Pass | TDD approach in workflow |
| II. Testing - CI Gate | All tests pass | ✅ Pass | Jenkins CI enforced |
| III. UX - Response Time | Loading indicator for >1s operations | ✅ Pass | Skeleton loading patterns used |
| III. UX - Error Messages | Actionable error messages | ✅ Pass | ErrorState component pattern |
| III. UX - Destructive Actions | Confirmation required | ✅ Pass | Unfollow has confirm pattern |
| IV. Performance - Command Response | <3s initial response | ✅ Pass | <2s goal exceeds requirement |
| IV. Performance - Database Queries | <100ms individual queries | ✅ Pass | Indexed queries, caching |

**Gate Status**: ✅ PASSED - All constitution principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/001-profile-page/
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions
├── quickstart.md        # Getting started guide
├── contracts/           # API contracts
│   ├── profile-api.yaml # Profile endpoints (OpenAPI)
│   └── privacy-api.yaml # Privacy settings (OpenAPI)
└── tasks.md             # Task breakdown (Phase 2)
```

### Source Code (repository root)

```text
# Web application structure (frontend + backend)

frontend/
├── src/
│   ├── components/
│   │   ├── profile/           # NEW: Profile-specific components
│   │   │   ├── ProfileHeader.tsx
│   │   │   ├── ProfileBio.tsx
│   │   │   ├── ProfileStats.tsx
│   │   │   ├── ProfileEditForm.tsx
│   │   │   ├── PrivacySettings.tsx
│   │   │   ├── ContributionList.tsx
│   │   │   ├── ContributionFilters.tsx
│   │   │   └── __tests__/
│   │   ├── users/              # EXTEND: Existing user components
│   │   │   ├── TrustScoreBadge.tsx  # (exists)
│   │   │   ├── FollowButton.tsx     # (exists)
│   │   │   ├── FollowersList.tsx    # (exists)
│   │   │   ├── FollowingList.tsx    # (exists)
│   │   │   └── UserNotFound.tsx     # NEW
│   │   └── ranking/            # (exists - TierBadge, ExpertiseBadge)
│   ├── pages/
│   │   └── Profile/
│   │       ├── ProfilePage.tsx      # EXTEND: Own profile view
│   │       ├── UserProfilePage.tsx  # EXTEND: Public profile view
│   │       └── __tests__/
│   ├── hooks/
│   │   ├── useProfileContributions.ts  # NEW
│   │   └── usePrivacySettings.ts       # NEW
│   ├── types/
│   │   ├── user.ts                  # EXTEND: PrivacySettings type
│   │   └── contribution.ts          # NEW
│   └── lib/
│       └── useUser.ts               # (exists)
└── e2e/
    └── profile/
        ├── view-profile.spec.ts     # NEW
        ├── edit-profile.spec.ts     # NEW
        └── privacy-settings.spec.ts # NEW

services/
├── user-service/
│   └── src/
│       └── users/
│           ├── users.controller.ts      # EXTEND: Privacy endpoints
│           ├── users.service.ts         # EXTEND: Privacy logic
│           └── dto/
│               └── privacy-settings.dto.ts  # NEW
└── discussion-service/
    └── src/
        └── contributions/
            └── contributions.controller.ts  # EXTEND: User contributions

packages/
└── db-models/
    └── prisma/
        └── schema.prisma           # EXTEND: PrivacySettings model
```

**Structure Decision**: Web application structure selected. Extends existing frontend/backend patterns. New components in `frontend/src/components/profile/`, extends `user-service` for privacy settings.

## Complexity Tracking

> No violations requiring justification. Implementation uses existing patterns.

---

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design artifacts completed._

| Principle | Post-Design Status | Design Evidence |
|-----------|-------------------|-----------------|
| I. Code Quality - Type Safety | ✅ Pass | OpenAPI contracts define all types; Zod schemas for validation |
| I. Code Quality - Documentation | ✅ Pass | JSDoc planned for all new components |
| II. Testing - Coverage | ✅ Pass | Test files specified in project structure |
| II. Testing - Mocking | ✅ Pass | API client patterns support mocking |
| III. UX - Error Messages | ✅ Pass | Privacy restricted response defined in API |
| III. UX - Graceful Degradation | ✅ Pass | Privacy-aware rendering handles restrictions gracefully |
| IV. Performance - DB Queries | ✅ Pass | Indexed queries specified in data-model.md |
| IV. Performance - Caching | ✅ Pass | React Query cache durations defined |

**Post-Design Gate Status**: ✅ PASSED - Design artifacts align with constitution

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/001-profile-page/plan.md` | ✅ Complete |
| Research | `specs/001-profile-page/research.md` | ✅ Complete |
| Data Model | `specs/001-profile-page/data-model.md` | ✅ Complete |
| Profile API Contract | `specs/001-profile-page/contracts/profile-api.yaml` | ✅ Complete |
| Privacy API Contract | `specs/001-profile-page/contracts/privacy-api.yaml` | ✅ Complete |
| Quickstart Guide | `specs/001-profile-page/quickstart.md` | ✅ Complete |

---

## Next Steps

1. Run `/speckit.tasks` to generate task breakdown
2. Review and approve tasks
3. Run `/speckit.implement` to begin implementation

