# Tasks: UI/UX Enhancement & Modernization

**Input**: Design documents from `/specs/001-ui-ux-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: ✅ **INCLUDED** - Comprehensive unit and E2E test coverage per user request

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/e2e/`, `frontend/tests/`
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure project for UI enhancements

- [ ] T001 Install React Hook Form dependencies in frontend/package.json (pnpm add react-hook-form@^7.71.1 @hookform/resolvers@^5.2.2)
- [ ] T002 Install Zod validation library in frontend/package.json (pnpm add zod@^4.3.5)
- [ ] T003 Install React Joyride for onboarding tours in frontend/package.json (pnpm add react-joyride@^2.9.0)
- [ ] T004 [P] Create directory structure: frontend/src/schemas/, frontend/src/components/layouts/, frontend/src/components/onboarding/, frontend/src/hooks/, frontend/tests/unit/, frontend/tests/integration/
- [ ] T005 [P] Update frontend/tailwind.config.js to add shimmer animation keyframes and dark mode colors
- [ ] T006 [P] Add shimmer utility CSS classes to frontend/src/index.css for skeleton animations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create common validation schemas in frontend/src/schemas/common.ts (email, password, URL validators)
- [ ] T008 [P] Create TypeScript type definitions in frontend/src/types/navigation.ts for NavigationState and Breadcrumb interfaces
- [ ] T009 [P] Create TypeScript type definitions in frontend/src/types/theme.ts for ThemePreference interface
- [ ] T010 [P] Create TypeScript type definitions in frontend/src/types/loading.ts for LoadingState interface
- [ ] T011 [P] Create TypeScript type definitions in frontend/src/types/onboarding.ts for OnboardingProgressState interface
- [ ] T012 Create useMediaQuery hook in frontend/src/hooks/useMediaQuery.ts for responsive breakpoint detection

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Enhanced Navigation & Information Architecture (Priority: P1) 🎯 MVP

**Goal**: Implement hybrid navigation with persistent header + collapsible sidebar (desktop) and hamburger drawer (mobile)

**Independent Test**: Navigate through Topics → Profile → Notifications → Settings and measure time-to-destination under 5 seconds

### Tests for User Story 1

> **NOTE: Write tests FIRST, ensure they FAIL before implementation (TDD)**

- [ ] T013 [P] [US1] Unit test for SidebarContext in frontend/tests/unit/contexts/SidebarContext.spec.tsx (test collapsed/expanded state, mobile drawer toggle, localStorage persistence)
- [ ] T014 [P] [US1] Unit test for useSidebar hook in frontend/tests/unit/hooks/useSidebar.spec.tsx (test hook returns correct context values)
- [ ] T015 [P] [US1] Unit test for Navigation component in frontend/tests/unit/components/layouts/Navigation.spec.tsx (test nav links render, active state highlighting, badge counts)
- [ ] T016 [P] [US1] Unit test for Header component in frontend/tests/unit/components/layouts/Header.spec.tsx (test logo, search, notifications icon, profile menu)
- [ ] T017 [P] [US1] Unit test for Sidebar component in frontend/tests/unit/components/layouts/Sidebar.spec.tsx (test collapse/expand toggle, nav item rendering, keyboard navigation)
- [ ] T018 [P] [US1] Unit test for MobileDrawer component in frontend/tests/unit/components/layouts/MobileDrawer.spec.tsx (test open/close animations, backdrop click, Escape key, focus trap)
- [ ] T019 [P] [US1] Integration test for navigation state persistence in frontend/tests/integration/navigation-persistence.spec.tsx (test sidebar state survives page refresh)
- [ ] T020 [P] [US1] E2E test for desktop navigation in frontend/e2e/desktop-navigation.spec.ts (test header visibility, sidebar collapse/expand, navigation links work, breadcrumbs)
- [ ] T021 [P] [US1] E2E test for mobile navigation in frontend/e2e/mobile-navigation.spec.ts (test hamburger menu opens drawer, navigation works, drawer closes on link click)
- [ ] T022 [P] [US1] E2E test for navigation accessibility in frontend/e2e/navigation-accessibility.spec.ts (test keyboard navigation Tab/Enter/Escape, ARIA attributes, focus management)

### Implementation for User Story 1

