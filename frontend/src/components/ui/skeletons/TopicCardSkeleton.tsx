/**
 * TopicCardSkeleton - Loading placeholder matching TopicCard layout
 * @module components/ui/skeletons/TopicCardSkeleton
 */

import Card, { CardHeader, CardBody } from '../Card';
import { Skeleton, SkeletonText } from '../Skeleton';
import type { TopicCardSkeletonProps } from '../Skeleton/types';
import { A11Y_PROPS } from '../Skeleton/constants';

/**
 * TopicCardSkeleton renders a loading placeholder that matches the TopicCard layout
 * to prevent layout shift when content loads.
 *
 * @example
 * // Basic usage
 * <TopicCardSkeleton />
 *
 * @example
 * // With tags section
 * <TopicCardSkeleton showTags />
 *
 * @example
 * // List of skeletons
 * {[1, 2, 3].map(i => <TopicCardSkeleton key={i} />)}
 */
function TopicCardSkeleton({
  showTags = true,
  className = '',
  'data-testid': testId = 'topic-card-skeleton',
}: TopicCardSkeletonProps) {
  return (
    <Card variant="default" padding="lg" className={className} data-testid={testId}>
      {/* CardHeader with title skeleton */}
      <CardHeader title="">
        <div {...A11Y_PROPS}>
          {/* Title - matches h3 text size */}
          <Skeleton
            variant="text"
            width="75%"
            height={24}
            className="mb-2"
            data-testid={`${testId}-title`}
          />
          {/* Status badge + date row */}
          <div className="flex items-center gap-2 mt-1">
            <Skeleton
              variant="rectangular"
              width={60}
              height={22}
              className="rounded"
              data-testid={`${testId}-status`}
            />
            <Skeleton variant="text" width={80} height={16} data-testid={`${testId}-date`} />
          </div>
        </div>
      </CardHeader>

      <CardBody>
        {/* Description - 2 lines like line-clamp-2 */}
        <div className="mb-4">
          <SkeletonText
            lines={2}
            lastLineWidth={85}
            size="md"
            data-testid={`${testId}-description`}
          />
        </div>

        {/* Stats row - participants, responses, diversity */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Participants stat */}
          <div className="flex items-center gap-1">
            <Skeleton variant="rectangular" width={16} height={16} />
            <Skeleton variant="text" width={90} height={14} />
          </div>
          {/* Responses stat */}
          <div className="flex items-center gap-1">
            <Skeleton variant="rectangular" width={16} height={16} />
            <Skeleton variant="text" width={80} height={14} />
          </div>
          {/* Diversity score stat */}
          <div className="flex items-center gap-1">
            <Skeleton variant="rectangular" width={16} height={16} />
            <Skeleton variant="text" width={75} height={14} />
          </div>
        </div>

        {/* Tags row - show 3 tag placeholders */}
        {showTags && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Skeleton variant="rectangular" width={50} height={22} className="rounded" />
            <Skeleton variant="rectangular" width={65} height={22} className="rounded" />
            <Skeleton variant="rectangular" width={45} height={22} className="rounded" />
          </div>
        )}

        {/* "View Discussion" link */}
        <Skeleton variant="text" width={120} height={14} data-testid={`${testId}-link`} />
      </CardBody>
    </Card>
  );
}

export default TopicCardSkeleton;
