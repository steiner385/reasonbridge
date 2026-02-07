# Implementation Plan: Discussion Page Redesign for Chat-Style UX

**Branch**: `001-discussion-page-redesign` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-discussion-page-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Transform the topic details/discussion page from a vertical-scroll forum layout into a modern three-panel chat-style interface (topics left, conversation center, metadata/analysis right). This redesign optimizes space usage, promotes intuitive conversation flow, and thoughtfully integrates reasonBridge's unique AI-powered feedback mechanisms (preview feedback, common ground analysis, bridging suggestions).

**Technical Approach**: Implement a responsive three-panel layout using CSS Grid with independent scrolling containers. Use React Router for client-side navigation between topics, extend existing WebSocket infrastructure for real-time updates, and implement virtual scrolling (react-window) for large lists and conversation threads. Preserve all existing API contracts while enhancing with pagination support.

## Technical Context

**Language/Version**: TypeScript 5.7.3 with strict mode enabled
**Primary Dependencies**: React 18.3.1, React Router 6.x, Tailwind CSS 3.x, react-window 1.x (virtual scrolling), WebSocket client (existing)
**Storage**: Existing PostgreSQL 15 database with Prisma ORM (no schema changes required)
**Testing**: Vitest 2.x (unit/integration), Playwright 1.58.0 (E2E), React Testing Library
**Target Platform**: Modern browsers (Chrome/Edge/Firefox/Safari last 2 versions), desktop-first (≥1280px), responsive tablet (768-1279px) and mobile (<768px)
**Project Type**: Web application (frontend React SPA + existing backend microservices)
**Performance Goals**:
- Panel switching <100ms (client-side navigation)
- Topic list virtual scrolling handles 500+ items at 60fps
- Conversation thread virtual scrolling handles 500+ responses at 60fps
- Preview feedback debounced to max 1 request per 500ms
- Initial page load <3 seconds (Lighthouse performance score)

**Constraints**:
- Must maintain backward compatibility with existing API endpoints
- Must preserve existing data model (Topic, Response, Proposition, etc.)
- Must integrate seamlessly with existing WebSocket infrastructure
- Must work within existing Jenkins CI/CD pipeline
- Must meet WCAG 2.1 AA accessibility standards
- Must pass existing pre-commit hooks (lint, format, type-check)

**Scale/Scope**:
- Frontend-only changes (no backend API modifications except potential pagination enhancements)
- ~15-20 new/modified React components
- ~5-8 new custom hooks for panel state management
- ~3-5 new CSS modules for panel layouts
- Expected 500-1000 lines of new TypeScript code
- Expected 30-50 new test cases (unit + E2E)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Evaluation Against Core Principles

**I. Code Quality**:
- ✅ **Linting**: All code will use existing ESLint + Prettier configuration (Airbnb + TypeScript rules)
- ✅ **Type Safety**: TypeScript strict mode already enabled; will use proper types for all panel state, WebSocket messages, API responses
- ✅ **Code Review**: PR will follow standard review process (minimum 1 approval required by branch protection)
- ✅ **DRY Principle**: Will extract shared panel logic (resizing, state persistence) into reusable hooks
- ✅ **Documentation**: All new components and hooks will have TSDoc comments
- ✅ **Error Handling**: All API calls, WebSocket connections, and localStorage operations will have explicit error handling with user-friendly fallbacks

**II. Testing Standards**:
- ✅ **Coverage Threshold**: Will maintain 80% coverage for new panel state management logic and hooks
- ✅ **Test-First**: Will write tests before implementation for critical panel interactions (resize, collapse, navigation)
- ✅ **Test Categories**:
  - Unit tests: Panel state hooks, virtual scrolling logic, debounce utilities
  - Integration tests: Topic navigation with API mocking, real-time update handling
  - E2E tests: Full three-panel interaction flow, responsive breakpoints, keyboard navigation
- ✅ **Test Naming**: Will follow pattern `[component/hook]_[scenario]_[expected_result]`
- ✅ **Mocking**: Will mock API calls (useTopic, useResponses) and WebSocket connections in unit tests
- ✅ **CI Gate**: All tests must pass Jenkins pipeline before merge

**III. User Experience Consistency**:
- ✅ **Response Time Feedback**: Panel switches show skeleton loaders during data fetch (already exists for topic/response loading)
- ✅ **Error Messages**: API failures show actionable error states ("Unable to load topic - Retry" button)
- ✅ **Component Patterns**: Reuse existing component patterns (Card, Button, Badge, etc.)
- ✅ **Accessibility**: Full keyboard navigation, ARIA landmarks, screen reader announcements for dynamic content
- ✅ **Graceful Degradation**: Responsive breakpoints collapse panels gracefully (hamburger menu on tablet, vertical stack on mobile)
- ⚠️ **Confirmation for Destructive Actions**: Will add confirmation dialog for discarding unsaved responses when switching topics (NEW requirement from edge cases)