- [ ] T023 [P] [US1] Create SidebarContext in frontend/src/contexts/SidebarContext.tsx for sidebar state management (collapsed/expanded, mobile drawer open/closed)
- [ ] T024 [P] [US1] Create useSidebar hook in frontend/src/hooks/useSidebar.ts to access SidebarContext
- [ ] T025 [P] [US1] Create Navigation component in frontend/src/components/layouts/Navigation.tsx with shared nav content (Topics, Settings, notifications links)
- [ ] T026 [US1] Create Header component in frontend/src/components/layouts/Header.tsx (persistent top header with logo, search, notifications icon with badge, profile)
- [ ] T027 [US1] Create Sidebar component in frontend/src/components/layouts/Sidebar.tsx (desktop collapsible sidebar with navigation items)
- [ ] T028 [US1] Create MobileDrawer component in frontend/src/components/layouts/MobileDrawer.tsx (slide-out drawer with Navigation content, backdrop, Escape key handler)
- [ ] T029 [US1] Update AppLayout component in frontend/src/components/layouts/AppLayout.tsx to integrate Header, Sidebar, and MobileDrawer with responsive logic
- [ ] T030 [US1] Wrap App with SidebarProvider in frontend/src/main.tsx
- [ ] T031 [US1] Add ARIA attributes to navigation components (aria-label, aria-expanded, aria-current, role="navigation", role="dialog" for drawer)
- [ ] T032 [US1] Implement localStorage persistence for sidebar collapsed state in SidebarContext
- [ ] T033 [US1] Add focus trap and body scroll lock when mobile drawer is open in MobileDrawer.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional with responsive navigation testable independently. All tests should PASS.

---

## Phase 4: User Story 2 - Comprehensive Dark Mode Implementation (Priority: P1)

**Goal**: Complete dark mode support across all components with user toggle and system preference detection

**Independent Test**: Toggle theme preference and verify all components render correctly in both modes across all pages

### Tests for User Story 2

- [ ] T034 [P] [US2] Unit test for ThemeContext in frontend/tests/unit/contexts/ThemeContext.spec.tsx (test light/dark/auto modes, system preference detection, localStorage persistence)
- [ ] T035 [P] [US2] Unit test for Button dark mode in frontend/tests/unit/components/ui/Button.spec.tsx (test dark mode classes applied correctly for all variants)
- [ ] T036 [P] [US2] Unit test for Input dark mode in frontend/tests/unit/components/ui/Input.spec.tsx (test dark mode styles, error states, focus rings)
- [ ] T037 [P] [US2] Unit test for Card dark mode in frontend/tests/unit/components/ui/Card.spec.tsx (test dark mode backgrounds, borders, shadows)
- [ ] T038 [P] [US2] Unit test for Modal dark mode in frontend/tests/unit/components/ui/Modal.spec.tsx (test dark mode overlay, content, close button)
- [ ] T039 [P] [US2] E2E test for dark mode toggle in frontend/e2e/dark-mode-toggle.spec.ts (test toggle switch in Settings, verify all pages update, verify persistence on refresh)
- [ ] T040 [P] [US2] E2E test for dark mode system preference in frontend/e2e/dark-mode-system-preference.spec.ts (test auto mode respects system preference, manual override works)
- [ ] T041 [P] [US2] E2E test for dark mode contrast ratios in frontend/e2e/dark-mode-accessibility.spec.ts (test WCAG AA compliance using axe-core, verify no flash on load)

### Implementation for User Story 2

- [ ] T042 [P] [US2] Update ThemeContext in frontend/src/contexts/ThemeContext.tsx to add mode state ('light' | 'dark' | 'auto') and system preference detection
- [ ] T043 [P] [US2] Add localStorage persistence for theme preference in ThemeContext (key: 'theme-preference')
- [ ] T044 [P] [US2] Update all Button components with dark mode variants in frontend/src/components/ui/Button.tsx (dark:bg-*, dark:text-*, dark:hover-*)
- [ ] T045 [P] [US2] Update all Input components with dark mode variants in frontend/src/components/ui/Input.tsx
- [ ] T046 [P] [US2] Update all Card components with dark mode variants in frontend/src/components/ui/Card.tsx
- [ ] T047 [P] [US2] Update all Modal components with dark mode variants in frontend/src/components/ui/Modal.tsx
- [ ] T048 [US2] Update Header component with dark mode styling in frontend/src/components/layouts/Header.tsx
- [ ] T049 [US2] Update Sidebar component with dark mode styling in frontend/src/components/layouts/Sidebar.tsx
- [ ] T050 [US2] Update all page components in frontend/src/pages/ with dark mode background and text colors (update ~15 page files)
- [ ] T051 [US2] Add dark mode toggle switch to SettingsPage in frontend/src/pages/Settings/SettingsPage.tsx
- [ ] T052 [US2] Add preload script in frontend/index.html to prevent dark mode flash (detect localStorage before React hydrates)
- [ ] T053 [US2] Add 200ms CSS transition for smooth theme switching (transition: background-color 200ms, color 200ms)
- [ ] T054 [US2] Verify WCAG AA contrast ratios (4.5:1 for text) in dark mode using axe DevTools

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently with full navigation and dark mode. All tests should PASS.

