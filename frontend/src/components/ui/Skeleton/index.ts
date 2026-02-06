/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Skeleton component library - Base primitives for loading placeholders
 * @module components/ui/Skeleton
 */

// Components
export { default as Skeleton } from './Skeleton';
export { default as SkeletonText } from './SkeletonText';
export { default as SkeletonAvatar } from './SkeletonAvatar';

// Types
export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonAvatarProps,
  SkeletonSize,
  SkeletonAnimation,
  SkeletonVariant,
  SkeletonBaseProps,
  TopicCardSkeletonProps,
  TopicDetailSkeletonProps,
  ProfileSkeletonProps,
  ResponseSkeletonProps,
  SkeletonListProps,
} from './types';

// Constants (for advanced customization)
export {
  SKELETON_BASE_CLASSES,
  ANIMATION_CLASSES,
  TEXT_SIZE_CLASSES,
  AVATAR_SIZES,
  A11Y_PROPS,
} from './constants';
