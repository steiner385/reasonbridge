# Implementation Plan: Skeleton Loaders for Async Content

**Branch**: `002-skeleton-loaders` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-skeleton-loaders/spec.md`

## Summary

Replace spinner-based loading states with skeleton loaders that match actual content layout, improving perceived performance and eliminating layout shift. Implementation uses Tailwind CSS's `animate-pulse` for animation and React composition for reusable skeleton components. No backend changes required - purely frontend presentation enhancement.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18
**Primary Dependencies**: React 18, Tailwind CSS 3.x, React Query (via custom hooks)
**Storage**: N/A (no database changes)
**Testing**: Vitest 2.x + React Testing Library (unit), Playwright 1.40+ (E2E)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend-only changes)
**Performance Goals**: CLS < 0.1, smooth 60fps animation
**Constraints**: No skeleton flash for loads < 100ms, match existing gray palette
**Scale/Scope**: 4 pages (Topics, TopicDetail, Profile, UserProfile), ~10 components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Code Quality
- [x] **Linting**: Skeleton components will pass ESLint with zero warnings
- [x] **Type Safety**: Full TypeScript interfaces defined in data-model.md
- [x] **Code Review**: All changes go through PR review
- [x] **DRY Principle**: Base Skeleton component composed into variants
- [x] **Documentation**: JSDoc comments on all public component props
- [x] **Error Handling**: N/A - presentational only, no async operations

### II. Testing Standards
- [x] **Coverage Threshold**: Unit tests for all skeleton components (>80%)
- [x] **Test-First**: N/A - not a bug fix
- [x] **Test Categories**: Unit tests for components, E2E for integration
- [x] **Test Naming**: Will follow `[component]_[scenario]_[expected]` pattern
- [x] **Mocking**: No external services to mock
- [x] **CI Gate**: All tests must pass before merge

### III. User Experience Consistency
- [x] **Response Time Feedback**: Skeleton provides immediate visual feedback
- [x] **Error Messages**: N/A - no error states introduced
- [x] **Command Patterns**: N/A - not a command-based feature
- [x] **Accessibility**: ARIA attributes per FR-006 (aria-busy, aria-label)
- [x] **Graceful Degradation**: Skeleton degrades to simple gray boxes if animation fails
- [x] **Confirmation for Destructive Actions**: N/A

### IV. Performance Requirements
- [x] **Command Response**: Skeleton appears within 100ms (or not at all for fast loads)
- [x] **Memory Usage**: Minimal - CSS-only animations, lightweight DOM
- [x] **Startup Time**: N/A
- [x] **Rate Limiting**: N/A
- [x] **Database Queries**: N/A
- [x] **Concurrent Users**: CSS animations scale infinitely

**Constitution Status**: ✅ All applicable principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/002-skeleton-loaders/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research output
├── data-model.md        # TypeScript interfaces
├── quickstart.md        # Getting started guide
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Task breakdown (Phase 2)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── Skeleton/              # Base skeleton primitives
│   │       │   ├── index.ts           # Public exports
│   │       │   ├── Skeleton.tsx       # Base component
│   │       │   ├── SkeletonText.tsx   # Multi-line text skeleton
│   │       │   ├── SkeletonAvatar.tsx # Circular avatar skeleton
│   │       │   ├── types.ts           # TypeScript interfaces
│   │       │   ├── constants.ts       # Style constants
│   │       │   └── Skeleton.spec.tsx  # Unit tests
│   │       │
│   │       └── skeletons/             # Composite page-specific skeletons
│   │           ├── index.ts
│   │           ├── TopicCardSkeleton.tsx
│   │           ├── TopicDetailSkeleton.tsx
│   │           ├── ProfileSkeleton.tsx
│   │           ├── ResponseSkeleton.tsx
│   │           └── skeletons.spec.tsx # Composite tests
│   │
│   └── pages/
│       ├── Topics/
│       │   ├── TopicsPage.tsx         # Integrate TopicCardSkeleton
│       │   └── TopicDetailPage.tsx    # Integrate TopicDetailSkeleton
│       └── Profile/
│           ├── ProfilePage.tsx        # Integrate ProfileSkeleton
│           └── UserProfilePage.tsx    # Integrate ProfileSkeleton
│
└── e2e/
    └── skeleton-loaders.spec.ts       # E2E tests for skeleton behavior
```

**Structure Decision**: Using existing web application structure. New components go in `components/ui/Skeleton/` (primitives) and `components/ui/skeletons/` (composites). Page integrations modify existing page components.

## Implementation Phases

### Phase 1: Base Skeleton Components (2-3 hours)

**Create base skeleton primitives:**

1. `Skeleton.tsx` - Base component with variant, animation, size props
2. `SkeletonText.tsx` - Multi-line text with configurable line count
3. `SkeletonAvatar.tsx` - Circular skeleton with size variants
4. `types.ts` and `constants.ts` - Shared types and style mappings
5. Unit tests for all primitives

**Acceptance**:
- Components render with pulse animation
- ARIA attributes present
- All unit tests pass

### Phase 2: Composite Skeletons (2-3 hours)

**Create page-specific skeleton compositions:**

1. `TopicCardSkeleton.tsx` - Matches TopicCard layout exactly
2. `TopicDetailSkeleton.tsx` - Header, description, responses, analysis sections
3. `ProfileSkeleton.tsx` - Avatar, name, stats, activity
4. `ResponseSkeleton.tsx` - Single response card skeleton
5. Unit tests for composites

**Acceptance**:
- Skeletons match actual component dimensions
- No layout shift when measured (CLS check)

### Phase 3: Page Integration (2-3 hours)

**Integrate skeletons into pages:**

1. `TopicsPage.tsx` - Replace spinner with TopicCardSkeleton list
2. `TopicDetailPage.tsx` - Replace spinner with TopicDetailSkeleton
3. `ProfilePage.tsx` - Replace spinner with ProfileSkeleton
4. `UserProfilePage.tsx` - Reuse ProfileSkeleton

**Acceptance**:
- All pages show skeletons during loading
- No spinner elements remain
- Transitions are smooth

### Phase 4: E2E Tests & Polish (2-3 hours)

1. Write E2E tests for skeleton behavior
2. Add flash prevention (100ms delay)
3. Verify accessibility with axe-core
4. Performance testing with Lighthouse
5. Code review and cleanup

**Acceptance**:
- E2E tests pass
- CLS < 0.1 on all tested pages
- WCAG 2.2 AA compliance

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Complexity | Rationale |
|--------|------------|-----------|
| Component architecture | Low | Standard React composition pattern |
| Animation | Low | Using built-in Tailwind animate-pulse |
| Accessibility | Low | Standard ARIA attributes |
| Testing | Medium | E2E tests require network throttling |

## Critical Dependencies

- **Tailwind CSS animate-pulse**: Already available, no config changes
- **React Query isLoading**: Already used in all target pages
- **Existing Card component**: Skeleton dimensions based on Card padding

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Layout shift despite matching | Medium | Measure actual components, use CSS containment |
| Animation performance | Low | Use GPU-accelerated animate-pulse |
| Inconsistent across pages | Medium | Create page-specific composites, not generic |

## Success Criteria Validation

| Criterion | How Verified |
|-----------|--------------|
| SC-001: All async pages have skeletons | Manual audit of pages |
| SC-002: CLS < 0.1 | Lighthouse performance audit |
| SC-003: 200ms minimum display | E2E test with timing assertions |
| SC-004: WCAG 2.2 AA | axe-core accessibility audit |
| SC-005: Reusable components | Code review of component structure |

## Next Steps

Run `/speckit.tasks` to generate actionable task breakdown for implementation.