---

## Phase 5: User Story 3 - Improved Form Validation & User Feedback (Priority: P1)

**Goal**: Implement real-time form validation using React Hook Form + Zod with inline error messages and success toast notifications

**Independent Test**: Submit forms with invalid inputs and verify inline error messages appear immediately without page reload

### Tests for User Story 3

- [ ] T055 [P] [US3] Unit test for auth validation schemas in frontend/tests/unit/schemas/auth.spec.ts (test email, password, displayName validators, test edge cases)
- [ ] T056 [P] [US3] Unit test for profile validation schemas in frontend/tests/unit/schemas/profile.spec.ts (test bio length, URL format, phone number)
- [ ] T057 [P] [US3] Unit test for discussion validation schemas in frontend/tests/unit/schemas/discussion.spec.ts (test topic title, description, tag limits)
- [ ] T058 [P] [US3] Unit test for Toast component in frontend/tests/unit/components/ui/Toast.spec.tsx (test success/error/warning/info variants, auto-dismiss, manual close)
- [ ] T059 [P] [US3] Unit test for ToastContainer in frontend/tests/unit/components/ui/ToastContainer.spec.tsx (test queue management, max toasts, positioning)
- [ ] T060 [P] [US3] Integration test for LoginPage form validation in frontend/tests/integration/login-form-validation.spec.tsx (test email validation, password validation, submit disabled when invalid)
- [ ] T061 [P] [US3] Integration test for RegisterPage form validation in frontend/tests/integration/register-form-validation.spec.tsx (test all field validations, password strength indicator, duplicate email error)
- [ ] T062 [P] [US3] E2E test for registration flow in frontend/e2e/user-registration-flow.spec.ts (FIX existing 15 failing tests: test valid registration, invalid inputs show errors, duplicate email error, success redirect)
- [ ] T063 [P] [US3] E2E test for login flow in frontend/e2e/user-login-flow.spec.ts (test valid login, invalid credentials error, forgot password link, success redirect)
- [ ] T064 [P] [US3] E2E test for profile edit validation in frontend/e2e/profile-edit-validation.spec.ts (test real-time validation, save success toast, error handling)

### Implementation for User Story 3

- [ ] T065 [P] [US3] Create auth validation schemas in frontend/src/schemas/auth.ts (email, password, displayName with Zod)
- [ ] T066 [P] [US3] Create profile validation schemas in frontend/src/schemas/profile.ts (bio, location, website, phoneNumber with Zod)
- [ ] T067 [P] [US3] Create discussion validation schemas in frontend/src/schemas/discussion.ts (topic title, description, tags, proposition with Zod)
- [ ] T068 [P] [US3] Update Input component in frontend/src/components/ui/Input.tsx to display validation errors from React Hook Form
- [ ] T069 [P] [US3] Create Toast component in frontend/src/components/ui/Toast.tsx for success/error/warning/info notifications
- [ ] T070 [P] [US3] Create ToastContainer component in frontend/src/components/ui/ToastContainer.tsx to manage toast queue and positioning
- [ ] T071 [US3] Migrate RegisterPage to React Hook Form in frontend/src/pages/Auth/RegisterPage.tsx (integrate zodResolver, add inline errors, add success toast)
- [ ] T072 [US3] Migrate LoginPage to React Hook Form in frontend/src/pages/Auth/LoginPage.tsx (integrate zodResolver, add inline errors, add error toast)
- [ ] T073 [US3] Update ProfileEditPage to use React Hook Form in frontend/src/pages/Profile/ProfileEditPage.tsx (integrate zodResolver, add real-time validation, success toast)
- [ ] T074 [US3] Update TopicCreationPage to use React Hook Form in frontend/src/pages/Topics/TopicCreationPage.tsx (integrate zodResolver, add validation, success redirect)
- [ ] T075 [US3] Update ResponseForm to use React Hook Form in frontend/src/components/responses/ResponseForm.tsx (integrate zodResolver, add validation, success feedback)
- [ ] T076 [US3] Add ToastProvider to main.tsx context hierarchy for app-wide toast access

