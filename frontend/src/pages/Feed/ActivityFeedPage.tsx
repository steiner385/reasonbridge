/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Activity Feed Page
 * T250: Displays activity from followed users
 *
 * Shows a chronological feed of activities including:
 * - Responses created by followed users
 * - Topics created by followed users
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { activityFeedService, type ActivityEvent } from '../../services/activityFeedService';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(activityType: string): React.ReactNode {
  switch (activityType) {
    case 'RESPONSE_CREATED':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
      );
    case 'TOPIC_CREATED':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
      );
  }
}

function getActivityDescription(activity: ActivityEvent): string {
  switch (activity.activityType) {
    case 'RESPONSE_CREATED':
      return 'responded in';
    case 'TOPIC_CREATED':
      return 'created a new topic';
    case 'TOPIC_JOINED':
      return 'joined';
    default:
      return 'performed an action on';
  }
}

function getActivityLink(activity: ActivityEvent): string {
  if (activity.targetType === 'topic' || activity.targetType === 'response') {
    return `/discussions?topic=${activity.targetId}`;
  }
  return '/topics';
}

interface ActivityCardProps {
  activity: ActivityEvent;
}

function ActivityCard({ activity }: ActivityCardProps) {
  const iconBgClass =
    activity.activityType === 'RESPONSE_CREATED'
      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
      : activity.activityType === 'TOPIC_CREATED'
        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
        : 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
      data-testid="activity-card"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgClass}`}>
          {getActivityIcon(activity.activityType)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white">
            <Link to={`/profile/${activity.user.id}`} className="font-semibold hover:underline">
              {activity.user.displayName || 'Anonymous'}
            </Link>{' '}
            <span className="text-gray-600 dark:text-gray-400">
              {getActivityDescription(activity)}
            </span>{' '}
            {activity.targetTitle && (
              <Link
                to={getActivityLink(activity)}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {activity.targetTitle}
              </Link>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatTimeAgo(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="mb-4 h-12 w-12 text-gray-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No activity yet</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-300">
        Follow other users to see their activity here. When they create topics or respond to
        discussions, their activity will appear in your feed.
      </p>
      <Link
        to="/topics"
        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Explore Topics
      </Link>
    </div>
  );
}

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await activityFeedService.getFeed({
        limit: 20,
        cursor,
      });

      if (cursor) {
        setActivities((prev) => [...prev, ...response.activities]);
      } else {
        setActivities(response.activities);
      }

      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      fetchFeed(nextCursor);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            See what people you follow are doing
          </p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => fetchFeed()}
            className="mt-3 text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          See what people you follow are doing
        </p>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {isLoadingMore ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
