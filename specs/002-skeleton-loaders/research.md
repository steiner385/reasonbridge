# Research: Skeleton Loaders for Async Content

**Feature Branch**: `002-skeleton-loaders`
**Phase**: 0 - Research
**Date**: 2026-01-25

## Executive Summary

This research documents findings for implementing skeleton loaders to replace the current spinner-based loading states. The codebase uses React 18 with Tailwind CSS and has well-established patterns for loading states via React Query's `isLoading`.

## Current State Analysis

### Existing Loading Patterns

The codebase currently uses a consistent spinner pattern across pages:

```tsx
// Current pattern (TopicsPage.tsx:58-63)
{isLoading && (
  <div className="text-center py-12">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    <p className="mt-4 text-gray-600">Loading topics...</p>
  </div>
)}
```

**Pages with loading states identified:**
- `TopicsPage.tsx` - List of topic cards
- `TopicDetailPage.tsx` - Topic header, description, responses, common ground analysis
- `ProfilePage.tsx` - User profile with avatar and stats
- `UserProfilePage.tsx` - Public user profiles
- `VerificationPage.tsx` - Verification status

**Current issues:**
1. **Layout shift**: Content appears suddenly, pushing page elements around
2. **No content preview**: Users have no idea what content structure to expect
3. **Perceived slowness**: Spinners feel slower than skeleton previews

### Component Structure for Skeleton Matching

**TopicCard (131 lines):**
- Header with title (text, ~20 chars avg)
- Status badge + date row
- Description paragraph (2 lines, line-clamp-2)
- Stats row: participants, responses, diversity score (icons + text)
- Tags row (0-5 tags)
- "View Discussion" link

**TopicDetailPage sections:**
- Topic header (title + status + creator + date)
- Description (variable length paragraph)
- Responses section (list of response cards)
- Common ground analysis (agreement zones, divergence points)
- Bridging suggestions (cards with suggestions)

**Profile sections:**
- Avatar (circular, 96px or 128px)
- User name + username
- Stats row (responses count, topics count)
- Activity/history list

### Tailwind Animation Capabilities

The project's `tailwind.config.js` already defines animations:

```js
animation: {
  'fade-in': 'fadeIn 0.3s ease-in',
  'slide-in': 'slideIn 0.3s ease-out',
  'slide-up': 'slideUp 0.3s ease-out',
  'bounce-slow': 'bounce 2s infinite',
}
```

**Built-in Tailwind animations available:**
- `animate-pulse` - Opacity pulse (suitable for skeleton shimmer)
- `animate-spin` - Currently used for spinners

**Custom shimmer animation needed:**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Design System Colors

