# Data Model: Skeleton Loaders

**Feature Branch**: `002-skeleton-loaders`
**Phase**: 1 - Design
**Date**: 2026-01-25

## Overview

This feature is purely presentational and does not require database changes or new API endpoints. The data model focuses on TypeScript interfaces for the skeleton component system.

## Component Interfaces

### Base Skeleton Props

```typescript
// frontend/src/components/ui/Skeleton/types.ts

/**
 * Size variants for skeleton components
 */
export type SkeletonSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Animation variants for loading effect
 */
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'none';

/**
 * Shape variants for skeleton elements
 */
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';

/**
 * Base props for all skeleton components
 */
export interface SkeletonBaseProps {
  /** Additional CSS classes */
  className?: string;
  /** Animation type (default: 'pulse') */
  animation?: SkeletonAnimation;
  /** Test ID for E2E testing */
  'data-testid'?: string;
}

/**
 * Props for the base Skeleton component
 */
export interface SkeletonProps extends SkeletonBaseProps {
  /** Shape variant (default: 'rectangular') */
  variant?: SkeletonVariant;
  /** Width - CSS value or number for pixels */
  width?: string | number;
  /** Height - CSS value or number for pixels */
  height?: string | number;
}
```

### Text Skeleton Props

```typescript
/**
 * Props for multi-line text skeletons
 */
export interface SkeletonTextProps extends SkeletonBaseProps {
  /** Number of lines to render (default: 1) */
  lines?: number;
  /** Width of the last line as percentage (default: 75) */
  lastLineWidth?: number;
  /** Line height/spacing variant */
  size?: SkeletonSize;
}
```

### Avatar Skeleton Props

```typescript
/**
 * Props for circular avatar skeletons
 */
export interface SkeletonAvatarProps extends SkeletonBaseProps {
  /** Size variant (default: 'md') */
  size?: SkeletonSize;
}

/**
 * Size mappings for avatar skeleton
 */
export const AVATAR_SIZES: Record<SkeletonSize, string> = {
  sm: 'w-8 h-8',    // 32px
  md: 'w-12 h-12',  // 48px
  lg: 'w-16 h-16',  // 64px
  xl: 'w-24 h-24',  // 96px
};
```

### Composite Skeleton Props

```typescript
/**
 * Props for TopicCard skeleton
 */
export interface TopicCardSkeletonProps extends SkeletonBaseProps {
  /** Whether to show tags section */
  showTags?: boolean;
}

/**
 * Props for list of skeleton items
 */
export interface SkeletonListProps extends SkeletonBaseProps {
  /** Number of skeleton items to show (default: 3) */
  count?: number;
  /** Render function for each skeleton item */
  renderItem?: (index: number) => React.ReactNode;
}

/**
 * Props for TopicDetail page skeleton
 */
export interface TopicDetailSkeletonProps extends SkeletonBaseProps {
  /** Show responses section skeleton */
  showResponses?: boolean;
  /** Show common ground section skeleton */
  showCommonGround?: boolean;
}

/**
 * Props for Profile page skeleton
 */
export interface ProfileSkeletonProps extends SkeletonBaseProps {
  /** Show activity/history section */
  showActivity?: boolean;
}
```

## Component Hierarchy

```
Skeleton (Base)
├── SkeletonText
├── SkeletonAvatar
└── SkeletonCard

Composite Skeletons (use base components)
├── TopicCardSkeleton
├── TopicDetailSkeleton
│   ├── TopicHeaderSkeleton
│   ├── ResponseListSkeleton
│   └── CommonGroundSkeleton
├── ProfileSkeleton
│   ├── ProfileHeaderSkeleton
│   └── ActivityListSkeleton
└── ResponseSkeleton
```

## Style Constants

```typescript
// frontend/src/components/ui/Skeleton/constants.ts

/**
 * Base Tailwind classes for skeleton elements
 */
export const SKELETON_BASE_CLASSES = 'bg-gray-200 rounded';

/**
 * Animation classes
 */
export const ANIMATION_CLASSES: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  shimmer: 'animate-shimmer', // Requires custom keyframes
  none: '',
};

/**
 * Text size mappings
 */
export const TEXT_SIZE_CLASSES: Record<SkeletonSize, { height: string; spacing: string }> = {
  sm: { height: 'h-3', spacing: 'space-y-2' },
  md: { height: 'h-4', spacing: 'space-y-2' },
  lg: { height: 'h-5', spacing: 'space-y-3' },
  xl: { height: 'h-6', spacing: 'space-y-3' },
};

/**
 * Accessibility attributes for skeleton containers
 */
export const A11Y_PROPS = {
  role: 'status' as const,
  'aria-busy': true,
  'aria-label': 'Loading content',
};
```

## No Database Changes

This feature:
- Does not add new database tables
- Does not modify existing schemas
- Does not add new API endpoints
- Is purely a frontend presentation layer enhancement

## State Management

No new state management required. Skeleton visibility is derived from existing React Query loading states:

```typescript
// Existing pattern - no changes needed
const { data, isLoading, error } = useTopics(filters);

// Skeleton visibility
{isLoading && <TopicCardSkeleton />}
```

## Test Data Types

```typescript
/**
 * Mock props for testing skeleton components
 */
export const mockSkeletonProps: SkeletonProps = {
  variant: 'rectangular',
  width: '100%',
  height: 20,
  animation: 'pulse',
  'data-testid': 'test-skeleton',
};

export const mockTextSkeletonProps: SkeletonTextProps = {
  lines: 3,
  lastLineWidth: 60,
  size: 'md',
  'data-testid': 'test-skeleton-text',
};
```
