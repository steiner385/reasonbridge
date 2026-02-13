/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import type { FollowUser } from '../../services/userService';
import { FollowButton } from './FollowButton';
import { useAuth } from '../../hooks/useAuth';

/**
 * Props for UserListItem component
 */
export interface UserListItemProps {
  /** User data */
  user: FollowUser;
  /** Whether to show the follow button */
  showFollowButton?: boolean;
  /** Callback when follow state changes */
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * UserListItem Component
 *
 * Displays a single user in a list with avatar placeholder, name, and optional follow button.
 * Used in followers/following lists.
 */
export function UserListItem({
  user,
  showFollowButton = true,
  onFollowChange,
  className = '',
}: UserListItemProps) {
  const { user: currentUser } = useAuth();
  const displayName = user.displayName || 'Anonymous User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format the follow date
  const followDate = new Date(user.followedAt);
  const formattedDate = followDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: followDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });

  const handleFollowChange = (isFollowing: boolean) => {
    onFollowChange?.(user.id, isFollowing);
  };

  return (
    <div
      className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`}
      data-testid="user-list-item"
    >
      <Link to={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar placeholder */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
          {initials}
        </div>

        {/* User info */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Since {formattedDate}</p>
        </div>
      </Link>

      {/* Follow button */}
      {showFollowButton && currentUser?.id !== user.id && (
        <FollowButton userId={user.id} size="sm" onFollowChange={handleFollowChange} />
      )}
    </div>
  );
}

export default UserListItem;
