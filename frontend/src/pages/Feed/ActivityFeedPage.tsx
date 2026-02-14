/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { ActivityFeedItem } from './ActivityFeedItem';
import { LoadingSpinner } from '../../components/ui';

/**
 * ActivityFeedPage Component
 *
 * Displays an activity feed showing actions from users the current user follows.
 * Supports infinite scroll with cursor-based pagination.
 *
 * Features:
 * - Shows activities from followed users
 * - Infinite scroll / load more pagination
 * - Empty state for users not following anyone
 * - Error handling with retry
 * - Pull-to-refresh via refresh button
 */
export function ActivityFeedPage() {
  const { activities, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useActivityFeed();

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Feed</h1>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh feed"
            data-testid="refresh-feed-button"
          >
            <svg
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          See what the people you follow are up to
        </p>

        {/* Loading State */}
        {isLoading && activities.length === 0 && (
          <div className="flex justify-center py-12" data-testid="feed-loading">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
            role="alert"
            data-testid="feed-error"
          >
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-500 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && activities.length === 0 && (
          <div
            className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            data-testid="feed-empty"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No activity yet
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Follow other users to see their activity here.
            </p>
            <Link
              to="/topics"
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="browse-topics-link"
            >
              Browse Topics
            </Link>
          </div>
        )}

        {/* Activity List */}
        {activities.length > 0 && (
          <div className="space-y-4" data-testid="activity-feed-list">
            {activities.map((activity) => (
              <ActivityFeedItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && activities.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="load-more-button"
            >
              {isLoadingMore ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}

        {/* End of Feed Message */}
        {!hasMore && activities.length > 0 && (
          <p
            className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
            data-testid="end-of-feed"
          >
            You&apos;re all caught up!
          </p>
        )}
      </div>
    </div>
  );
}

export default ActivityFeedPage;