**Checkpoint**: At this point, all forms should have real-time validation with user-friendly error messages. All tests should PASS.

---

## Phase 6: User Story 4 - Responsive Mobile-First Design (Priority: P2)

**Goal**: Optimize all layouts for mobile devices with touch-friendly interactions and responsive breakpoints

**Independent Test**: Access all major features on viewports from 320px to 768px and verify usability with touch interactions

### Tests for User Story 4

- [ ] T077 [P] [US4] Unit test for useMediaQuery hook in frontend/tests/unit/hooks/useMediaQuery.spec.tsx (test breakpoint detection, window resize handling)
- [ ] T078 [P] [US4] Unit test for Button touch targets in frontend/tests/unit/components/ui/Button.spec.tsx (verify min-height 44px for all sizes per WCAG 2.1)
- [ ] T079 [P] [US4] Unit test for MobileActionBar in frontend/tests/unit/components/layouts/MobileActionBar.spec.tsx (test safe area padding, sticky positioning)
- [ ] T080 [P] [US4] E2E test for mobile topic browsing in frontend/e2e/mobile-topic-browsing.spec.ts (test 320px viewport, touch-friendly cards, vertical stacking, pagination)
- [ ] T081 [P] [US4] E2E test for mobile forms in frontend/e2e/mobile-forms.spec.ts (test keyboard visibility, viewport adjustment, submit button accessibility)
- [ ] T082 [P] [US4] E2E test for tablet layout in frontend/e2e/tablet-layout.spec.ts (test 768px-1024px viewport, 2-column layouts, hybrid navigation)
- [ ] T083 [P] [US4] E2E test for responsive images in frontend/e2e/responsive-images.spec.ts (test image loading at different viewports, lazy loading)

### Implementation for User Story 4

- [ ] T084 [P] [US4] Update Button component in frontend/src/components/ui/Button.tsx with touch-friendly sizes (min-height 44px per WCAG 2.1)
- [ ] T085 [P] [US4] Create MobileActionBar component in frontend/src/components/layouts/MobileActionBar.tsx (fixed bottom bar with safe area padding)
- [ ] T086 [P] [US4] Update TopicsPage in frontend/src/pages/Topics/TopicsPage.tsx with responsive grid (1 column mobile, 2 tablet, 3 desktop)
- [ ] T087 [P] [US4] Update TopicDetailPage in frontend/src/pages/Topics/TopicDetailPage.tsx with responsive layout (stack on mobile, 2-column on tablet/desktop)
- [ ] T088 [P] [US4] Update ProfilePage in frontend/src/pages/Profile/ProfilePage.tsx with responsive layout
- [ ] T089 [US4] Add fluid typography utilities to frontend/tailwind.config.js (clamp() for responsive text scaling)
- [ ] T090 [US4] Update form layouts in frontend/src/components/ for mobile optimization (full-width inputs, stacked buttons)
- [ ] T091 [US4] Add viewport meta tag to frontend/index.html for proper mobile rendering (viewport-fit=cover, interactive-widget=resizes-content)
- [ ] T092 [US4] Test forms on 320px viewport in frontend/src/pages/Auth/ and verify no horizontal scroll, submit button visible with keyboard

**Checkpoint**: All pages should be fully functional and touch-friendly on 320px-2560px viewports. All tests should PASS.

---

## Phase 7: User Story 5 - Enhanced Loading States & Skeleton Screens (Priority: P2)

**Goal**: Implement CSS-only shimmer skeleton screens that match final content layout to reduce perceived latency

**Independent Test**: Simulate slow network (Chrome DevTools 3G throttling) and verify skeleton UI appears during all async operations

### Tests for User Story 5

- [ ] T093 [P] [US5] Unit test for Skeleton component in frontend/tests/unit/components/ui/Skeleton/Skeleton.spec.tsx (test width/height props, animation variants, dark mode)
- [ ] T094 [P] [US5] Unit test for TopicCardSkeleton in frontend/tests/unit/components/ui/skeletons/TopicCardSkeleton.spec.tsx (test layout matches real TopicCard)
- [ ] T095 [P] [US5] Unit test for LoadingSpinner in frontend/tests/unit/components/ui/LoadingSpinner.spec.tsx (test size variants, centered positioning, label)
- [ ] T096 [P] [US5] Unit test for ProgressBar in frontend/tests/unit/components/ui/ProgressBar.spec.tsx (test determinate/indeterminate modes, percentage updates)
- [ ] T097 [P] [US5] E2E test for topic list loading in frontend/e2e/topic-list-loading.spec.ts (test skeleton appears, shimmer animation, skeleton disappears when data loads)
- [ ] T098 [P] [US5] E2E test for AI feedback loading in frontend/e2e/ai-feedback-loading.spec.ts (test progress indicator during analysis, skeleton placeholders, "Still working..." message after 3s)
- [ ] T099 [P] [US5] E2E test for form submission loading in frontend/e2e/form-submission-loading.spec.ts (test button shows spinner, button disables to prevent double-submit)

