/**
 * Skeleton Loaders - Composite skeleton components for pages
 * @module components/ui/skeletons
 *
 * These are page-specific skeleton compositions built from base primitives.
 * Use these in page components during loading states.
 *
 * Base primitives are exported from '../Skeleton':
 * - Skeleton (base shapes)
 * - SkeletonText (multi-line text)
 * - SkeletonAvatar (circular avatar)
 *
 * @example
 * import { TopicCardSkeleton, ProfileSkeleton } from '@/components/ui/skeletons';
 *
 * // In TopicsPage
 * if (isLoading) {
 *   return [1, 2, 3].map(i => <TopicCardSkeleton key={i} />);
 * }
 */

export { default as TopicCardSkeleton } from './TopicCardSkeleton';
export { default as TopicDetailSkeleton } from './TopicDetailSkeleton';
export { default as ResponseSkeleton } from './ResponseSkeleton';
export { default as ProfileSkeleton } from './ProfileSkeleton';

// Re-export types for convenience
export type {
  TopicCardSkeletonProps,
  TopicDetailSkeletonProps,
  ResponseSkeletonProps,
  ProfileSkeletonProps,
} from '../Skeleton/types';
