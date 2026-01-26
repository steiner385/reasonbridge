# Quickstart: Skeleton Loaders

**Feature Branch**: `002-skeleton-loaders`
**Date**: 2026-01-25

## Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- Local development environment running

## Getting Started

### 1. Check out the feature branch

```bash
git checkout 001-skeleton-loaders
pnpm install
```

### 2. Start the development server

```bash
cd frontend
pnpm dev
```

### 3. View skeleton loaders in action

**Option A: Throttle network in browser DevTools**
1. Open Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to http://localhost:5173/topics
4. Observe skeleton loaders before content appears

**Option B: Add artificial delay to API**
```typescript
// Temporarily modify src/lib/useTopics.ts
const { data, isLoading, error } = useQuery({
  queryKey: ['topics', filters],
  queryFn: async () => {
    await new Promise(r => setTimeout(r, 2000)); // Add 2s delay
    return apiClient.get<TopicsResponse>('/topics', { params: filters });
  },
});
```

## Component Usage

### Base Skeleton

```tsx
import { Skeleton } from '@/components/ui/Skeleton';

// Rectangular skeleton (default)
<Skeleton width="100%" height={20} />

// Circular skeleton (for avatars)
<Skeleton variant="circular" width={48} height={48} />

// Without animation
<Skeleton animation="none" width="50%" height={16} />
```

### Text Skeleton

```tsx
import { SkeletonText } from '@/components/ui/Skeleton';

// Single line
<SkeletonText />

// Multiple lines with last line shorter
<SkeletonText lines={3} lastLineWidth={60} />

// Different sizes
<SkeletonText size="lg" lines={2} />
```

### Avatar Skeleton

```tsx
import { SkeletonAvatar } from '@/components/ui/Skeleton';

// Default medium size
<SkeletonAvatar />

// Different sizes
<SkeletonAvatar size="sm" />  {/* 32px */}
<SkeletonAvatar size="lg" />  {/* 64px */}
<SkeletonAvatar size="xl" />  {/* 96px */}
```

### Composite Skeletons

```tsx
import { TopicCardSkeleton } from '@/components/ui/skeletons';

// Single topic card skeleton
<TopicCardSkeleton />

// List of skeletons
<div className="space-y-4">
  {[1, 2, 3].map(i => <TopicCardSkeleton key={i} />)}
</div>
```

### Integration with Loading States

```tsx
import { useTopics } from '@/lib/useTopics';
import { TopicCard, TopicCardSkeleton } from '@/components/topics';

function TopicsPage() {
  const { data, isLoading } = useTopics(filters);

  return (
    <div className="space-y-4">
      {isLoading ? (
        // Show 3 skeleton cards while loading
        [1, 2, 3].map(i => <TopicCardSkeleton key={i} />)
      ) : (
        data?.data.map(topic => <TopicCard key={topic.id} topic={topic} />)
      )}
    </div>
  );
}
```

## Testing

### Run unit tests

```bash
cd frontend
pnpm test:unit --grep Skeleton
```

### Run E2E tests

```bash
cd frontend
pnpm test:e2e --grep skeleton
```

### Manual testing checklist

1. **Topics Page** (`/topics`)
   - [ ] Skeleton cards appear during load
   - [ ] 3 skeleton cards match TopicCard layout
   - [ ] No layout shift when content loads
   - [ ] Animation is smooth (no jank)

2. **Topic Detail Page** (`/topics/:id`)
   - [ ] Header skeleton matches actual header
   - [ ] Description skeleton shows 2-3 lines
   - [ ] Response list shows 3 skeleton items
   - [ ] Sections load independently

3. **Profile Page** (`/profile`)
   - [ ] Avatar skeleton is circular
   - [ ] Name/username skeleton matches layout
   - [ ] Stats row skeleton matches actual

4. **Accessibility**
   - [ ] Screen reader announces "Loading content"
   - [ ] `aria-busy` is true on skeleton containers
   - [ ] Focus is not trapped in skeleton areas

5. **Performance**
   - [ ] No skeleton flash on fast connections
   - [ ] Animation is GPU-accelerated (check in DevTools)
   - [ ] No memory leaks on repeated navigation

## File Locations

```
frontend/src/components/ui/
├── Skeleton/
│   ├── index.ts           # Exports
│   ├── Skeleton.tsx       # Base component
│   ├── SkeletonText.tsx   # Text variant
│   ├── SkeletonAvatar.tsx # Avatar variant
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Style constants
│   └── Skeleton.spec.tsx  # Tests
│
├── skeletons/             # Composite skeletons
│   ├── index.ts
│   ├── TopicCardSkeleton.tsx
│   ├── TopicDetailSkeleton.tsx
│   ├── ProfileSkeleton.tsx
│   └── ResponseSkeleton.tsx
```

## Common Issues

### Skeleton doesn't match content size

Ensure skeleton dimensions match actual component:
```tsx
// Measure actual component
// Use browser DevTools to get exact dimensions
// Apply same padding, margins, heights
```

### Animation is choppy

- Use `animate-pulse` (GPU-accelerated)
- Avoid `animate-shimmer` on low-end devices
- Check if too many skeletons are animating simultaneously

### Screen reader doesn't announce loading

Add proper ARIA attributes:
```tsx
<div role="status" aria-busy="true" aria-label="Loading topics">
  <span className="sr-only">Loading...</span>
  {/* skeleton content */}
</div>
```

## Next Steps After Implementation

1. **Add to Storybook** (if using): Create stories for each skeleton variant
2. **Document in design system**: Add skeleton guidelines to team documentation
3. **Monitor CLS**: Use Lighthouse to verify Cumulative Layout Shift stays < 0.1
4. **Expand coverage**: Apply pattern to other async content (moderation queue, search results)
