# Data Model: UI/UX Enhancement

**Feature**: 001-ui-ux-enhancement
**Date**: 2026-02-04
**Type**: Client-Side State Entities

## Overview

This feature primarily deals with UI/UX enhancements that involve client-side state management. There are no new database entities required. All data models represent TypeScript interfaces for managing client-side state using React Context API and localStorage.

---

## Client-Side State Entities

### 1. ThemePreference

**Purpose**: Manages user's theme selection (light, dark, auto) with persistence.

**Storage**: localStorage (`theme-preference`)

**Interface**:
```typescript
interface ThemePreference {
  mode: 'light' | 'dark' | 'auto';
  lastUpdated: string; // ISO 8601 timestamp
}
```

**State Transitions**:
```
┌─────┐ toggle ┌──────┐ toggle ┌──────┐ toggle ┌──────┐
│ auto├───────→│ light├───────→│ dark ├───────→│ auto │
└─────┘        └──────┘        └──────┘        └──────┘
```

**Business Rules**:
- Default: `auto` (detect system preference)
- Manual selection overrides system preference
- Persisted across sessions in localStorage
- Synced to backend user preferences (optional, for cross-device)

**Validation**:
- `mode` must be one of: `'light'`, `'dark'`, `'auto'`
- `lastUpdated` must be valid ISO 8601 timestamp

---

### 2. NavigationState

**Purpose**: Tracks sidebar collapsed/expanded state and mobile drawer open/closed state.

**Storage**:
- localStorage (`sidebar-collapsed`) - persistent
- React state (`isMobileOpen`) - ephemeral

**Interface**:
```typescript
interface NavigationState {
  // Desktop sidebar state (persistent)
  isCollapsed: boolean;

  // Mobile drawer state (ephemeral, always starts closed)
  isMobileOpen: boolean;

  // Current route information
  currentRoute: string;
  breadcrumbs: Breadcrumb[];

  // Notification badge count
  unreadCount: number;
}

interface Breadcrumb {
  label: string;
  path: string;
}
```

**State Transitions**:
```
Desktop Sidebar:
collapsed ←→ expanded (toggle, persisted)

Mobile Drawer:
closed → open (hamburger click)
open → closed (backdrop click, route change, Escape key)
```

**Business Rules**:
- Desktop sidebar state persists across sessions
- Mobile drawer always starts closed on page load
- Drawer auto-closes on route navigation
- Unread count fetched from backend notification service

**Validation**:
- `isCollapsed` and `isMobileOpen` must be booleans
- `currentRoute` must be valid path string
- `unreadCount` must be non-negative integer

---

### 3. FormValidationState

**Purpose**: Manages form validation errors, submission status, and field states (React Hook Form managed).

**Storage**: React Hook Form internal state (not persisted)

**Interface**:
```typescript
interface FormValidationState<T> {
  // Field-level errors (React Hook Form managed)
  errors: Partial<Record<keyof T, FieldError>>;

  // Form submission status
  isSubmitting: boolean;
  isSubmitted: boolean;
  isValid: boolean;

  // Field interaction tracking
  touchedFields: Partial<Record<keyof T, boolean>>;
  dirtyFields: Partial<Record<keyof T, boolean>>;

  // Validation mode
  mode: 'onSubmit' | 'onBlur' | 'onChange';
}

interface FieldError {
  type: string;
  message: string;
}
```

**State Transitions**:
```
pristine → dirty (user edits field)
untouched → touched (user leaves field)
valid → invalid (validation fails)
invalid → valid (user corrects error)
idle → submitting → submitted (form submission)
```

**Business Rules**:
- Validation runs based on `mode` setting (default: `onBlur`)
- Errors cleared when field value changes (in `onChange` mode)
- Form cannot submit while `isSubmitting` is true
- Field marked touched only after blur event

**Validation**:
- Powered by Zod schema validation
- Errors contain user-friendly messages
- Type-safe with TypeScript inference

---

### 4. LoadingState

**Purpose**: Tracks loading states for asynchronous operations (API calls, AI analysis).

**Storage**: React state (ephemeral)

