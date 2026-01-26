/**
 * Base Skeleton component for loading placeholders
 * @module components/ui/Skeleton/Skeleton
 */

import type { SkeletonProps } from './types';
import { SKELETON_BASE_CLASSES, ANIMATION_CLASSES, A11Y_PROPS } from './constants';

/**
 * Base Skeleton component that renders a loading placeholder
 *
 * @example
 * // Rectangular skeleton (default)
 * <Skeleton width="100%" height={20} />
 *
 * @example
 * // Circular skeleton for avatars
 * <Skeleton variant="circular" width={48} height={48} />
 *
 * @example
 * // Text line skeleton
 * <Skeleton variant="text" width="75%" />
 */
function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className = '',
  'data-testid': testId,
}: SkeletonProps) {
  // Determine shape classes based on variant
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  // Build style object for custom dimensions
  const style: React.CSSProperties = {};
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  // For text variant without explicit height, use default text height
  if (variant === 'text' && height === undefined) {
    style.height = '1em';
  }

  const animationClass = ANIMATION_CLASSES[animation];
  const shapeClass = variantClasses[variant];

  return (
    <div
      {...A11Y_PROPS}
      className={`${SKELETON_BASE_CLASSES} ${animationClass} ${shapeClass} ${className}`.trim()}
      style={style}
      data-testid={testId}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Skeleton;
