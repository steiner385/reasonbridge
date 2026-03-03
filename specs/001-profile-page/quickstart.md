# Quickstart: User Profile Pages

**Feature Branch**: `001-profile-page`
**Date**: 2026-03-02

## Overview

This guide helps developers quickly get started implementing user profile pages in reasonBridge. The feature extends existing profile infrastructure with privacy controls, contribution history, and responsive layouts.

---

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- PostgreSQL 15 (running locally or via Docker)
- reasonBridge development environment set up

---

## Getting Started

### 1. Switch to Feature Branch

```bash
git checkout 001-profile-page
pnpm install
```

### 2. Run Database Migration

```bash
cd packages/db-models
npx prisma migrate dev --name add_privacy_settings
```

This creates:
- `user_privacy_settings` table
- `bio` column on `users` table
- `profile_visibility` enum type

### 3. Start Development Servers

```bash
# Terminal 1: Frontend
cd frontend && pnpm dev

# Terminal 2: User Service
cd services/user-service && pnpm dev

# Terminal 3: Discussion Service (for contributions)
cd services/discussion-service && pnpm dev
```

---

## Key Files to Modify

### Frontend Components (New)

| File | Purpose |
|------|---------|
| `src/components/profile/ProfileHeader.tsx` | Avatar, name, tier, follow button |
| `src/components/profile/ProfileBio.tsx` | Bio display with edit capability |
| `src/components/profile/ProfileStats.tsx` | Stats grid (topics, responses, followers) |
| `src/components/profile/ProfileEditForm.tsx` | Modal form for profile editing |
| `src/components/profile/PrivacySettings.tsx` | Privacy toggles component |
| `src/components/profile/ContributionList.tsx` | Contribution history list |
| `src/components/profile/ContributionFilters.tsx` | Type filter dropdown |

### Frontend Pages (Extend)

| File | Changes |
|------|---------|
| `src/pages/Profile/UserProfilePage.tsx` | Add bio, contributions, privacy-aware sections |
| `src/pages/Profile/ProfilePage.tsx` | Add edit button, privacy settings link |

### Backend (Extend)

| File | Changes |
|------|---------|
| `services/user-service/src/users/users.controller.ts` | Add privacy endpoints |
| `services/user-service/src/users/users.service.ts` | Add privacy logic |
| `services/user-service/src/users/dto/privacy-settings.dto.ts` | New DTO |

### Database

| File | Changes |
|------|---------|
| `packages/db-models/prisma/schema.prisma` | Add UserPrivacySettings model, bio field |

---

## Implementation Order

### Phase 1: Database & Backend (Days 1-2)

1. Add Prisma models and migrate
2. Create privacy settings DTO and validation
3. Extend users.controller.ts with privacy endpoints
4. Add contributions endpoint in discussion-service

### Phase 2: Frontend Components (Days 3-5)

1. Create ProfileHeader component
2. Create ProfileStats component
3. Create ProfileBio component
4. Create ContributionList with filters
5. Create PrivacySettings component

### Phase 3: Page Integration (Days 6-7)

1. Update UserProfilePage.tsx with new sections
2. Update ProfilePage.tsx with edit modal
3. Implement privacy-aware rendering
4. Add responsive layout breakpoints

### Phase 4: Testing & Polish (Days 8-10)

1. Unit tests for all new components
2. Integration tests for API endpoints
3. E2E tests for profile flows
4. Accessibility audit (90+ Lighthouse)
5. Dark mode verification

---

## API Quick Reference

### Profile Endpoints (Existing, Extended)

```bash
# Get user profile
GET /api/users/:id

# Get own profile
GET /api/users/me

# Update own profile
PUT /api/users/me
{
  "displayName": "Jane Doe",
  "bio": "Passionate about rational discourse"
}
```

### Privacy Endpoints (New)

```bash
# Get privacy settings
GET /api/users/me/privacy

# Update privacy settings
PUT /api/users/me/privacy
{
  "activityHistory": "FOLLOWERS_ONLY",
  "detailedTrustScores": "PUBLIC",
  "followerList": "PUBLIC",
  "followingList": "PUBLIC"
}
```

### Contributions Endpoint (New)

```bash
# Get user contributions
GET /api/users/:id/contributions?type=TOPIC&limit=20&offset=0
```

---

## Component Examples

### ProfileHeader Usage

```tsx
import ProfileHeader from '@/components/profile/ProfileHeader';

<ProfileHeader
  user={user}
  isOwnProfile={currentUser?.id === user.id}
  onEditClick={() => setShowEditModal(true)}
/>
```

### Privacy-Aware Section

```tsx
import { usePrivacySettings } from '@/hooks/usePrivacySettings';

function ContributionSection({ userId, isFollowing, isOwnProfile }) {
  const { canView } = usePrivacySettings(userId, 'activityHistory', {
    isFollowing,
    isOwnProfile,
  });

  if (!canView) {
    return <PrivacyRestrictedMessage field="contributions" />;
  }

  return <ContributionList userId={userId} />;
}
```

### Trust Score with Privacy

```tsx
<TrustScoreBadge
  user={user}
  showDimensions={canViewDetailedScores}
  size="lg"
/>
```

---

## Testing Commands

```bash
# Run unit tests
pnpm test:unit --filter="**/profile/**"

# Run E2E tests
pnpm test:e2e frontend/e2e/profile/

# Accessibility audit
npx lighthouse http://localhost:5173/users/test-user-id --only-categories=accessibility
```

---

## Common Patterns

### React Query Keys

```typescript
// Profile data
['user', userId]
['user', userId, 'contributions', type]
['user', userId, 'privacy']

// Followers/Following
['user', userId, 'followers']
['user', userId, 'following']
```

### Privacy Check Hook

```typescript
function useCanView(
  userId: string,
  field: 'activityHistory' | 'detailedTrustScores' | 'followerList' | 'followingList'
): boolean {
  const { data: privacy } = usePrivacySettings(userId);
  const { user: currentUser } = useAuth();
  const { data: followStatus } = useFollowStatus(userId);

  if (!currentUser) return privacy?.[field] === 'PUBLIC';
  if (currentUser.id === userId) return true;
  if (privacy?.[field] === 'PUBLIC') return true;
  if (privacy?.[field] === 'FOLLOWERS_ONLY' && followStatus?.isFollowing) return true;
  return false;
}
```

---

## Troubleshooting

### Migration fails

```bash
# Reset database and reapply migrations
npx prisma migrate reset
```

### Privacy settings not loading

- Check that user-service is running
- Verify JWT token is valid
- Check browser console for API errors

### Dark mode not working

- Ensure `dark:` classes are applied to new components
- Check ThemeContext is wrapping component tree

---

## Resources

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation plan
- [data-model.md](./data-model.md) - Data entities
- [contracts/profile-api.yaml](./contracts/profile-api.yaml) - API spec
- [contracts/privacy-api.yaml](./contracts/privacy-api.yaml) - Privacy API spec