**IV. Performance Requirements**:
- ✅ **Command Response**: Panel switches complete within 100ms (faster than 3-second requirement due to client-side navigation)
- ✅ **Memory Usage**: Virtual scrolling prevents memory bloat from large lists; will monitor bundle size increase (<100KB gzipped for new code)
- ⚠️ **Startup Time**: N/A for web app (no startup time requirement), but initial page load must be <3 seconds
- ⚠️ **Rate Limiting**: Preview feedback API calls debounced to max 2 requests/second per user
- ✅ **Database Queries**: No new queries introduced; existing queries already optimized
- ✅ **Concurrent Users**: Frontend changes don't affect backend concurrency handling

### Gate Results

**Status**: ✅ **PASSED** - All applicable principles satisfied

**Notes**:
1. The "Confirmation for Destructive Actions" requirement is a NEW addition to ensure users don't lose draft responses when navigating between topics (identified in spec edge cases).
2. Some constitution requirements (bot-specific: command response, startup time, memory usage in MB) are not directly applicable to this web frontend feature but are addressed in spirit (page load time, bundle size, client-side performance).
3. No violations or complexity justifications needed - this is a standard React UI refactoring within existing architectural patterns.

## Project Structure

### Documentation (this feature)

```text
specs/001-discussion-page-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - panel layout patterns, virtual scrolling libraries, responsive design best practices
├── data-model.md        # Phase 1 output - unchanged entities (Topic, Response, etc.), new client-side state models
├── quickstart.md        # Phase 1 output - local dev setup, running E2E tests for new layout
├── contracts/           # Phase 1 output - no new API contracts (frontend-only), but document WebSocket message types
├── checklists/          # Existing - requirements.md already created
│   └── requirements.md
├── spec.md              # Feature specification (already exists)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (Option 2: Frontend + Backend)
frontend/
├── src/
│   ├── components/
│   │   ├── discussion-layout/      # NEW: Three-panel layout components
│   │   │   ├── DiscussionLayout.tsx           # Main layout container with panels
│   │   │   ├── TopicNavigationPanel.tsx       # Left panel: topic list, search, filters
│   │   │   ├── ConversationPanel.tsx          # Center panel: responses, compose
│   │   │   ├── MetadataPanel.tsx              # Right panel: propositions, common ground, bridging
│   │   │   ├── PanelResizer.tsx               # Draggable divider between panels
│   │   │   └── __tests__/                     # Unit tests for panel components
│   │   ├── topics/                  # MODIFIED: Existing topic components
│   │   │   ├── TopicList.tsx                  # Refactored for left panel
│   │   │   ├── TopicListItem.tsx              # Compact topic card for list view
│   │   │   └── TopicSearchFilter.tsx          # Search + filter controls
│   │   ├── responses/               # MODIFIED: Existing response components
│   │   │   ├── ResponseList.tsx               # Refactored with virtual scrolling
│   │   │   ├── ResponseItem.tsx               # Unchanged (already good)
│   │   │   └── ResponseComposer.tsx           # Modified for inline expand/collapse
│   │   ├── feedback/                # MODIFIED: Existing feedback components
│   │   │   ├── PreviewFeedbackPanel.tsx       # Refactored for right panel integration
│   │   │   └── FeedbackDisplayPanel.tsx       # Unchanged
│   │   ├── common-ground/           # MODIFIED: Existing analysis components
│   │   │   ├── CommonGroundSummaryPanel.tsx   # Re-enabled for right panel
│   │   │   ├── BridgingSuggestionsSection.tsx # Refactored for right panel
│   │   │   └── PropositionList.tsx            # NEW: List view for right panel
│   │   └── ui/                      # EXISTING: Reusable UI primitives (Button, Card, etc.)
│   ├── hooks/
│   │   ├── usePanelState.ts         # NEW: Panel width/collapse state with sessionStorage
│   │   ├── usePanelResize.ts        # NEW: Drag-to-resize panel width logic
│   │   ├── useTopicNavigation.ts    # NEW: Client-side topic switching with URL sync
│   │   ├── useVirtualList.ts        # NEW: Wrapper around react-window for topics/responses
│   │   └── useUnsavedChanges.ts     # NEW: Detect unsaved responses, show confirmation
│   ├── pages/
│   │   ├── Topics/
│   │   │   ├── DiscussionPage.tsx   # NEW: Main page with DiscussionLayout
│   │   │   └── TopicDetailPage.tsx  # DEPRECATED: Old single-topic page (keep for redirect)
│   │   └── Discussions/
│   │       └── DiscussionDetailPage.tsx # DEPRECATED: Old discussion page (keep for redirect)
│   ├── contexts/
│   │   └── DiscussionLayoutContext.tsx # NEW: Shared state for panel visibility, active topic
│   ├── lib/
│   │   └── virtualScrolling.ts      # NEW: Helper utilities for react-window
│   └── styles/
│       └── discussion-layout.css    # NEW: Panel-specific CSS (Grid layout, responsive)
└── tests/
    ├── unit/
    │   ├── hooks/                   # Unit tests for new hooks
    │   └── components/              # Unit tests for panel components
    ├── integration/
    │   └── discussion-layout/       # Integration tests for panel interactions
    └── e2e/
        └── discussion-page-redesign.spec.ts # NEW: E2E tests for three-panel flow

backend/
└── (unchanged - no backend modifications required)
```

