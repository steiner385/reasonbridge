/**
 * SkeletonText component for multi-line text placeholders
 * @module components/ui/Skeleton/SkeletonText
 */

import type { SkeletonTextProps } from './types';
import {
  SKELETON_BASE_CLASSES,
  ANIMATION_CLASSES,
  TEXT_SIZE_CLASSES,
  A11Y_PROPS,
} from './constants';

/**
 * SkeletonText component that renders multiple text line placeholders
 *
 * @example
 * // Single line (default)
 * <SkeletonText />
 *
 * @example
 * // Multiple lines with shorter last line
 * <SkeletonText lines={3} lastLineWidth={60} />
 *
 * @example
 * // Larger text size
 * <SkeletonText size="lg" lines={2} />
 */
function SkeletonText({
  lines = 1,
  lastLineWidth = 75,
  size = 'md',
  animation = 'pulse',
  className = '',
  'data-testid': testId,
}: SkeletonTextProps) {
  const { height, spacing } = TEXT_SIZE_CLASSES[size];
  const animationClass = ANIMATION_CLASSES[animation];

  // Generate array of line indices
  const lineIndices = Array.from({ length: lines }, (_, i) => i);

  return (
    <div {...A11Y_PROPS} className={`${spacing} ${className}`.trim()} data-testid={testId}>
      <span className="sr-only">Loading text...</span>
      {lineIndices.map((index) => {
        // Last line gets the shorter width
        const isLastLine = index === lines - 1;
        const lineWidth = isLastLine && lines > 1 ? `${lastLineWidth}%` : '100%';

        return (
          <div
            key={index}
            className={`${SKELETON_BASE_CLASSES} ${animationClass} ${height}`}
            style={{ width: lineWidth }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export default SkeletonText;