### Implementation for User Story 5

- [ ] T100 [P] [US5] Update Skeleton component in frontend/src/components/ui/Skeleton/Skeleton.tsx with shimmer animation (CSS-only, GPU-accelerated)
- [ ] T101 [P] [US5] Update constants.ts in frontend/src/components/ui/Skeleton/constants.ts to add shimmer animation class with CSS gradient
- [ ] T102 [P] [US5] Create TopicCardSkeleton in frontend/src/components/ui/skeletons/TopicCardSkeleton.tsx matching TopicCard layout
- [ ] T103 [P] [US5] Create ProfileCardSkeleton in frontend/src/components/ui/skeletons/ProfileCardSkeleton.tsx matching ProfileCard layout
- [ ] T104 [P] [US5] Create ResponseSkeleton in frontend/src/components/ui/skeletons/ResponseSkeleton.tsx matching response thread layout
- [ ] T105 [P] [US5] Create LoadingSpinner component in frontend/src/components/ui/LoadingSpinner.tsx (inline spinner for buttons, pages)
- [ ] T106 [P] [US5] Create ProgressBar component in frontend/src/components/ui/ProgressBar.tsx (determinate and indeterminate variants)
- [ ] T107 [US5] Update TopicsPage to show TopicCardSkeleton during data fetch in frontend/src/pages/Topics/TopicsPage.tsx
- [ ] T108 [US5] Update TopicDetailPage to show skeletons during page load in frontend/src/pages/Topics/TopicDetailPage.tsx
- [ ] T109 [US5] Add 100ms delay before showing skeletons using useDelayedLoading hook to prevent flash on fast connections
- [ ] T110 [US5] Update Button component to show inline LoadingSpinner when loading prop is true
- [ ] T111 [US5] Add "Still working..." message for operations taking >3 seconds in AI feedback panel

**Checkpoint**: All async operations should show appropriate loading UI. Skeleton screens should match final layout. All tests should PASS.

---

## Phase 8: User Story 6 - Consistent Error Handling & Recovery (Priority: P2)

**Goal**: Implement user-friendly error messages with recovery suggestions for all failure scenarios

**Independent Test**: Simulate various errors (offline, 401, 403, 404, 500) and verify friendly error displays with actionable recovery paths

### Tests for User Story 6

- [ ] T112 [P] [US6] Unit test for ErrorBoundary in frontend/tests/unit/components/error/ErrorBoundary.spec.tsx (test error capture, fallback UI, reset functionality)
- [ ] T113 [P] [US6] Unit test for ErrorState component in frontend/tests/unit/components/ui/ErrorState.spec.tsx (test error message display, retry button, different error types)
- [ ] T114 [P] [US6] Unit test for EmptyState component in frontend/tests/unit/components/ui/EmptyState.spec.tsx (test empty list message, CTA button, illustration)
- [ ] T115 [P] [US6] E2E test for offline error handling in frontend/e2e/offline-error-handling.spec.ts (test offline detection, friendly message, retry button)
- [ ] T116 [P] [US6] E2E test for 403 permission error in frontend/e2e/permission-error.spec.ts (test permission denied message, link to help article)
- [ ] T117 [P] [US6] E2E test for 404 not found in frontend/e2e/not-found-page.spec.ts (test custom 404 page, search bar, popular topics links)
- [ ] T118 [P] [US6] E2E test for 500 server error in frontend/e2e/server-error.spec.ts (test friendly error message, auto-retry after 3s, exponential backoff)

### Implementation for User Story 6