**Interface**:
```typescript
interface LoadingState {
  status: 'idle' | 'pending' | 'success' | 'error';
  error: Error | null;
  data: unknown | null;

  // Skeleton screen visibility
  showSkeleton: boolean;

  // Optimistic update tracking
  optimisticData: unknown | null;
}
```

**State Transitions**:
```
idle → pending → success
            ↓
          error

pending (>500ms) → showSkeleton: true
success/error → showSkeleton: false
```

**Business Rules**:
- Skeleton screens appear after 500ms delay (prevent flash)
- Error state includes user-friendly error message
- Optimistic updates applied immediately, rolled back on error
- "Still working..." message appears after 3 seconds

**Validation**:
- `status` must be one of the four defined states
- `error` must be null when status is not `'error'`
- `data` must be null when status is `'idle'` or `'pending'`

---

### 5. ToastNotificationState

**Purpose**: Manages toast notification queue and display.

**Storage**: React state (ephemeral, managed by NotificationContext)

**Interface**:
```typescript
interface ToastNotificationState {
  toasts: Toast[];
  maxToasts: number; // Default: 5
}

interface Toast {
  id: string; // UUID
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number; // milliseconds (0 = persist until dismissed)
  dismissible: boolean;
  action?: ToastAction;
  createdAt: string; // ISO 8601 timestamp
}

interface ToastAction {
  label: string;
  onClick: () => void;
}
```

**State Transitions**:
```
[empty queue] → [toast added] → [toast displayed]
                                       ↓
                              [auto-dismiss after duration]
                                       ↓
                              [toast removed from queue]

User can manually dismiss: displayed → dismissed → removed
```

**Business Rules**:
- Maximum 5 toasts displayed simultaneously
- Oldest toasts removed first when queue exceeds max
- Duplicate prevention: Same title within 1 second ignored
- Auto-dismiss after `duration` (default: 5000ms)
- Toast queue persists during navigation (within same session)

**Validation**:
- `id` must be unique UUID
- `type` must be one of the four defined types
- `duration` must be non-negative integer
- `title` must not be empty string

---

### 6. OnboardingProgressState

**Purpose**: Tracks user progress through onboarding tour.

**Storage**:
- localStorage (`onboarding-tour-progress`) - primary
- Backend API (`/onboarding/tour-progress`) - sync

**Interface**:
```typescript
interface OnboardingProgressState {
  // Tour completion status
  completed: boolean;
  skipped: boolean;

  // Current tour state
  isRunning: boolean;
  currentStepIndex: number;
  totalSteps: number;

  // Individual step completion (optional, for analytics)
  completedSteps: number[];

  // Contextual tooltips (separate from main tour)
  dismissedTooltips: string[]; // Array of tooltip IDs

  // Timestamps
  tourStartedAt: string | null; // ISO 8601
  tourCompletedAt: string | null; // ISO 8601
  tourSkippedAt: string | null; // ISO 8601

  // Re-prompting logic
  skipCount: number; // Number of times user has skipped
  lastPromptDate: string | null; // ISO 8601
}
```

**State Transitions**:
```
new user → tour not started
           ↓
        tour running
         ↙     ↘
    completed   skipped
```

**Business Rules**:
- Tour auto-starts for new users (after 1-second delay)
- Skipped tours can be restarted from Settings
- Contextual tooltips shown on first use of features
- Re-prompt skipped users after 7 days
- Sync to backend for cross-device consistency

**Validation**:
- `currentStepIndex` must be ≥ 0 and < `totalSteps`
- `completed` and `skipped` cannot both be true
- Timestamp fields must be valid ISO 8601 or null

---

### 7. SearchState

**Purpose**: Manages search query, filters, and results.

**Storage**: React state (ephemeral) + URL query parameters (for deep linking)

**Interface**:
```typescript
interface SearchState {
  // Query string
  query: string;
  debouncedQuery: string; // Debounced by 300ms

  // Active filters
  filters: SearchFilters;

  // Results
  results: SearchResult[];
  resultCount: number;
  isSearching: boolean;

  // Pagination
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface SearchFilters {
  status?: ('ACTIVE' | 'SEEDING' | 'ARCHIVED')[];
  dateRange?: {
    start: string; // ISO 8601 date
    end: string; // ISO 8601 date
  };
  participantCount?: {
    min: number;
    max: number;
  };
}

interface SearchResult {
  id: string;
  type: 'topic' | 'response' | 'user';
  title: string;
  excerpt: string;
  highlightedText: string; // Match highlighted with <mark> tags
  relevance: number; // 0-1 score
}
```