Gray palette for skeletons (from tailwind.config.js):
- `gray-100` (#f5f5f5) - Light background
- `gray-200` (#e5e5e5) - Skeleton base color
- `gray-300` (#d4d4d4) - Skeleton shimmer highlight

## Technical Approach

### Component Architecture

**Base Skeleton Primitives:**

```tsx
// Skeleton.tsx - Base component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}
```

**Composite Skeletons:**
- `SkeletonText` - Single line or multi-line text
- `SkeletonAvatar` - Circular placeholder (sm/md/lg sizes)
- `SkeletonCard` - Card-shaped placeholder with header/body
- `SkeletonList` - Repeating skeleton items

### Animation Strategy

**Recommended: Tailwind `animate-pulse`**
- Built-in, no custom CSS needed
- Performance optimized
- Subtle opacity animation (0.5 → 1 → 0.5)

**Alternative: Custom shimmer gradient**
- More visually appealing
- Requires custom keyframes
- Background gradient animation

### Accessibility Requirements

Per WCAG 2.2 AA (FR-006):

```tsx
// Required ARIA attributes
<div
  role="status"
  aria-busy="true"
  aria-label="Loading content"
>
  <span className="sr-only">Loading...</span>
  {/* Skeleton content */}
</div>
```

### Flash Prevention Strategy (FR-007)

Two approaches to prevent skeleton "flash" for fast loads:

1. **Delay approach**: Show skeleton only after 100ms delay
   ```tsx
   const [showSkeleton, setShowSkeleton] = useState(false);
   useEffect(() => {
     const timer = setTimeout(() => setShowSkeleton(true), 100);
     return () => clearTimeout(timer);
   }, []);
   ```

2. **Minimum display**: Once shown, display for at least 200ms
   ```tsx
   // Track when skeleton first appeared
   // Ensure transition doesn't happen before minDisplayTime
   ```

**Recommendation**: Use delay approach (100ms) - simpler, prevents flash without artificial delays.

### Layout Shift Prevention (FR-004)

**Strategy: Fixed dimensions matching actual content**

```tsx
// TopicCardSkeleton must match TopicCard dimensions
<div className="p-6"> {/* Matches Card padding="lg" */}
  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" /> {/* Title */}
  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" /> {/* Status/date */}
  <div className="space-y-2 mb-4">
    <div className="h-4 bg-gray-200 rounded w-full" /> {/* Description line 1 */}
    <div className="h-4 bg-gray-200 rounded w-5/6" /> {/* Description line 2 */}
  </div>
  {/* ... etc */}
</div>
```

## Integration Points

### React Query Integration

Pages already use React Query hooks with `isLoading`:

```tsx
const { data, isLoading, error } = useTopics(filters);
```

Skeleton integration pattern:

```tsx
// Before
{isLoading && <Spinner />}
{!isLoading && data && <TopicList topics={data.data} />}

// After
{isLoading && <TopicListSkeleton count={3} />}
{!isLoading && data && <TopicList topics={data.data} />}
```

### Stale Data Handling (Edge Case)

React Query provides `isFetching` for background refetches:

```tsx
// Show skeleton only on initial load, not refetches
{isLoading && <Skeleton />}  // isLoading = true only when no data

// OR show subtle loading indicator during refetch
{isFetching && !isLoading && <RefetchIndicator />}
```

## File Structure

```
frontend/src/components/ui/
├── Skeleton/
│   ├── index.ts           # Public exports
│   ├── Skeleton.tsx       # Base skeleton component
│   ├── SkeletonText.tsx   # Text line skeleton
│   ├── SkeletonAvatar.tsx # Circular avatar skeleton
│   └── Skeleton.spec.tsx  # Unit tests
│
├── skeletons/             # Composite skeletons for specific UI
│   ├── TopicCardSkeleton.tsx
│   ├── TopicDetailSkeleton.tsx
│   ├── ProfileSkeleton.tsx
│   └── ResponseSkeleton.tsx
```

## Testing Strategy

### Unit Tests (Vitest + RTL)

```tsx
describe('Skeleton', () => {
  it('renders with pulse animation by default', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveClass('animate-pulse');
  });

  it('has proper accessibility attributes', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label');
  });

  it('renders circular variant correctly', () => {
    render(<Skeleton variant="circular" />);
    expect(screen.getByRole('status')).toHaveClass('rounded-full');
  });
});
```

### E2E Tests (Playwright)

```ts
test('shows skeleton loaders during topic list loading', async ({ page }) => {
  // Throttle network
  await page.route('**/api/topics*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });

  await page.goto('/topics');

  // Verify skeletons appear
  await expect(page.locator('[data-testid="topic-card-skeleton"]')).toHaveCount(3);

  // Verify skeletons replaced by content
  await expect(page.locator('[data-testid="topic-card"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="topic-card-skeleton"]')).toHaveCount(0);
});
```

## Dependencies

No new dependencies required. Using:
- Tailwind CSS (existing) - `animate-pulse`, utility classes
- React 18 (existing) - Component composition
- Vitest + RTL (existing) - Testing

## Performance Considerations

1. **CSS-only animations**: Use Tailwind's `animate-pulse` (GPU-accelerated opacity)
2. **No JavaScript animations**: Avoid requestAnimationFrame for skeleton animation
3. **Minimal DOM**: Keep skeleton structure simple (fewer elements than actual content)
4. **Key prop stability**: Use stable keys to prevent unnecessary re-renders

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Layout shift despite matching | Medium | High | Measure actual components, use CSS containment |
| Animation jank on low-end devices | Low | Medium | Use `animate-pulse` (GPU-accelerated) |
| Inconsistent skeleton sizes | Medium | Medium | Create component-specific skeletons, not generic |
| Flash on fast connections | Medium | Low | Implement 100ms delay before showing |

## Questions Resolved

1. **Animation type?** → `animate-pulse` (built-in, performant)
2. **Where to put components?** → `components/ui/Skeleton/` for primitives, `components/ui/skeletons/` for composites
3. **How to handle fast loads?** → 100ms delay before showing skeleton
4. **Dark mode support?** → Out of scope per spec, will use existing theme system when added

## Next Steps

1. Create base Skeleton component with variants
2. Create composite skeletons for TopicCard, TopicDetail, Profile
3. Integrate with TopicsPage (highest priority)
4. Add accessibility attributes
5. Write unit and E2E tests
6. Integrate with remaining pages