- [ ] T119 [P] [US6] Create ErrorBoundary component in frontend/src/components/error/ErrorBoundary.tsx (React error boundary to catch JavaScript errors)
- [ ] T120 [P] [US6] Create ErrorState component in frontend/src/components/ui/ErrorState.tsx (display user-friendly error with retry button)
- [ ] T121 [P] [US6] Create EmptyState component in frontend/src/components/ui/EmptyState.tsx (display "no data" state with CTA)
- [ ] T122 [P] [US6] Update NotFoundPage in frontend/src/pages/NotFoundPage.tsx (custom 404 with search and popular topics)
- [ ] T123 [US6] Wrap App with ErrorBoundary in frontend/src/main.tsx to catch all React errors
- [ ] T124 [US6] Add offline detection using navigator.onLine in API client at frontend/src/lib/api.ts
- [ ] T125 [US6] Update error handling in TopicsPage to show ErrorState for API failures
- [ ] T126 [US6] Update error handling in TopicDetailPage to show ErrorState for API failures
- [ ] T127 [US6] Add exponential backoff retry logic (3 attempts max) in API client
- [ ] T128 [US6] Add user-friendly error messages for common HTTP status codes (401: "Session expired", 403: "Permission denied", 500: "Something went wrong")

**Checkpoint**: All error scenarios should display user-friendly messages with recovery options. All tests should PASS.

---

## Phase 9: User Story 7 - Improved Typography & Readability (Priority: P2)

**Goal**: Enhance text readability with proper font sizing, line heights, and character limits for long-form content

**Independent Test**: View long-form discussion content and measure reading comfort via contrast ratios (4.5:1 minimum), line height (1.6+), and line length (65-75 characters)

### Tests for User Story 7

- [ ] T129 [P] [US7] Unit test for Typography component in frontend/tests/unit/components/ui/Typography.spec.tsx (test prose styles, heading hierarchy, link formatting)
- [ ] T130 [P] [US7] E2E test for text readability in frontend/e2e/text-readability.spec.ts (test body text is 16px, line height 1.6, max-width 65-75ch)
- [ ] T131 [P] [US7] E2E test for heading hierarchy in frontend/e2e/heading-hierarchy.spec.ts (test h1 24px bold, h2 20px, h3 18px, proper nesting)
- [ ] T132 [P] [US7] E2E test for zoom accessibility in frontend/e2e/zoom-accessibility.spec.ts (test layout remains usable at 200% zoom, no horizontal scroll)

### Implementation for User Story 7

- [ ] T133 [P] [US7] Add reading width utilities to frontend/src/index.css (prose-reading-width: 65ch max-width)
- [ ] T134 [P] [US7] Create Typography component in frontend/src/components/ui/Typography.tsx (wrapper for rich text content with proper prose styles)
- [ ] T135 [P] [US7] Update base typography styles in frontend/src/index.css (body: 16px, line-height: 1.6, headings: scale with proper weights)
- [ ] T136 [P] [US7] Update TopicDetailPage to use reading width and improved line heights in frontend/src/pages/Topics/TopicDetailPage.tsx
- [ ] T137 [P] [US7] Update HomePage to use improved typography in frontend/src/pages/HomePage.tsx
- [ ] T138 [P] [US7] Update AboutPage to use Typography component in frontend/src/pages/AboutPage.tsx

**Checkpoint**: All long-form text content should be comfortable to read with proper hierarchy and spacing. All tests should PASS.

---

## Phase 10: User Story 8 - Streamlined Onboarding Flow (Priority: P3)

**Goal**: Implement interactive onboarding tour using React Joyride to guide new users through key platform features

**Independent Test**: Create new account and verify tooltip tour appears, highlighting Topics, Notifications, Profile, and AI Feedback panel

### Tests for User Story 8

- [ ] T139 [P] [US8] Unit test for useOnboardingTour hook in frontend/tests/unit/hooks/useOnboardingTour.spec.tsx (test tour state management, step progression, completion tracking)
- [ ] T140 [P] [US8] Unit test for tour steps configuration in frontend/tests/unit/config/tourSteps.spec.ts (test all tour steps have required properties, valid targets)
- [ ] T141 [P] [US8] E2E test for onboarding tour in frontend/e2e/onboarding-tour.spec.ts (test tour starts on first login, tooltips appear at correct elements, Next/Skip/Finish buttons work)
- [ ] T142 [P] [US8] E2E test for tour restart in frontend/e2e/tour-restart.spec.ts (test restart tour button in Settings, tour can be restarted, completion state resets)

### Implementation for User Story 8

- [ ] T143 [P] [US8] Create useOnboardingTour hook in frontend/src/hooks/useOnboardingTour.ts (manage tour state, step index, completion tracking with localStorage)
- [ ] T144 [P] [US8] Create tour steps configuration in frontend/src/config/tourSteps.ts (define steps for Topics, Notifications, Profile, AI Feedback)
- [ ] T145 [P] [US8] Create tour styles configuration in frontend/src/styles/tourStyles.ts (custom Joyride tooltip styling with dark mode support)
- [ ] T146 [US8] Add Joyride tour to HomePage in frontend/src/pages/HomePage.tsx (welcome modal, tour trigger on first login)
- [ ] T147 [US8] Add data-tour attributes to navigation elements in frontend/src/components/layouts/Navigation.tsx for tour targeting
- [ ] T148 [US8] Add restart tour button to SettingsPage in frontend/src/pages/Settings/SettingsPage.tsx
- [ ] T149 [US8] Add tour completion tracking to localStorage to prevent re-showing on subsequent logins

