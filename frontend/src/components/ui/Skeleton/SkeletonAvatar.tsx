/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SkeletonAvatar component for circular avatar placeholders
 * @module components/ui/Skeleton/SkeletonAvatar
 */

import type { SkeletonAvatarProps } from './types';
import { SKELETON_BASE_CLASSES, ANIMATION_CLASSES, AVATAR_SIZES, A11Y_PROPS } from './constants';

/**
 * SkeletonAvatar component that renders a circular avatar placeholder
 *
 * @example
 * // Default medium size (48px)
 * <SkeletonAvatar />
 *
 * @example
 * // Small avatar (32px)
 * <SkeletonAvatar size="sm" />
 *
 * @example
 * // Extra large avatar (96px)
 * <SkeletonAvatar size="xl" />
 */
function SkeletonAvatar({
  size = 'md',
  animation = 'pulse',
  className = '',
  'data-testid': testId,
}: SkeletonAvatarProps) {
  const sizeClass = AVATAR_SIZES[size];
  const animationClass = ANIMATION_CLASSES[animation];

  return (
    <div
      {...A11Y_PROPS}
      className={`${SKELETON_BASE_CLASSES} ${animationClass} rounded-full ${sizeClass} ${className}`.trim()}
      data-testid={testId}
    >
      <span className="sr-only">Loading avatar...</span>
    </div>
  );
}

export default SkeletonAvatar;
