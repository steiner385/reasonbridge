/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * UserProfilePage - Public profile page for viewing another user's profile
 *
 * Displays user identity, trust indicators, activity statistics, and bio.
 * Privacy-aware: respects the target user's privacy settings.
 *
 * @remarks
 * **Responsive Layout:**
 * - Mobile: Single column, stacked sections
 * - Tablet: Two-column layout for trust/stats
 * - Desktop: Full-width with sidebar potential
 *
 * **Privacy:**
 * - Uses useCanViewSection hook to check privacy settings
 * - Shows privacy messages for restricted sections
 */

import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../lib/useUser';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useCanViewSection } from '../../hooks/useCanViewSection';
import {
  useProfileContributions,
  useContributionStats,
  flattenContributions,
} from '../../hooks/useProfileContributions';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import ProfileSkeleton from '../../components/ui/skeletons/ProfileSkeleton';
import {
  ProfileHeader,
  ProfileStats,
  ProfileBio,
  ContributionFilters,
  ContributionList,
  TrustSection,
  ExpertiseSection,
  PrivacyRestrictedMessage,
  FollowersModal,
  FollowingModal,
} from '../../components/profile';
import { UserNotFound } from '../../components/users';
import type { TierLevel, TopicExpertise } from '../../types/ranking';
import type { ContributionType } from '../../types/contribution';
import { UserStatus } from '../../types/user';

function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, isError, error } = useUser(id);
  const showSkeleton = useDelayedLoading(isLoading);

  // Contribution filter state
  const [contributionFilter, setContributionFilter] = useState<ContributionType | 'ALL'>('ALL');

  // Follower/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Query client for optimistic updates
  const queryClient = useQueryClient();

  // Privacy-aware section visibility
  // NOTE: privacySettings would come from user profile endpoint when available
  const { visibility, isOwner } = useCanViewSection({
    targetUserId: id || '',
    privacySettings: undefined, // TODO: Add when user endpoint returns privacy settings
  });

  // Local follower count adjustment (for optimistic UI update)
  const [followerCountAdjustment, setFollowerCountAdjustment] = useState(0);

  // Handle follow state change - update follower count optimistically
  const handleFollowChange = useCallback(
    (isFollowing: boolean) => {
      // Adjust follower count based on follow state change
      setFollowerCountAdjustment((prev) => {
        // If now following and we were not before (or vice versa)
        return isFollowing ? prev + 1 : prev - 1;
      });

      // Also invalidate user query to get fresh data eventually
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
    [queryClient, id],
  );

  // Fetch contributions and stats
  const contributionsQuery = useProfileContributions(id, {
    type: contributionFilter === 'ALL' ? undefined : contributionFilter,
    limit: 20,
  });
  const { data: contributionStats } = useContributionStats(id);

  // Flatten paginated contributions
  const contributions = flattenContributions(contributionsQuery.data);

  // Loading state
  if (showSkeleton) {
    return <ProfileSkeleton />;
  }

  // Error state
  if (isError) {
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred while loading this profile.';

    // Check if it's a 404 error
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return <UserNotFound />;
    }

    return (
      <UserNotFound title="Unable to Load Profile" message={errorMessage} showHomeButton={true} />
    );
  }

  // User not found
  if (!user) {
    return <UserNotFound />;
  }

  // Suspended account handling (T077)
  if (user.status === UserStatus.SUSPENDED) {
    return (
      <UserNotFound
        title="Account Suspended"
        message="This user's account has been temporarily suspended. Their profile is not available at this time."
        showHomeButton={true}
        showSearchButton={true}
      />
    );
  }

  // Banned account handling (T078)
  if (user.status === UserStatus.BANNED) {
    return (
      <UserNotFound
        title="Account Unavailable"
        message="This user's account is no longer available on reasonBridge."
        showHomeButton={true}
        showSearchButton={true}
      />
    );
  }

  // TODO: Fetch tier level from ranking service when available
  const tierLevel: TierLevel | undefined = undefined;

  // Mock expertise data for now (would come from API)
  const topExpertise: TopicExpertise[] = [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header with avatar, name, badges, and follow button */}
      <Card>
        <CardBody>
          <ProfileHeader
            user={{
              ...user,
              // Apply optimistic follower count adjustment
              followerCount:
                user.followerCount !== undefined
                  ? Math.max(0, user.followerCount + followerCountAdjustment)
                  : undefined,
            }}
            tierLevel={tierLevel}
            isOwnProfile={isOwner}
            onFollowChange={handleFollowChange}
            onFollowersClick={() => setShowFollowersModal(true)}
            onFollowingClick={() => setShowFollowingModal(true)}
          />
        </CardBody>
      </Card>

      {/* Two-column layout for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">About</h2>
            </CardHeader>
            <CardBody>
              <ProfileBio bio={user.bio} isOwnProfile={isOwner} />
            </CardBody>
          </Card>

          {/* Activity Stats */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity</h2>
            </CardHeader>
            <CardBody>
              <ProfileStats
                topicCount={user.topicCount}
                responseCount={user.responseCount}
                isVisible={visibility.activityHistory}
                privacyMessage="Follow this user to see their activity history"
              />
            </CardBody>
          </Card>

          {/* Contribution History */}
          {visibility.activityHistory && (
            <Card data-testid="contribution-history">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Contribution History
                  </h2>
                  <ContributionFilters
                    selectedType={contributionFilter}
                    onTypeChange={setContributionFilter}
                    counts={contributionStats}
                    disabled={contributionsQuery.isLoading}
                  />
                </div>
              </CardHeader>
              <CardBody>
                <ContributionList
                  contributions={contributions}
                  isLoading={contributionsQuery.isLoading || contributionsQuery.isFetchingNextPage}
                  isError={contributionsQuery.isError}
                  errorMessage={
                    contributionsQuery.error instanceof Error
                      ? contributionsQuery.error.message
                      : undefined
                  }
                  hasMore={contributionsQuery.hasNextPage}
                  onLoadMore={() => contributionsQuery.fetchNextPage()}
                  selectedType={contributionFilter}
                  isOwnProfile={isOwner}
                />
              </CardBody>
            </Card>
          )}

          {/* Privacy message for hidden activity */}
          {!visibility.activityHistory && (
            <Card>
              <CardBody>
                <PrivacyRestrictedMessage
                  restrictionType="FOLLOWERS_ONLY"
                  sectionName="Contribution history"
                  showFollowSuggestion={true}
                />
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Trust Score */}
          <Card>
            <CardHeader className="hidden md:block">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trust Score
              </h2>
            </CardHeader>
            <CardBody>
              <TrustSection
                user={user}
                isVisible={visibility.detailedTrustScores}
                privacyMessage="Follow this user to see their detailed trust scores"
              />
            </CardBody>
          </Card>

          {/* Expertise Badges */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Expertise</h2>
            </CardHeader>
            <CardBody>
              <ExpertiseSection
                expertise={topExpertise}
                maxDisplay={5}
                showSeeAll={topExpertise.length > 5}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Followers Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userId={id || ''}
        userName={user.displayName}
        isVisible={visibility.followerList}
        restrictionType="FOLLOWERS_ONLY"
      />

      {/* Following Modal */}
      <FollowingModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userId={id || ''}
        userName={user.displayName}
        isVisible={visibility.followingList}
        restrictionType="FOLLOWERS_ONLY"
      />
    </div>
  );
}

export default UserProfilePage;