**Checkpoint**: New users should see an interactive tour on first login. Tour should be skippable and restartable. All tests should PASS.

---

## Phase 11: User Story 9 - Enhanced Search & Filtering (Priority: P3)

**Goal**: Implement debounced real-time search with advanced filters (status, date range, participant count) and filter persistence

**Independent Test**: Search for topics with various filters, verify debounced updates (300ms delay), filter pills display, results are accurate

### Tests for User Story 9

- [ ] T150 [P] [US9] Unit test for useDebounce hook in frontend/tests/unit/hooks/useDebounce.spec.tsx (test debounce delay, value updates, cleanup on unmount)
- [ ] T151 [P] [US9] Unit test for SearchInput component in frontend/tests/unit/components/ui/SearchInput.spec.tsx (test input value, clear button, loading state, keyboard shortcuts)
- [ ] T152 [P] [US9] Unit test for FilterPanel component in frontend/tests/unit/components/ui/FilterPanel.spec.tsx (test filter toggles, apply/reset buttons, responsive collapse)
- [ ] T153 [P] [US9] Unit test for TagFilter component in frontend/tests/unit/components/ui/TagFilter.spec.tsx (test multi-select, show more/less, tag counts)
- [ ] T154 [P] [US9] Integration test for search with filters in frontend/tests/integration/topic-search-filters.spec.tsx (test search + filter combination, filter persistence)
- [ ] T155 [P] [US9] E2E test for topic search in frontend/e2e/topic-search.spec.ts (test real-time search, debounced updates, empty results message, search term highlighting)
- [ ] T156 [P] [US9] E2E test for topic filters in frontend/e2e/topic-filters.spec.ts (test status filter, date range, participant count, filter pills, clear all)

### Implementation for User Story 9

- [ ] T157 [P] [US9] Create useDebounce hook in frontend/src/hooks/useDebounce.ts (delay value updates by 300ms for search inputs)
- [ ] T158 [P] [US9] Create SearchInput component in frontend/src/components/ui/SearchInput.tsx (search box with debounce, clear button, loading state)
- [ ] T159 [P] [US9] Create FilterPanel component in frontend/src/components/ui/FilterPanel.tsx (collapsible filter container with apply/reset)
- [ ] T160 [P] [US9] Create TagFilter component in frontend/src/components/ui/TagFilter.tsx (multi-select tag filter with checkboxes)
- [ ] T161 [US9] Update TopicsPage with SearchInput and FilterPanel in frontend/src/pages/Topics/TopicsPage.tsx
- [ ] T162 [US9] Add sort options to TopicsPage (newest, most participants, most responses) with sort direction toggle
- [ ] T163 [US9] Add filter persistence to localStorage (remember user's last filter settings)
- [ ] T164 [US9] Add empty search results state with suggested topics or search tips

**Checkpoint**: Search and filtering should work smoothly with debounced updates and persistent filter state. All tests should PASS.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

- [ ] T165 [P] Run Lighthouse Performance audit on all major pages (TopicsPage, TopicDetailPage, ProfilePage) and verify score ≥90
- [ ] T166 [P] Run Lighthouse Accessibility audit on all major pages and verify score ≥95
- [ ] T167 [P] Verify First Contentful Paint (FCP) ≤1.5s on 3G network throttling in Chrome DevTools
- [ ] T168 [P] Measure JavaScript bundle size and verify ≤500KB gzipped using webpack-bundle-analyzer
- [ ] T169 [P] Test keyboard navigation across all interactive elements (Tab, Shift+Tab, Enter, Escape, Arrow keys) and verify logical order
- [ ] T170 [P] Verify all ARIA attributes are correctly implemented using axe DevTools (no violations)
- [ ] T171 [P] Test responsive behavior on actual devices: iPhone SE (320px), iPhone 12 (390px), iPad (768px), Desktop (1920px)
- [ ] T172 Code cleanup: Remove console.log statements, unused imports, commented code across all modified files
- [ ] T173 Update CLAUDE.md with new UI/UX implementation patterns and component usage guidelines
- [ ] T174 Run type checking (pnpm typecheck) and linting (pnpm lint) to ensure zero errors
- [ ] T175 Commit with descriptive message following Conventional Commits format: "feat(ui): Implement comprehensive UI/UX enhancements"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1-P1 → US2-P1 → US3-P1 → US4-P2 → US5-P2 → US6-P2 → US7-P2 → US8-P3 → US9-P3)
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Navigation)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1 - Dark Mode)**: Can start after Foundational (Phase 2) - No dependencies, but benefits from US1 components existing
- **User Story 3 (P1 - Form Validation)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2 - Mobile Responsive)**: Can start after Foundational (Phase 2) - Integrates with US1 navigation but independently testable
- **User Story 5 (P2 - Loading States)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 6 (P2 - Error Handling)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 7 (P2 - Typography)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 8 (P3 - Onboarding)**: Can start after Foundational (Phase 2) - References US1 navigation elements but independently testable
- **User Story 9 (P3 - Search)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- **Test-Driven Development (TDD)**: Write tests FIRST, ensure they FAIL, then implement to make them PASS
- Schema/type definition tasks before implementation tasks that use them
- Context providers before components that consume them
- Base components before page components that use them
- Core implementation before integration tasks
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001-T003, T004-T006)
- All Foundational tasks marked [P] can run in parallel (T008-T012)
- All test tasks marked [P] within each user story can be written in parallel
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Within each user story, tasks marked [P] can run in parallel:
  - US1: T013-T022 (all test tasks), T023-T025 (contexts and components in separate files)
  - US2: T034-T041 (all test tasks), T042-T047 (separate component updates)
  - US3: T055-T064 (all test tasks), T065-T070 (schemas and component updates in separate files)
  - US4: T077-T083 (all test tasks), T084-T088 (page component updates)
  - US5: T093-T099 (all test tasks), T100-T106 (skeleton component creation)
  - US6: T112-T118 (all test tasks), T119-T122 (error handling components)
  - US7: T129-T132 (all test tasks), T133-T138 (typography updates)
  - US8: T139-T142 (all test tasks), T143-T145 (onboarding contexts and components)
  - US9: T150-T156 (all test tasks), T157-T160 (search utilities and components)
  - Polish: T165-T171 (audits and testing)

