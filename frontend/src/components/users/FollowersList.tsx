/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useFollowers } from '../../hooks/useFollowers';
import { UserListItem } from './UserListItem';

/**
 * Props for FollowersList component
 */
export interface FollowersListProps {
  /** User ID to show followers for */
  userId: string;
  /** Whether to show follow buttons on each user */
  showFollowButtons?: boolean;
  /** Page size for pagination */
  pageSize?: number;
  /** Additional CSS classes */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * FollowersList Component
 *
 * Displays a paginated list of a user's followers.
 * Includes loading states, error handling, and infinite scroll support.
 *
 * @example
 * ```tsx
 * <FollowersList userId="user-123" />
 * ```
 */
export function FollowersList({
  userId,
  showFollowButtons = true,
  pageSize = 20,
  className = '',
  emptyMessage = 'No followers yet',
}: FollowersListProps) {
  const { users, total, isLoading, error, hasMore, loadMore } = useFollowers(userId, {
    pageSize,
  });

  // Loading state (initial load)
  if (isLoading && users.length === 0) {
    return (
      <div className={`${className}`} data-testid="followers-list-loading">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`p-6 text-center ${className}`} data-testid="followers-list-error">
        <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (users.length === 0) {
    return (
      <div
        className={`p-6 text-center text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="followers-list-empty"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="followers-list">
      {/* Header with count */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Followers
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({total})
          </span>
        </h3>
      </div>

      {/* User list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {users.map((user) => (
          <UserListItem key={user.id} user={user} showFollowButton={showFollowButtons} />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="load-more-button"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

export default FollowersList;
