/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ProfileSkeleton - Loading placeholder for profile pages
 * @module components/ui/skeletons/ProfileSkeleton
 *
 * Matches the layout of both ProfilePage.tsx and UserProfilePage.tsx
 */

import Card, { CardHeader, CardBody } from '../Card';
import { Skeleton, SkeletonAvatar } from '../Skeleton';
import type { ProfileSkeletonProps } from '../Skeleton/types';
import { A11Y_PROPS } from '../Skeleton/constants';

/**
 * ProfileSkeleton renders a loading placeholder for profile pages
 * with header, trust scores, and optional activity sections.
 *
 * @example
 * // Basic usage
 * <ProfileSkeleton />
 *
 * @example
 * // Without activity section
 * <ProfileSkeleton showActivity={false} />
 */
function ProfileSkeleton({
  showActivity = true,
  className = '',
  'data-testid': testId = 'profile-skeleton',
}: ProfileSkeletonProps) {
  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`.trim()} data-testid={testId}>
      {/* Profile Header Card */}
      <Card data-testid={`${testId}-header`}>
        <CardHeader>
          <Skeleton variant="text" width={150} height={28} data-testid={`${testId}-title`} />
        </CardHeader>
        <CardBody>
          <div className="space-y-4" {...A11Y_PROPS}>
            {/* Avatar + Name/Email row */}
            <div className="flex items-center gap-4">
              <SkeletonAvatar size="xl" data-testid={`${testId}-avatar`} />
              <div className="flex-1">
                <Skeleton
                  variant="text"
                  width="40%"
                  height={24}
                  className="mb-2"
                  data-testid={`${testId}-name`}
                />
                <Skeleton variant="text" width="30%" height={16} data-testid={`${testId}-email`} />
              </div>
            </div>

            {/* Info grid: Verification, Status, Member Since */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              {/* Verification Level */}
              <div>
                <Skeleton variant="text" width={100} height={14} className="mb-2" />
                <Skeleton variant="text" width={120} height={20} />
              </div>
              {/* Status */}
              <div>
                <Skeleton variant="text" width={50} height={14} className="mb-2" />
                <Skeleton variant="text" width={80} height={20} />
              </div>
              {/* Member Since */}
              <div>
                <Skeleton variant="text" width={90} height={14} className="mb-2" />
                <Skeleton variant="text" width={140} height={20} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Trust Scores Card */}
      <Card data-testid={`${testId}-trust-scores`}>
        <CardHeader>
          <Skeleton variant="text" width={120} height={24} />
        </CardHeader>
        <CardBody>
          <div className="space-y-4" {...A11Y_PROPS}>
            {/* Ability */}
            <div data-testid={`${testId}-trust-ability`}>
              <div className="flex justify-between items-center mb-2">
                <Skeleton variant="text" width={60} height={14} />
                <Skeleton variant="text" width={40} height={14} />
              </div>
              <Skeleton variant="rectangular" width="100%" height={8} className="rounded-full" />
            </div>

            {/* Benevolence */}
            <div data-testid={`${testId}-trust-benevolence`}>
              <div className="flex justify-between items-center mb-2">
                <Skeleton variant="text" width={90} height={14} />
                <Skeleton variant="text" width={40} height={14} />
              </div>
              <Skeleton variant="rectangular" width="100%" height={8} className="rounded-full" />
            </div>

            {/* Integrity */}
            <div data-testid={`${testId}-trust-integrity`}>
              <div className="flex justify-between items-center mb-2">
                <Skeleton variant="text" width={70} height={14} />
                <Skeleton variant="text" width={40} height={14} />
              </div>
              <Skeleton variant="rectangular" width="100%" height={8} className="rounded-full" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Activity Stats Card (optional) */}
      {showActivity && (
        <Card data-testid={`${testId}-activity`}>
          <CardHeader>
            <Skeleton variant="text" width={80} height={24} />
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" {...A11Y_PROPS}>
              {/* Topics */}
              <div className="text-center">
                <Skeleton variant="text" width={40} height={28} className="mx-auto mb-1" />
                <Skeleton variant="text" width={50} height={14} className="mx-auto" />
              </div>
              {/* Responses */}
              <div className="text-center">
                <Skeleton variant="text" width={40} height={28} className="mx-auto mb-1" />
                <Skeleton variant="text" width={70} height={14} className="mx-auto" />
              </div>
              {/* Followers */}
              <div className="text-center">
                <Skeleton variant="text" width={40} height={28} className="mx-auto mb-1" />
                <Skeleton variant="text" width={60} height={14} className="mx-auto" />
              </div>
              {/* Following */}
              <div className="text-center">
                <Skeleton variant="text" width={40} height={28} className="mx-auto mb-1" />
                <Skeleton variant="text" width={60} height={14} className="mx-auto" />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default ProfileSkeleton;
