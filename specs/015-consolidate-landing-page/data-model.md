# Data Model: Consolidate Landing Page

**Branch**: `015-consolidate-landing-page` | **Date**: 2026-02-02

## Overview

This feature does not introduce new database entities. The landing page consolidation is purely a frontend refactor that uses existing demo service data.

## Client-Side State

### WelcomeBanner State

**Purpose**: Track whether authenticated user has dismissed the welcome banner

**Storage**: `localStorage`

**Key**: `reasonbridge:welcome-banner-dismissed`

**Schema**:
```typescript
interface WelcomeBannerState {
  dismissed: boolean;
  dismissedAt: string; // ISO 8601 timestamp
}
```

**Behavior**:
- Default: `{ dismissed: false }`
- When user clicks dismiss: `{ dismissed: true, dismissedAt: new Date().toISOString() }`
- Banner not shown if `dismissed === true`

### Auth Redirect State

**Purpose**: Track redirect flow for authenticated users

**Storage**: URL query parameter

**Parameter**: `welcome=true`

**Flow**:
1. Authenticated user visits `/`
2. `useAuthRedirect` hook detects auth state
3. Redirects to `/topics?welcome=true`
4. TopicsPage reads query param, shows WelcomeBanner
5. After banner dismissal, query param can be removed

## Existing Data Dependencies

### Demo Service API

The landing page's InteractiveDemo component uses existing demo service endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/demo/discussions` | GET | Fetch demo discussions for display |
| `/api/demo/metrics` | GET | Fetch social proof metrics |

**No changes required** to these endpoints.

## Type Definitions

```typescript
// New types for this feature

/**
 * Props for WelcomeBanner component
 */
interface WelcomeBannerProps {
  /** Callback when user dismisses the banner */
  onDismiss?: () => void;
  /** Optional custom message */
  message?: string;
}

/**
 * Return type for useAuthRedirect hook
 */
interface UseAuthRedirectResult {
  /** Whether redirect is in progress */
  isRedirecting: boolean;
  /** Target URL after redirect */
  redirectUrl: string | null;
}

/**
 * Props for LandingLayout component
 */
interface LandingLayoutProps {
  /** Child content to render */
  children: React.ReactNode;
}
```

## Entity Summary

| Entity | Type | Storage | New/Existing |
|--------|------|---------|--------------|
| WelcomeBannerState | Client state | localStorage | New |
| DemoDiscussion | API response | Demo service | Existing |
| DemoMetrics | API response | Demo service | Existing |
| User (auth check) | Context | AuthContext | Existing |

## Migration Notes

- No database migrations required
- No backend API changes required
- LocalStorage key is new but doesn't require migration (defaults to not dismissed)
