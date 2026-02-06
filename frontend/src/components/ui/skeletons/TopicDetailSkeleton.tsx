/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TopicDetailSkeleton - Loading placeholder for topic detail page
 * @module components/ui/skeletons/TopicDetailSkeleton
 */

import Card, { CardHeader, CardBody } from '../Card';
import { Skeleton, SkeletonText } from '../Skeleton';
import type { TopicDetailSkeletonProps } from '../Skeleton/types';
import { A11Y_PROPS } from '../Skeleton/constants';
import ResponseSkeleton from './ResponseSkeleton';

/**
 * TopicDetailSkeleton renders a loading placeholder for the topic detail page
 * with all sections: header, description, stats, responses, and analysis.
 *
 * @example
 * // Basic usage
 * <TopicDetailSkeleton />
 *
 * @example
 * // Without responses section
 * <TopicDetailSkeleton showResponses={false} />
 */
function TopicDetailSkeleton({
  showResponses = true,
  showCommonGround = true,
  className = '',
  'data-testid': testId = 'topic-detail-skeleton',
}: TopicDetailSkeletonProps) {
  return (
    <div className={`max-w-4xl mx-auto ${className}`.trim()} data-testid={testId}>
      {/* Back Navigation skeleton */}
      <div className="mb-6">
        <Skeleton variant="text" width={120} height={20} />
      </div>

      {/* Main Topic Card */}
      <Card variant="elevated" padding="lg" className="mb-6" data-testid={`${testId}-main-card`}>
        <CardHeader title="">
          <div {...A11Y_PROPS}>
            {/* Title + Status row */}
            <div className="flex items-center justify-between mb-2">
              <Skeleton variant="text" width="60%" height={28} data-testid={`${testId}-title`} />
              <Skeleton
                variant="rectangular"
                width={70}
                height={28}
                className="rounded"
                data-testid={`${testId}-status`}
              />
            </div>
            {/* Date row */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <Skeleton variant="rectangular" width={16} height={16} />
                <Skeleton variant="text" width={120} height={14} />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton variant="rectangular" width={16} height={16} />
                <Skeleton variant="text" width={100} height={14} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {/* Description */}
          <div className="mb-6">
            <SkeletonText
              lines={4}
              lastLineWidth={80}
              size="lg"
              data-testid={`${testId}-description`}
            />
          </div>

          {/* Stats Grid - 4 items */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            data-testid={`${testId}-stats`}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton variant="rectangular" width={20} height={20} />
                  <Skeleton variant="text" width={80} height={14} />
                </div>
                <Skeleton variant="text" width={50} height={28} className="mt-2" />
              </div>
            ))}
          </div>

          {/* Tags skeleton */}
          <div className="mb-6">
            <Skeleton variant="text" width={40} height={14} className="mb-2" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  width={60 + i * 10}
                  height={26}
                  className="rounded-full"
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Skeleton variant="rectangular" width={140} height={44} className="rounded-lg" />
            <Skeleton variant="rectangular" width={100} height={44} className="rounded-lg" />
          </div>
        </CardBody>
      </Card>

      {/* Common Ground Analysis Section skeleton */}
      {showCommonGround && (
        <Card
          variant="default"
          padding="lg"
          className="mb-6"
          data-testid={`${testId}-common-ground`}
        >
          <div className="mb-4">
            <Skeleton variant="text" width={180} height={24} />
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <Skeleton variant="text" width={120} height={16} className="mb-2" />
              <SkeletonText lines={2} lastLineWidth={90} size="md" />
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <Skeleton variant="text" width={140} height={16} className="mb-2" />
              <SkeletonText lines={2} lastLineWidth={85} size="md" />
            </div>
          </div>
        </Card>
      )}

      {/* Responses Section skeleton - show 3 response skeletons */}
      {showResponses && (
        <div className="space-y-4" data-testid={`${testId}-responses`}>
          {[1, 2, 3].map((i) => (
            <ResponseSkeleton key={i} data-testid={`${testId}-response-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TopicDetailSkeleton;