**State Transitions**:
```
idle → typing → debounce (300ms) → searching → results displayed
                                        ↓
                                     error

Filter applied → results updated
Clear filters → reset to default results
```

**Business Rules**:
- Query debounced by 300ms to reduce API calls
- Filters persist in URL query parameters
- Search executes on Enter key or auto after debounce
- Empty query shows default/popular topics
- Results highlight matching search terms

**Validation**:
- `query` length must be ≤ 200 characters
- `dateRange.start` must be before `dateRange.end`
- `participantCount.min` must be ≤ `participantCount.max`
- `relevance` must be between 0 and 1

---

## State Persistence Strategy

| Entity | localStorage | Backend API | Session Only |
|--------|--------------|-------------|--------------|
| ThemePreference | ✅ Primary | ✅ Sync | - |
| NavigationState (sidebar) | ✅ Primary | - | - |
| NavigationState (drawer) | - | - | ✅ |
| FormValidationState | - | - | ✅ |
| LoadingState | - | - | ✅ |
| ToastNotificationState | - | - | ✅ |
| OnboardingProgressState | ✅ Primary | ✅ Sync | - |
| SearchState (query) | - | - | ✅ |
| SearchState (filters) | - | ✅ URL params | - |

**Sync Strategy**:
- **localStorage**: Immediate read/write for instant UI updates
- **Backend API**: Asynchronous sync for cross-device consistency
- **Graceful degradation**: Features work offline if backend sync fails

---

## Type Definitions Location

All TypeScript interfaces will be defined in:
```
frontend/src/types/
├── navigation.ts      # NavigationState, Breadcrumb
├── forms.ts           # FormValidationState, FieldError
├── loading.ts         # LoadingState
├── notifications.ts   # ToastNotificationState, Toast
├── onboarding.ts      # OnboardingProgressState
├── search.ts          # SearchState, SearchFilters, SearchResult
└── theme.ts           # ThemePreference
```

**Import Convention**:
```typescript
import type { ThemePreference } from '@/types/theme';
import type { NavigationState } from '@/types/navigation';
```

---

## Validation Schemas

Zod schemas for runtime validation:
```
frontend/src/schemas/
├── common.ts          # Shared validators (email, password, URL)
├── auth.ts            # Login, registration
├── profile.ts         # Profile updates
├── discussion.ts      # Topics, responses
└── search.ts          # Search query validation
```

---

## Entity Relationships

```
ThemePreference
   └── (no relationships, standalone)

NavigationState
   ├── depends on: CurrentUser (for authentication state)
   └── depends on: NotificationService (for unread count)

FormValidationState
   └── depends on: Zod schemas (for validation rules)

LoadingState
   └── associated with: API calls, AI analysis operations

ToastNotificationState
   └── triggered by: API responses, user actions

OnboardingProgressState
   ├── depends on: CurrentUser (for new user detection)
   └── syncs with: Backend /onboarding/tour-progress endpoint

SearchState
   ├── depends on: Backend /topics/search endpoint
   └── syncs with: URL query parameters
```

---

## Migration Notes

**Existing State to Update**:
1. `NotificationContext` - Enhance with queue management and responsive positioning
2. `AuthContext` - No changes required (compatible with new form validation)
3. Theme state (currently basic) - Expand to full ThemePreference model with persistence

**New State to Create**:
1. `SidebarContext` - NEW: Manage navigation sidebar state
2. `OnboardingTourContext` - NEW: Manage React Joyride tour state
3. Form validation state - NEW: Managed by React Hook Form (no Context needed)
4. Search state - NEW: Managed in SearchPage component with URL sync

---

## References

- React Hook Form State Management: https://react-hook-form.com/docs/useform
- Zod Schema Validation: https://zod.dev/
- React Context API: https://react.dev/reference/react/createContext
- localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
