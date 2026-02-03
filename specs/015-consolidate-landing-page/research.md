# Research: Consolidate Landing Page

**Branch**: `015-consolidate-landing-page` | **Date**: 2026-02-02

## Executive Summary

This research documents the findings from exploring the existing codebase to understand the current state of landing/home page implementations and identify the path forward for consolidation.

## Current State Analysis

### Three Conflicting Implementations Found

1. **App.tsx Global Wrapper** (`frontend/src/App.tsx`)
   - Provides global header/footer for all pages
   - Header contains: Logo text "ReasonBridge", navigation links
   - Footer contains: Copyright, basic links
   - **Issue**: Conflicts with landing page's own header/footer

2. **HomePage.tsx Placeholder** (`frontend/src/pages/HomePage.tsx`)
   - Route: `/`
   - Minimal content: Welcome text, two buttons (Login, Sign Up)
   - **Issue**: Lacks features, no value proposition, no interactive demo
   - **Decision**: DELETE this file

3. **LandingPage.tsx Full-Featured** (`frontend/src/pages/LandingPage.tsx`)
   - Route: `/demo/discussion` (hidden URL)
   - Full content: Hero section, value propositions, InteractiveDemo, CTAs
   - Uses: `InteractiveDemo.tsx`, `DemoMetrics.tsx` components
   - **Issue**: Hidden at demo URL, uses wrong colors (blue/indigo instead of brand)
   - **Decision**: ENHANCE and move to root URL

### Route Configuration (`frontend/src/routes/index.tsx`)

Current routing structure allows for conditional rendering based on authentication state. The route configuration can be modified to:
- Render unified landing page at `/` for unauthenticated users
- Redirect authenticated users to `/topics?welcome=true`

### Brand Design Document (`docs/plans/2026-01-25-reasonbridge-brand-design.md`)

Brand guidelines specify:
- **Colors**: Teal (#2A9D8F), Soft Blue (#6B9AC4), Light Sky (#A8DADC)
- **Font**: Nunito (currently using Inter)
- **Logo**: Two overlapping circles representing common ground
- **Logo Assets**: Located at `frontend/public/assets/logos/`

### Tailwind Configuration (`frontend/tailwind.config.js`)

Current colors:
- `primary`: indigo-based palette
- `secondary`: green-based palette

Requires migration to:
- `primary`: Teal (#2A9D8F) with full shade scale
- `secondary`: Soft Blue (#6B9AC4) with full shade scale
- `accent`: Light Sky (#A8DADC)

## Technical Decisions

### Decision 1: Layout Opt-Out Strategy

**Question**: How should the landing page avoid the App.tsx global wrapper while other pages retain it?

**Resolution**: Create `LandingLayout.tsx` component that provides its own header/footer. Routes will specify which layout to use, allowing landing page to opt out of the global wrapper.

**Implementation**:
- Create `frontend/src/components/layout/LandingLayout.tsx`
- Modify route configuration to use layout-aware rendering
- App.tsx wrapper only applies to authenticated/internal pages

### Decision 2: Authenticated User Experience

**Question**: What should authenticated users see when visiting the root URL?

**Resolution**: Redirect to `/topics` with `?welcome=true` query parameter. TopicsPage will detect this param and display a dismissible WelcomeBanner component.

**Implementation**:
- Create `useAuthRedirect` hook to handle auth-based routing
- Create `WelcomeBanner` component with localStorage persistence
- Modify TopicsPage to detect and display welcome banner

## Dependencies Identified

### Existing Components to Retain
- `InteractiveDemo.tsx` - Demo discussion viewer
- `DemoMetrics.tsx` - Social proof metrics display
- `DemoDiscussionView.tsx` - Individual demo discussion renderer

### New Components Required
- `LandingLayout.tsx` - Layout wrapper for landing page
- `WelcomeBanner.tsx` - Dismissible banner for authenticated users
- `useAuthRedirect.ts` - Hook for auth-based routing

### Files to Modify
- `App.tsx` - Conditional layout wrapper
- `routes/index.tsx` - Route configuration
- `tailwind.config.js` - Brand colors
- `index.html` - Nunito font

### Files to Delete
- `HomePage.tsx` - Redundant placeholder

## Risk Assessment

### Low Risk
- Brand color migration: Global find/replace of color classes
- Font migration: Google Fonts addition is straightforward
- Route changes: React Router 7 supports layout-based routing

### Medium Risk
- App.tsx wrapper modification: Must ensure other pages aren't affected
- Visual regression: Brand color changes affect entire application

### Mitigation
- Create comprehensive E2E tests for landing page
- Test authenticated vs unauthenticated flows
- Visual comparison before/after brand color migration

## Conclusion

The consolidation is technically straightforward. The existing `LandingPage.tsx` provides a solid foundation. The main work involves:
1. Moving landing page to root URL
2. Implementing layout opt-out pattern
3. Migrating to brand colors and fonts
4. Adding auth-based redirect with welcome banner

No blocking issues or clarifications remain. Ready for Phase 1 design artifacts.