**Structure Decision**: This is a web application with separated frontend (React SPA) and backend (NestJS microservices). The changes are **frontend-only**, refactoring the existing `TopicDetailPage` and `DiscussionDetailPage` into a unified `DiscussionPage` with a three-panel layout. Existing components in `frontend/src/components/` will be refactored to fit the new panel-based structure, with new components added for panel management and layout orchestration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**N/A** - No constitutional violations. All principles satisfied without justification needed.

---

## Post-Design Constitution Re-evaluation

_GATE: Re-check constitution compliance after Phase 1 design completion._

### Design Artifact Review

**Artifacts Generated**:
- ✅ research.md - Technical decisions (CSS Grid, react-window, Context API, responsive patterns)
- ✅ data-model.md - Client-side state models, unchanged backend entities, WebSocket messages
- ✅ contracts/websocket-messages.md - Real-time update message contracts
- ✅ contracts/README.md - API contract documentation (no changes to REST APIs)
- ✅ quickstart.md - Local development setup guide

**Constitution Compliance Verification**:

### I. Code Quality (Post-Design)

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| Linting | ✅ Pass | No new linting rules required; existing Airbnb + TypeScript rules apply to all new components |
| Type Safety | ✅ Pass | All data models documented with TypeScript interfaces; strict mode enforced |
| Code Review | ✅ Pass | Standard PR process applies; no exemptions needed |
| DRY Principle | ✅ Pass | Shared logic extracted into hooks (usePanelState, usePanelResize, useVirtualList) |
| Documentation | ✅ Pass | All new components/hooks will have TSDoc comments (documented in plan) |
| Error Handling | ✅ Pass | WebSocket error handling, API failure states, sessionStorage validation documented |

**Assessment**: No violations. All code quality principles satisfied by design.

### II. Testing Standards (Post-Design)

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| Coverage Threshold | ✅ Pass | Plan specifies 80% coverage for panel state logic and hooks |
| Test-First | ✅ Pass | Quickstart guide documents TDD workflow; critical interactions tested first |
| Test Categories | ✅ Pass | Unit tests (hooks, utilities), Integration tests (API mocking), E2E tests (full panel flow) |
| Test Naming | ✅ Pass | Pattern `[component/hook]_[scenario]_[expected_result]` enforced |
| Mocking | ✅ Pass | MSW for API mocking, mock WebSocket for unit tests documented |
| CI Gate | ✅ Pass | Jenkins pipeline gates apply; no changes needed |

**Assessment**: No violations. All testing principles satisfied by design.

### III. User Experience Consistency (Post-Design)

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| Response Time Feedback | ✅ Pass | Skeleton loaders for panel data fetching, loading states for virtual scrolling |
| Error Messages | ✅ Pass | API failure states show "Unable to load - Retry" actionable messages |
| Component Patterns | ✅ Pass | Reuses existing Card, Button, Badge components; consistent patterns |
| Accessibility | ✅ Pass | ARIA landmarks (nav, main, aside), keyboard navigation, screen reader support documented |
| Graceful Degradation | ✅ Pass | Responsive breakpoints collapse panels gracefully (hamburger → vertical stack) |
| Confirmation for Destructive Actions | ✅ Pass | Unsaved changes confirmation dialog when switching topics (edge case handled) |

**Assessment**: No violations. All UX principles satisfied by design.

### IV. Performance Requirements (Post-Design)

| Principle | Compliance | Evidence |
|-----------|------------|----------|
| Response Time | ✅ Pass | Panel switches <100ms (client-side, faster than 3s requirement) |
| Memory Usage | ✅ Pass | Virtual scrolling limits DOM nodes; bundle size increase <100KB gzipped |
| Startup Time | ⚠️ N/A | Web app has no startup time; initial page load <3s (tracked separately) |
| Rate Limiting | ✅ Pass | Preview feedback API debounced to max 2 requests/second |
| Database Queries | ✅ Pass | No new queries introduced; existing queries already optimized |
| Concurrent Users | ✅ Pass | Frontend changes don't affect backend concurrency handling |

**Assessment**: No violations. All applicable performance principles satisfied.

### Final Gate Result

**Status**: ✅ **PASSED** - Constitution compliance verified post-design

**Summary**:
- Zero constitutional violations identified
- All code quality, testing, UX, and performance principles satisfied
- Design decisions align with existing architectural patterns
- No complexity justifications or exemptions needed

**Approval**: Design ready to proceed to Phase 2 (Task Breakdown via `/speckit.tasks` command)

