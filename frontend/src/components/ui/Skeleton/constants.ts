/**
 * Skeleton component constants and style mappings
 * @module components/ui/Skeleton/constants
 */

import type { SkeletonAnimation, SkeletonSize } from './types';

/**
 * Base Tailwind classes for skeleton elements
 */
export const SKELETON_BASE_CLASSES = 'bg-gray-200 dark:bg-gray-700 rounded';

/**
 * Animation classes mapped by animation type
 */
export const ANIMATION_CLASSES: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  shimmer:
    'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/10 before:to-transparent',
  none: '',
};

/**
 * Text size mappings for SkeletonText component
 */
export const TEXT_SIZE_CLASSES: Record<SkeletonSize, { height: string; spacing: string }> = {
  sm: { height: 'h-3', spacing: 'space-y-2' },
  md: { height: 'h-4', spacing: 'space-y-2' },
  lg: { height: 'h-5', spacing: 'space-y-3' },
  xl: { height: 'h-6', spacing: 'space-y-3' },
};

/**
 * Avatar size mappings for SkeletonAvatar component
 */
export const AVATAR_SIZES: Record<SkeletonSize, string> = {
  sm: 'w-8 h-8', // 32px
  md: 'w-12 h-12', // 48px
  lg: 'w-16 h-16', // 64px
  xl: 'w-24 h-24', // 96px
};

/**
 * Accessibility attributes for skeleton containers
 * Applied to skeleton wrapper elements for screen reader support
 */
export const A11Y_PROPS = {
  role: 'status' as const,
  'aria-busy': true,
  'aria-label': 'Loading content',
};
