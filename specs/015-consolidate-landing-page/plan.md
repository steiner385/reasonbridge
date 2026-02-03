# Implementation Plan: Consolidate Landing Page

**Branch**: `015-consolidate-landing-page` | **Date**: 2026-02-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-consolidate-landing-page/spec.md`

## Summary

Consolidate three conflicting home/landing page implementations (App.tsx wrapper, HomePage.tsx placeholder, LandingPage.tsx at /demo/discussion) into a single unified landing page at the root URL (`/`). The unified page will include all existing features (hero, value props, interactive demo), apply brand colors (Teal/Soft Blue/Light Sky), use Nunito font, and provide appropriate routing for authenticated vs unauthenticated users.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18.3
**Primary Dependencies**: React 18, React Router 7, Tailwind CSS 3.x, Vite
**Storage**: N/A (no new data persistence - uses existing demo service)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (monorepo with frontend/ directory)
**Performance Goals**: 3s page load, 100ms interaction response, Lighthouse 80+ performance
**Constraints**: WCAG AA accessibility, responsive 320px-2560px, dark mode support
**Scale/Scope**: Single page refactor affecting ~10 files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Requirement | Status | Notes |
| --------- | ----------- | ------ | ----- |
| I. Code Quality | Zero lint warnings, TypeScript strict | ✅ PASS | Existing tooling enforces this |
| I. Code Quality | JSDoc for public APIs | ✅ PASS | Component props will be documented |
| II. Testing Standards | 80% coverage for business logic | ✅ PASS | New components will have unit tests |
| II. Testing Standards | Test-first for bug fixes | N/A | Not a bug fix |
| III. UX Consistency | Loading indicators for >1s operations | ✅ PASS | Skeleton loaders for demo content |
| III. UX Consistency | Actionable error messages | ✅ PASS | Fallback content for failed demo load |
| IV. Performance | Response within 3 seconds | ✅ PASS | SC-001 requires this |
| IV. Performance | Memory <512MB | ✅ PASS | Landing page is lightweight |

**Gate Result**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/015-consolidate-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - no new entities)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx        # MODIFY: Enhanced unified landing page
│   │   ├── HomePage.tsx           # DELETE: Placeholder to be removed
│   │   └── Topics/
│   │       └── index.tsx          # MODIFY: Add welcome banner support
│   ├── components/
│   │   ├── demo/
│   │   │   ├── InteractiveDemo.tsx  # RETAIN: Existing component
│   │   │   └── DemoMetrics.tsx      # RETAIN: Existing component
│   │   ├── common/
│   │   │   └── WelcomeBanner.tsx    # CREATE: New dismissible banner
│   │   └── layout/
│   │       └── LandingLayout.tsx    # CREATE: Wrapper that opts out of App.tsx
│   ├── routes/
│   │   └── index.tsx              # MODIFY: Route configuration
│   ├── hooks/
│   │   └── useAuthRedirect.ts     # CREATE: Handle auth-based routing
│   └── App.tsx                    # MODIFY: Conditional layout wrapper
├── public/
│   └── assets/
│       └── logos/                 # EXISTS: Logo assets available
├── index.html                     # MODIFY: Add Nunito font
└── tailwind.config.js             # MODIFY: Update brand colors

frontend/e2e/
└── landing-page.spec.ts           # CREATE: E2E tests for landing page
```

**Structure Decision**: Web application structure. Changes are confined to frontend/ directory. No backend modifications required as the landing page uses existing demo service APIs.

## Complexity Tracking

> No violations requiring justification. All changes follow existing patterns.

## Key Implementation Decisions

### 1. Layout Opt-Out Strategy

The landing page will use a dedicated `LandingLayout.tsx` component that provides its own header/footer, while other pages continue to use the existing App.tsx wrapper. This is achieved by:
- Creating route-level layout detection
- Landing page routes render without the global wrapper
- All other routes maintain current behavior

### 2. Authenticated User Redirect

When an authenticated user visits `/`:
1. `useAuthRedirect` hook checks auth state
2. If authenticated, redirect to `/topics?welcome=true`
3. TopicsPage detects query param and shows WelcomeBanner
4. Banner is dismissible and state persists in localStorage

### 3. Brand Color Migration

Current Tailwind colors (indigo primary, green secondary) will be replaced with brand colors:
- Primary: Teal (#2A9D8F) - currently indigo
- Secondary: Soft Blue (#6B9AC4) - currently green
- Accent: Light Sky (#A8DADC) - new addition

This is a breaking visual change that affects all components using `primary-*` and `secondary-*` classes.

### 4. Font Migration

Nunito font will be added via Google Fonts in index.html and configured as the default sans-serif in Tailwind config.
