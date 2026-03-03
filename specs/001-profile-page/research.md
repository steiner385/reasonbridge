# Research: User Profile Pages

**Feature Branch**: `001-profile-page`
**Date**: 2026-03-02
**Status**: Complete

## Research Summary

This document consolidates research findings for implementing user profile pages in reasonBridge. The feature extends existing profile infrastructure with privacy controls, contribution history, and responsive layouts.

---

## 1. Existing Infrastructure Analysis

### Decision: Extend Existing Components

**Rationale**: The codebase already has substantial profile infrastructure that should be extended rather than replaced.

**Existing Components**:
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `ProfilePage.tsx` | `pages/Profile/` | Own profile view | Extend |
| `UserProfilePage.tsx` | `pages/Profile/` | Public profile view | Extend |
| `TrustScoreBadge.tsx` | `components/users/` | Trust score display (ABI model) | Reuse |
| `TierBadge.tsx` | `components/ranking/` | Global tier badge | Reuse |
| `ExpertiseBadge.tsx` | `components/ranking/` | Domain expertise badge | Reuse |
| `FollowButton.tsx` | `components/users/` | Follow/unfollow action | Reuse |
| `FollowersList.tsx` | `components/users/` | Followers display | Reuse |
| `FollowingList.tsx` | `components/users/` | Following display | Reuse |

**Alternatives Considered**:
- Full rewrite: Rejected (existing patterns work well, no technical debt justifying rewrite)
- Third-party profile library: Rejected (reasonBridge has unique trust model requirements)

---

## 2. Privacy Settings Model

### Decision: Three-Tier Visibility System

**Rationale**: Standard social media pattern that provides clear user control without overwhelming complexity.

**Visibility Levels**:
```typescript
type ProfileVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';
```

**Configurable Fields**:
| Field | Default | Allowed Values | Notes |
|-------|---------|----------------|-------|
| `activityHistory` | PUBLIC | All three | Full control over contribution visibility |
| `detailedTrustScores` | PUBLIC | PUBLIC, FOLLOWERS_ONLY | Private not allowed (platform integrity) |
| `followerList` | PUBLIC | All three | Standard social feature |
| `followingList` | PUBLIC | All three | Standard social feature |

**Core Indicators Always Visible** (per FR-018):
- Tier badge (NEWCOMER through EXPERT)
- Overall trust level (Very Low through Very High)
- Verification status badge

**Alternatives Considered**:
- Binary public/private: Rejected (too limiting for social features)
- Per-field visibility for all fields: Rejected (over-complicated UX)
- Anonymous mode: Rejected (conflicts with trust-based platform model)

---

## 3. Contribution History Implementation

### Decision: Paginated List with Type Filtering

**Rationale**: Follows established patterns in discussion-service for listing content.

**Contribution Types**:
```typescript
type ContributionType = 'TOPIC' | 'RESPONSE' | 'VALIDATION';
```

**API Design**:
```
GET /users/:id/contributions?type=TOPIC&limit=20&offset=0
```

**Response Shape**:
```typescript
interface ContributionItem {
  id: string;
  type: ContributionType;
  title: string;          // Topic title or truncated response
  topicId: string;
  createdAt: string;
  stats: {
    upvotes?: number;     // For responses
    responseCount?: number; // For topics
  };
}
```

**Filtering Options**:
- All (default)
- Topics Only
- Responses Only
- Validations Only

**Pagination**:
- Default limit: 20 items
- Infinite scroll with intersection observer
- Cache per filter type

**Alternatives Considered**:
- Tabs for each type: Rejected (too many tabs, mobile unfriendly)
- Timeline view with mixed types: Considered but dropdown filter provides cleaner UX
- Full contribution objects: Rejected (too heavy, summary is sufficient)

---

## 4. Profile Edit Form

### Decision: Modal with Sectioned Form

**Rationale**: Consistent with existing modal patterns (e.g., RequestAccessModal), keeps profile page clean.

**Form Sections**:
1. **Identity**: Display name (3-50 chars), Bio (0-300 chars)
2. **Avatar**: Upload with preview, crop support via existing S3 infrastructure
3. **Privacy**: Visibility toggles

**Validation** (Zod schema):
```typescript
const profileEditSchema = z.object({
  displayName: z.string().min(3).max(50),
  bio: z.string().max(300).optional(),
  avatar: z.string().url().optional(),
  privacy: z.object({
    activityHistory: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']),
    detailedTrustScores: z.enum(['PUBLIC', 'FOLLOWERS_ONLY']),
    followerList: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']),
    followingList: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']),
  }),
});
```

