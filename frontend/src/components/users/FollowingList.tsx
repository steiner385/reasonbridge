/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useFollowing } from '../../hooks/useFollowers';
import { UserListItem } from './UserListItem';

/**
 * Props for FollowingList component
 */
export interface FollowingListProps {
  /** User ID to show following list for */
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
 * FollowingList Component
 *
 * Displays a paginated list of users that a user is following.
 * Includes loading states, error handling, and infinite scroll support.
 *
 * @example
 * ```tsx
 * <FollowingList userId="user-123" />
 * ```
 */
export function FollowingList({
  userId,
  showFollowButtons = true,
  pageSize = 20,
  className = '',
  emptyMessage = 'Not following anyone yet',
}: FollowingListProps) {
  const { users, total, isLoading, error, hasMore, loadMore } = useFollowing(userId, {
    pageSize,
  });

  // Loading state (initial load)
  if (isLoading && users.length === 0) {
    return (
      <div className={`${className}`} data-testid="following-list-loading">
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
      <div className={`p-6 text-center ${className}`} data-testid="following-list-error">
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
        data-testid="following-list-empty"
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
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="following-list">
      {/* Header with count */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Following
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

export default FollowingList;
