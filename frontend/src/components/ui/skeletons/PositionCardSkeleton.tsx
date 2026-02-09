/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Skeleton, SkeletonText } from '../Skeleton';

/**
 * Skeleton loader for position cards in discussion simulator
 * Shows loading state while AI generates opposing positions
 */
export function PositionCardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading positions">
      {/* Position A Card */}
      <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton width="24px" height="24px" variant="circular" />
          <Skeleton width="120px" height="20px" />
        </div>
        <SkeletonText lines={2} size="sm" />
        <div className="mt-3">
          <Skeleton width="140px" height="16px" />
        </div>
      </div>

      {/* Position B Card */}
      <div className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton width="24px" height="24px" variant="circular" />
          <Skeleton width="120px" height="20px" />
        </div>
        <SkeletonText lines={2} size="sm" />
        <div className="mt-3">
          <Skeleton width="140px" height="16px" />
        </div>
      </div>
    </div>
  );
}