---

## Test Summary

**Total Tasks**: 175 (up from 113 in previous version)
**Test Tasks**: 62 new test tasks added (35% of total)
**Implementation Tasks**: 113 (same as before)

### Test Coverage by User Story

- **US1 (Navigation)**: 10 test tasks (7 unit + 2 E2E + 1 integration)
- **US2 (Dark Mode)**: 8 test tasks (5 unit + 3 E2E)
- **US3 (Form Validation)**: 10 test tasks (5 unit + 2 integration + 3 E2E)
- **US4 (Mobile Responsive)**: 7 test tasks (3 unit + 4 E2E)
- **US5 (Loading States)**: 7 test tasks (4 unit + 3 E2E)
- **US6 (Error Handling)**: 7 test tasks (3 unit + 4 E2E)
- **US7 (Typography)**: 4 test tasks (1 unit + 3 E2E)
- **US8 (Onboarding)**: 4 test tasks (2 unit + 2 E2E)
- **US9 (Search & Filtering)**: 7 test tasks (4 unit + 1 integration + 2 E2E)

### Test Types

- **Unit Tests**: 34 tasks (component, hook, schema validation)
- **Integration Tests**: 4 tasks (form validation, navigation persistence, search filters)
- **E2E Tests**: 24 tasks (user flows, accessibility, responsive behavior)

---

## Implementation Strategy

**Recommended Approach**: TDD (Test-Driven Development)

1. Write tests for a user story FIRST (T013-T022 for US1)
2. Ensure all tests FAIL (red phase)
3. Implement the feature (T023-T033 for US1)
4. Ensure all tests PASS (green phase)
5. Refactor if needed while keeping tests green
6. Move to next user story

**MVP Scope (Minimum Viable Product)**: User Story 1 only
- Implement enhanced navigation (Tasks T001-T033)
- This provides immediate value: improved navigation UX
- Independently testable and deployable
- Foundation for other stories

**Incremental Delivery**:
1. MVP: US1 (Navigation) - Week 1
2. Second increment: US2 (Dark Mode) + US3 (Form Validation) - Week 2
3. Third increment: US4 (Mobile) + US5 (Loading) - Week 3
4. Final increment: US6-US9 (Polish features) - Week 4

Each increment is a complete, testable, deployable slice of functionality.
