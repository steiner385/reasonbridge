# Implementation Plan: UI/UX Enhancement & Modernization

**Branch**: `001-ui-ux-enhancement` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ui-ux-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This plan implements comprehensive UI/UX improvements to elevate ReasonBridge from a functional platform to an industry-leading user experience. The implementation focuses on nine prioritized user stories covering navigation, form validation, dark mode, loading states, error handling, typography, mobile responsiveness, onboarding, and search.

**Primary Requirements**:
- Enhanced navigation with hybrid header + sidebar pattern
- Real-time form validation using React Hook Form + Zod
- Complete dark mode implementation across all components
- CSS-only shimmer animations for skeleton loading screens
- User-friendly toast notifications with accessibility
- Interactive onboarding tour using React Joyride
- Mobile-first responsive design (320px - 2560px viewports)
- WCAG 2.1 AA accessibility compliance

**Technical Approach**: Incremental enhancement of existing React/TypeScript/Tailwind architecture with minimal new dependencies (~50KB gzipped total). Leverage existing component library and patterns while modernizing form handling, navigation, and loading states.

## Technical Context

**Language/Version**: TypeScript 5.7.3, React 18.3.1, Node.js 20 LTS
**Primary Dependencies**:
- React Hook Form 7.71.1 + Zod 4.3.5 (form validation)
- React Joyride 2.9.0 (onboarding tours)
- React Router 6.x (routing with NavLink)
- Tailwind CSS 3.x (styling)
- Vite 6.4.1 (build tool)

**Storage**: N/A (frontend-only feature, uses localStorage for client-side state)
**Testing**:
- Vitest 2.x (unit/integration tests)
- Playwright 1.58.0 (E2E tests)
- React Testing Library (component tests)

**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
**Project Type**: Web application (monorepo with frontend + backend services)
**Performance Goals**:
- Lighthouse Performance score ≥90
- Lighthouse Accessibility score ≥95
- First Contentful Paint (FCP) ≤1.5s on 3G
- JavaScript bundle ≤500KB gzipped
- 60fps animations (GPU-accelerated)

**Constraints**:
- No breaking changes to existing APIs
- Maintain existing routes and URLs
- Bundle size limit: 500KB gzipped (currently ~400KB, +50KB new = 450KB)
- Browser support: Last 2 versions of Chrome, Firefox, Safari, Edge (no IE11)
- WCAG 2.1 AA accessibility compliance
- Mobile-first: All features must work on 320px viewport (iPhone SE minimum)

**Scale/Scope**:
- ~50 React components to update for dark mode
- ~15 forms to migrate to React Hook Form + Zod
- ~30 API endpoints to add loading states
- 5-7 onboarding tour steps
- 10-15 navigation items in hybrid sidebar
- Support for 320px - 2560px viewport range

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Initial Check (Pre-Research)

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Code Quality** | Linting, type safety, documentation | ✅ PASS | TypeScript strict mode, ESLint configured, JSDoc required for public APIs |
| **II. Testing Standards** | 80% coverage, test-first | ✅ PASS | Will add unit tests for new components, E2E tests for user flows |
| **III. UX Consistency** | Response time feedback, error messages | ✅ PASS | Skeleton screens for >1s loads, user-friendly error messages (FR-021) |
| **IV. Performance** | <3s response, <512MB memory | ✅ PASS | Target <1.5s FCP, bundle <500KB, CSS-only animations for low memory impact |

**Assessment**: All constitutional principles are satisfied. No violations or complexity justifications required.

### Post-Design Check

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Code Quality** | DRY, error handling, documentation | ✅ PASS | Reusable schema components, explicit error handling in forms, comprehensive JSDoc |
| **II. Testing Standards** | Test coverage, test-first | ✅ PASS | E2E tests for registration flow (15 currently failing, will be fixed), unit tests for validation schemas |
| **III. UX Consistency** | Feedback, accessibility | ✅ PASS | Toast notifications for all user actions, ARIA attributes on all interactive elements |
| **IV. Performance** | Bundle size, animations | ✅ PASS | +50KB bundle (90% of budget used), GPU-accelerated animations (60fps) |

