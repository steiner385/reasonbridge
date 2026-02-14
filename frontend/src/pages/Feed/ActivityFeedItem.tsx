/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityEvent } from '../../types/activity';

/**
 * Props for ActivityFeedItem component
 */
export interface ActivityFeedItemProps {
  activity: ActivityEvent;
}

/**
 * Format a date string to a relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Get the activity icon based on activity type
 */
function getActivityIcon(activityType: string): React.ReactElement {
  switch (activityType) {
    case 'TOPIC_CREATED':
      return (
        <svg
          className="h-5 w-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      );
    case 'RESPONSE_POSTED':
      return (
        <svg
          className="h-5 w-5 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className="h-5 w-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

/**
 * Get the activity description based on activity type
 */
function getActivityDescription(activity: ActivityEvent): string {
  switch (activity.activityType) {
    case 'TOPIC_CREATED':
      return 'created a new topic';
    case 'RESPONSE_POSTED':
      return 'posted a response';
    default:
      return 'performed an action';
  }
}

/**
 * Get the link to the activity target
 */
function getTargetLink(activity: ActivityEvent): string {
  if (activity.targetType === 'TOPIC' && activity.targetSlug) {
    return `/discussions?topic=${activity.targetId}`;
  }
  if (activity.targetType === 'RESPONSE') {
    // Response links go to the discussion with the topic
    return `/discussions?topic=${activity.targetId}`;
  }
  return '#';
}

/**
 * ActivityFeedItem Component
 *
 * Displays a single activity event in the feed.
 * Shows the user who performed the action, the action type,
 * the target (topic/response), and relative timestamp.
 */
export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  const displayName = activity.user.displayName || 'Anonymous User';
  const targetLink = getTargetLink(activity);
  const targetTitle = activity.targetTitle || 'Untitled';

  return (
    <div
      className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
      data-testid="activity-feed-item"
    >
      {/* Activity Icon */}
      <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.activityType)}</div>

      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100">
          <Link
            to={`/profile/${activity.user.id}`}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            data-testid="activity-user-link"
          >
            {displayName}
          </Link>{' '}
          <span className="text-gray-600 dark:text-gray-400">
            {getActivityDescription(activity)}
          </span>
        </p>

        {/* Target Link */}
        <Link
          to={targetLink}
          className="mt-1 block text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
          title={targetTitle}
          data-testid="activity-target-link"
        >
          {targetTitle}
        </Link>

        {/* Timestamp */}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default ActivityFeedItem;