**Alternatives Considered**:
- Inline editing: Rejected (doesn't scale well with privacy settings)
- Separate settings page: Rejected (fragments profile management)

---

## 5. Responsive Layout Strategy

### Decision: Mobile-First Card Layout

**Rationale**: Matches existing responsive patterns in discussion layout, provides optimal experience across devices.

**Layout Breakpoints**:
| Viewport | Layout | Notes |
|----------|--------|-------|
| <640px (mobile) | Single column, stacked cards | Touch-friendly, 44px targets |
| 640-1023px (tablet) | Single column, wider cards | More horizontal space |
| ≥1024px (desktop) | Two-column (70/30) | Header/stats left, contributions right |

**Component Hierarchy**:
```
ProfilePage
├── ProfileHeader (avatar, name, tier, follow button)
├── ProfileStats (4-column grid on desktop, 2x2 on mobile)
├── TrustSection (collapsible on mobile)
│   ├── TrustScoreBadge (existing)
│   └── Trust dimension breakdown
├── ExpertiseSection (horizontal scroll on mobile)
│   └── ExpertiseBadge[] (existing)
└── ContributionSection
    ├── ContributionFilters
    └── ContributionList (infinite scroll)
```

**Alternatives Considered**:
- Three-panel layout: Rejected (too complex for profile page)
- Desktop-first: Rejected (majority of social media traffic is mobile)

---

## 6. State Management

### Decision: React Query + Local State

**Rationale**: Consistent with existing patterns, provides caching and real-time invalidation.

**Query Keys**:
```typescript
// Profile data
['user', userId]                           // User profile
['user', userId, 'contributions', type]    // Contributions (per filter)
['user', userId, 'followers']              // Followers list
['user', userId, 'following']              // Following list
['user', userId, 'privacy']                // Privacy settings (own profile only)
```

**Optimistic Updates**:
- Follow/unfollow: Update local state immediately, rollback on error
- Privacy changes: Update immediately with toast confirmation

**Real-time Updates**:
- WebSocket event: `USER_FOLLOW_CHANGE` - Invalidate followers/following queries
- WebSocket event: `TRUST_SCORE_UPDATE` - Invalidate user query

**Alternatives Considered**:
- Redux/Zustand: Rejected (React Query sufficient for server state)
- Server-side rendering: Rejected (not needed for profile pages)

---

## 7. Performance Optimizations

### Decision: Lazy Loading + Caching Strategy

**Rationale**: Profile pages can have substantial data; optimize for perceived performance.

**Strategies**:
| Technique | Application | Benefit |
|-----------|-------------|---------|
| Skeleton loading | All sections | 100ms delay prevents flash |
| Image lazy loading | Avatar, contribution thumbnails | Reduces initial payload |
| Infinite scroll | Contributions | Only load visible items |
| React Query caching | All profile data | 5min stale time |
| Route-based code splitting | ProfileEditForm modal | Reduce bundle |

**Cache Durations**:
- Profile data: 5 minutes (staleTime)
- Contributions: 2 minutes
- Followers/Following: 5 minutes

**Alternatives Considered**:
- Virtual scrolling for contributions: Rejected (items have variable height, infinite scroll simpler)
- Service worker caching: Deferred (not critical for profile pages)

---

## 8. Accessibility Requirements

### Decision: WCAG AA Compliance

**Rationale**: Required by FR-027/FR-028/FR-029 and constitution UX principle.

**Key Requirements**:
| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | Focus trap in modals, logical tab order |
| Screen reader support | ARIA labels on all interactive elements |
| Color contrast | 4.5:1 minimum (Tailwind configured) |
| Touch targets | 44px minimum (existing pattern) |
| Trust score alternatives | Text labels accompany visual indicators |
| Motion sensitivity | Respect `prefers-reduced-motion` |

**Testing**:
- Lighthouse accessibility audit: Target 90+ score
- Manual keyboard navigation test
- axe-core integration tests

---

## 9. Error Handling Patterns

### Decision: Graceful Degradation with User Feedback

**Rationale**: Consistent with constitution UX principle on error messages.

**Error States**:
| Scenario | Handling |
|----------|----------|
| User not found | Full-page UserNotFound component with navigation options |
| Network error | ErrorState component with retry button |
| Partial load failure | Show available data, toast for failed section |
| Privacy restricted | Show restricted message, not error |
| Rate limited | Toast with retry time |

**Error Component Pattern**:
```tsx
if (isError) {
  return <ErrorState
    message="Failed to load profile"
    onRetry={refetch}
  />;
}
```

---

## 10. Edge Case Handling

### Decision: Explicit Status Indicators

**Rationale**: Edge cases from spec must be handled gracefully.

| Edge Case | Implementation |
|-----------|----------------|
| Suspended account | Limited profile with "Suspended" badge, no contributions |
| Deleted account | "Account Deleted" message, no data |
| No contributions | Empty state: "No contributions yet" with CTA |
| New user (no tier) | Shows NEWCOMER tier (default) |
| Blocked user viewing | Show minimal public info only |
| Long display name | CSS truncation with title tooltip |
| Long bio | Character limit enforced at input |

---

## Technology Decisions Summary

| Decision | Choice | Confidence |
|----------|--------|------------|
| Component architecture | Extend existing | High |
| Privacy model | Three-tier visibility | High |
| Contribution display | Paginated list + filters | High |
| Edit interface | Modal form | High |
| Responsive layout | Mobile-first cards | High |
| State management | React Query | High |
| Performance | Lazy + cache | High |
| Accessibility | WCAG AA | Required |

---

## Open Questions Resolved

All questions from technical context have been resolved through codebase research:

1. ✅ Existing profile patterns → Extend ProfilePage.tsx, UserProfilePage.tsx
2. ✅ Trust score implementation → Use existing TrustScoreBadge (ABI model)
3. ✅ Tier badge patterns → Use existing TierBadge with 5 levels
4. ✅ Follow infrastructure → Existing endpoints and components
5. ✅ Avatar storage → S3 with avatarUrl/avatarS3Key fields
6. ✅ Real-time updates → WebSocket infrastructure exists
7. ✅ Dark mode → ThemeContext and Tailwind dark: modifier

**Research Status**: Complete - Ready for Phase 1 design artifacts