**Quality Gates**:
- ✅ **Lint**: Zero errors/warnings (enforced by pre-commit hooks)
- ✅ **Type Check**: Zero TypeScript errors (strict mode)
- ✅ **Unit Tests**: All pass, 80% coverage for business logic
- ✅ **Integration Tests**: Form validation, navigation state management
- ✅ **E2E Tests**: Registration flow, onboarding tour, navigation
- ✅ **Code Review**: Required before merge (GitHub branch protection)
- ✅ **Performance**: Lighthouse scores ≥90 (automated in CI)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx           # Main layout container
│   │   │   ├── Header.tsx              # Top header (persistent)
│   │   │   ├── Sidebar.tsx             # Desktop sidebar (collapsible)
│   │   │   ├── MobileDrawer.tsx        # Mobile navigation drawer
│   │   │   └── Navigation.tsx          # Shared nav content
│   │   ├── ui/
│   │   │   ├── Skeleton/               # Enhanced with shimmer animation
│   │   │   ├── Input.tsx               # Compatible with React Hook Form
│   │   │   ├── Button.tsx              # Update for loading states
│   │   │   └── Modal.tsx               # Reuse focus trap pattern
│   │   ├── onboarding/
│   │   │   ├── WelcomeModal.tsx        # First-time user welcome
│   │   │   └── TourProvider.tsx        # Joyride tour wrapper
│   │   └── notifications/
│   │       ├── Toast.tsx               # Enhanced with dark mode
│   │       └── ToastContainer.tsx      # Enhanced with responsive positioning
│   ├── contexts/
│   │   ├── SidebarContext.tsx          # NEW: Sidebar state management
│   │   ├── OnboardingTourContext.tsx   # NEW: Tour state management
│   │   ├── ThemeContext.tsx            # UPDATE: Add dark mode support
│   │   └── NotificationContext.tsx     # ENHANCE: Queue management
│   ├── schemas/
│   │   ├── auth.ts                     # NEW: Login, registration schemas
│   │   ├── common.ts                   # NEW: Reusable validators
│   │   ├── profile.ts                  # NEW: Profile update schemas
│   │   └── discussion.ts               # NEW: Topic, proposition schemas
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── LoginPage.tsx           # UPDATE: Migrate to RHF + Zod
│   │   │   └── RegisterPage.tsx        # UPDATE: Migrate to RHF + Zod
│   │   ├── Topics/
│   │   │   └── TopicDetailPage.tsx     # UPDATE: Add skeleton screens
│   │   └── Settings/
│   │       └── SettingsPage.tsx        # UPDATE: Add restart tour button
│   ├── hooks/
│   │   ├── useSidebar.ts               # NEW: Sidebar state hook
│   │   ├── useOnboardingTour.ts        # NEW: Tour control hook
│   │   └── useMediaQuery.ts            # NEW: Responsive breakpoint detection
│   └── index.css                       # UPDATE: Add shimmer animation utilities
├── tailwind.config.js                  # UPDATE: Add shimmer keyframes, dark mode colors
├── e2e/
│   ├── user-registration-login-flow.spec.ts  # FIX: 15 failing tests
│   ├── navigation.spec.ts              # NEW: Test hybrid navigation
│   └── onboarding-tour.spec.ts         # NEW: Test tour functionality
└── tests/
    ├── unit/
    │   ├── schemas/                    # NEW: Schema validation tests
    │   ├── components/layouts/         # NEW: Navigation component tests
    │   └── hooks/                      # NEW: Hook tests
    └── integration/
        └── forms/                      # NEW: Form validation integration tests

services/
└── (no backend changes required for this feature)
```

**Structure Decision**: Web application (Option 2) with frontend-only changes. This is a UI/UX enhancement feature that does not require backend service modifications. All changes are isolated to the `frontend/` directory, leveraging existing backend APIs.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected.** All implementation decisions align with project constitution principles:

- Code quality maintained through TypeScript strict mode and ESLint
- Testing standards met with comprehensive unit, integration, and E2E tests
- UX consistency improved through standardized loading states and error messages
- Performance requirements satisfied through bundle size management and GPU-accelerated animations

**Architectural Simplicity**:
- Reuses existing patterns (Context API, forwardRef components, Modal focus trap)
- Minimal new dependencies (+3 libraries, ~50KB total)
- Incremental enhancement strategy (no breaking changes)
- Leverages Tailwind CSS for styling (no CSS-in-JS library needed)
