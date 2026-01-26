/**
 * ResponseSkeleton - Loading placeholder for response cards
 * @module components/ui/skeletons/ResponseSkeleton
 */

import Card, { CardBody } from '../Card';
import { Skeleton, SkeletonText, SkeletonAvatar } from '../Skeleton';
import type { ResponseSkeletonProps } from '../Skeleton/types';

/**
 * ResponseSkeleton renders a loading placeholder for response cards
 *
 * @example
 * // Basic usage
 * <ResponseSkeleton />
 *
 * @example
 * // Without avatar
 * <ResponseSkeleton showAvatar={false} />
 */
function ResponseSkeleton({
  showAvatar = true,
  className = '',
  'data-testid': testId = 'response-skeleton',
}: ResponseSkeletonProps) {
  return (
    <Card variant="default" padding="md" className={className} data-testid={testId}>
      <CardBody>
        <div className="flex gap-4">
          {/* Avatar */}
          {showAvatar && (
            <div className="flex-shrink-0">
              <SkeletonAvatar size="md" data-testid={`${testId}-avatar`} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author row - name + timestamp */}
            <div className="flex items-center gap-2 mb-2">
              <Skeleton variant="text" width={120} height={16} data-testid={`${testId}-author`} />
              <Skeleton variant="text" width={80} height={14} data-testid={`${testId}-timestamp`} />
            </div>

            {/* Response content - 3 lines */}
            <SkeletonText
              lines={3}
              lastLineWidth={70}
              size="md"
              data-testid={`${testId}-content`}
            />

            {/* Action buttons row */}
            <div className="flex items-center gap-4 mt-3">
              <Skeleton variant="rectangular" width={60} height={24} className="rounded" />
              <Skeleton variant="rectangular" width={60} height={24} className="rounded" />
              <Skeleton variant="rectangular" width={50} height={24} className="rounded" />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default ResponseSkeleton;
