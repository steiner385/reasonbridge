/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useCanViewSection - Hook for checking profile section visibility
 *
 * Determines if the current user can view specific sections of another user's profile
 * based on privacy settings and follow relationship.
 */

import { useMemo } from 'react';
import type { PrivacySettings, ProfileVisibility } from '../types/user';
import { useAuth } from './useAuth';
import { useFollow } from './useFollow';

/**
 * Profile sections that can have privacy settings
 */
export type ProfileSection =
  | 'activityHistory'
  | 'detailedTrustScores'
  | 'followerList'
  | 'followingList';

/**
 * Options for useCanViewSection hook
 */
export interface UseCanViewSectionOptions {
  /** Target user's ID */
  targetUserId: string;
  /** Target user's privacy settings (must be fetched separately) */
  privacySettings?: PrivacySettings | null;
}

/**
 * Result of useCanViewSection hook
 */
export interface UseCanViewSectionResult {
  /** Check if a specific section is visible */
  canView: (section: ProfileSection) => boolean;
  /** Object with visibility status for all sections */
  visibility: Record<ProfileSection, boolean>;
  /** Whether the viewer is the profile owner */
  isOwner: boolean;
  /** Whether the viewer is following the target user */
  isFollowing: boolean;
  /** Whether visibility check is still loading */
  isLoading: boolean;
}

/**
 * Hook for checking if the current user can view specific profile sections
 *
 * @param options - Target user ID and their privacy settings
 * @returns Object with visibility check functions and state
 *
 * @remarks
 * **Privacy Rules:**
 * - PUBLIC: Visible to everyone
 * - FOLLOWERS_ONLY: Visible to followers and the owner
 * - PRIVATE: Visible only to the owner
 *
 * **Note:** Trust scores can only be PUBLIC or FOLLOWERS_ONLY (never PRIVATE)
 * for platform integrity reasons.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { canView, isOwner } = useCanViewSection({
 *   targetUserId: user.id,
 *   privacySettings: user.privacySettings,
 * });
 *
 * return (
 *   <ProfilePage>
 *     {canView('activityHistory') && (
 *       <ContributionList userId={user.id} />
 *     )}
 *     {canView('followerList') && (
 *       <FollowersList userId={user.id} />
 *     )}
 *     {!canView('followerList') && (
 *       <PrivacyMessage section="Followers" />
 *     )}
 *   </ProfilePage>
 * );
 * ```
 */
export function useCanViewSection(options: UseCanViewSectionOptions): UseCanViewSectionResult {
  const { targetUserId, privacySettings } = options;

  // Get current user info
  const { user: currentUser, isAuthenticated } = useAuth();

  // Check if current user is following target user
  const { isFollowing, isLoading: isFollowLoading } = useFollow(targetUserId, false);

  // Check if viewing own profile
  const isOwner = useMemo(() => {
    return isAuthenticated && currentUser?.id === targetUserId;
  }, [isAuthenticated, currentUser?.id, targetUserId]);

  /**
   * Check if a specific section is visible based on privacy settings
   */
  const canView = useMemo(() => {
    return (section: ProfileSection): boolean => {
      // Owner can always view all sections
      if (isOwner) {
        return true;
      }

      // If no privacy settings, default to public
      if (!privacySettings) {
        return true;
      }

      const visibility = privacySettings[section] as ProfileVisibility;

      // PUBLIC is visible to everyone
      if (visibility === 'PUBLIC') {
        return true;
      }

      // PRIVATE is only visible to owner (already handled above)
      if (visibility === 'PRIVATE') {
        return false;
      }

      // FOLLOWERS_ONLY requires being logged in and following
      if (visibility === 'FOLLOWERS_ONLY') {
        return isAuthenticated && isFollowing;
      }

      // Default to not visible for unknown states
      return false;
    };
  }, [isOwner, privacySettings, isAuthenticated, isFollowing]);

  // Pre-compute visibility for all sections
  const visibility = useMemo((): Record<ProfileSection, boolean> => {
    return {
      activityHistory: canView('activityHistory'),
      detailedTrustScores: canView('detailedTrustScores'),
      followerList: canView('followerList'),
      followingList: canView('followingList'),
    };
  }, [canView]);

  return {
    canView,
    visibility,
    isOwner,
    isFollowing,
    isLoading: isFollowLoading,
  };
}

/**
 * Message component for privacy-restricted content
 * This is a utility type for components to use
 */
export interface PrivacyMessageProps {
  /** Which section is restricted */
  section: string;
  /** Visibility level that's blocking access */
  visibility: ProfileVisibility;
  /** Whether the user is logged in */
  isAuthenticated: boolean;
}

/**
 * Get a human-readable message for why a section is hidden
 */
export function getPrivacyMessage(
  section: string,
  visibility: ProfileVisibility,
  isAuthenticated: boolean,
): string {
  if (visibility === 'PRIVATE') {
    return `${section} is private`;
  }

  if (visibility === 'FOLLOWERS_ONLY') {
    if (!isAuthenticated) {
      return `Sign in and follow this user to see their ${section.toLowerCase()}`;
    }
    return `Follow this user to see their ${section.toLowerCase()}`;
  }

  return `${section} is not available`;
}
