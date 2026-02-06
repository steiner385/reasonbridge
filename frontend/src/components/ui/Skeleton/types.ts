/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Skeleton component type definitions
 * @module components/ui/Skeleton/types
 */

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

/**
 * Props for circular avatar skeletons
 */
export interface SkeletonAvatarProps extends SkeletonBaseProps {
  /** Size variant (default: 'md') */
  size?: SkeletonSize;
}

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

/**
 * Props for Response skeleton
 */
export interface ResponseSkeletonProps extends SkeletonBaseProps {
  /** Show author avatar */
  showAvatar?: boolean;
}
