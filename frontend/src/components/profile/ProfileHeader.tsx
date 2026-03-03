/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ProfileHeader - Displays user identity and key actions
 *
 * Shows avatar, display name, verification status, and follow button.
 * Responsive layout adapts from mobile to desktop.
 */

import Avatar from '../ui/Avatar';
import { FollowButton } from '../users';
import TierBadge from '../ranking/TierBadge';
import type { UserProfile } from '../../types/user';
import type { TierLevel } from '../../types/ranking';

export interface ProfileHeaderProps {
  /** User profile data */
  user: UserProfile;
  /** User's tier level (optional) */
  tierLevel?: TierLevel;
  /** Whether viewing own profile */
  isOwnProfile?: boolean;
  /** Callback when edit button clicked (only shown for own profile) */
  onEditClick?: () => void;
  /** Callback when follow state changes */
  onFollowChange?: (isFollowing: boolean) => void;
  /** Callback when follower count clicked */
  onFollowersClick?: () => void;
  /** Callback when following count clicked */
  onFollowingClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Profile header component with avatar, name, and actions
 *
 * Displays user identity (avatar, name), verification badges, tier level,
 * and follow/edit actions. Includes follower/following counts as clickable
 * elements that open modal lists.
 *
 * @remarks
 * **Layout:**
 * - Mobile: Centered layout with stacked elements
 * - Desktop: Horizontal layout with avatar left, info center, actions right
 *
 * **Interactive Elements:**
 * - Follow button: Shows for non-own profiles, with unfollow confirmation
 * - Edit button: Shows for own profile only
 * - Follower/following counts: Clickable to open modal lists
 *
 * **Accessibility:**
 * - All interactive elements are keyboard accessible
 * - Focus-visible rings on interactive elements
 * - Disabled states properly communicated
 *
 * @example
 * ```tsx
 * // Viewing another user's profile
 * <ProfileHeader
 *   user={profileData}
 *   tierLevel="TRUSTED"
 *   isOwnProfile={false}
 *   onFollowChange={(isFollowing) => console.log('Now following:', isFollowing)}
 *   onFollowersClick={() => setShowFollowersModal(true)}
 *   onFollowingClick={() => setShowFollowingModal(true)}
 * />
 *
 * // Viewing own profile
 * <ProfileHeader
 *   user={currentUser}
 *   isOwnProfile={true}
 *   onEditClick={() => navigate('/settings/profile')}
 * />
 * ```
 */
export function ProfileHeader({
  user,
  tierLevel,
  isOwnProfile = false,
  onEditClick,
  onFollowChange,
  onFollowersClick,
  onFollowingClick,
  className = '',
}: ProfileHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-4 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar
          src={user.avatarUrl}
          alt={user.displayName}
          size="xl"
          className="w-24 h-24 sm:w-28 sm:h-28"
        />
      </div>

      {/* User Info */}
      <div className="flex-1 text-center sm:text-left">
        {/* Name and badges */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.displayName}
          </h1>
          <div className="flex items-center gap-2">
            {tierLevel && <TierBadge tier={tierLevel} size="sm" />}
            {user.verificationLevel === 'VERIFIED_HUMAN' && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                title="This user has been verified as a real human"
              >
                ✓ Verified
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-gray-600 dark:text-gray-400 mb-3 max-w-prose">{user.bio}</p>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Member since {formatDate(user.createdAt)}</span>
          {user.followerCount !== undefined && (
            <button
              type="button"
              onClick={onFollowersClick}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              disabled={!onFollowersClick}
            >
              <strong className="text-gray-900 dark:text-gray-100">{user.followerCount}</strong>{' '}
              followers
            </button>
          )}
          {user.followingCount !== undefined && (
            <button
              type="button"
              onClick={onFollowingClick}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              disabled={!onFollowingClick}
            >
              <strong className="text-gray-900 dark:text-gray-100">{user.followingCount}</strong>{' '}
              following
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {isOwnProfile ? (
          <button
            onClick={onEditClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Edit Profile
          </button>
        ) : (
          <FollowButton
            userId={user.id}
            userName={user.displayName}
            onFollowChange={onFollowChange}
            confirmUnfollow={true}
          />
        )}
      </div>
    </div>
  );
}

export default ProfileHeader;
