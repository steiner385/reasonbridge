/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * Activity types for the timeline
 */
export type ActivityType =
  | 'RESPONSE_POSTED'
  | 'TOPIC_JOINED'
  | 'TOPIC_CREATED'
  | 'VOTE_CAST'
  | 'RESPONSE_EDITED'
  | 'PROFILE_UPDATED'
  | 'LOGIN';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  metadata?: {
    topicTitle?: string;
    topicId?: string;
    responseId?: string;
  };
}

export interface ActivityTimelineProps {
  /**
   * List of activities to display
   */
  activities: ActivityItem[];

  /**
   * Whether the timeline is loading
   */
  isLoading?: boolean;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Maximum number of activities to show
   */
  maxItems?: number;
}

const ACTIVITY_ICONS: Record<ActivityType, { icon: string; color: string }> = {
  RESPONSE_POSTED: {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  },
  TOPIC_JOINED: {
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  },
  TOPIC_CREATED: {
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  },
  VOTE_CAST: {
    icon: 'M5 15l7-7 7 7',
    color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  },
  RESPONSE_EDITED: {
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  },
  PROFILE_UPDATED: {
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
  },
  LOGIN: {
    icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
    color: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  },
};

/**
 * ActivityTimeline - Displays a chronological list of child activities
 *
 * @remarks
 * Used in the Parental Dashboard to show parents what their child has been doing.
 * Each activity shows:
 * - Activity type icon (color-coded)
 * - Description of the activity
 * - Timestamp
 *
 * **Design:**
 * - Vertical timeline with dots and connecting lines
 * - Hover states for interactive items
 * - Loading skeleton when data is fetching
 *
 * @param props - Component props
 * @returns Rendered timeline component
 *
 * @example
 * ```tsx
 * <ActivityTimeline
 *   activities={[
 *     { id: '1', type: 'RESPONSE_POSTED', description: 'Posted a response in "Climate Change"', timestamp: '2025-01-15T10:00:00Z' }
 *   ]}
 * />
 * ```
 */
export function ActivityTimeline({
  activities,
  isLoading = false,
  emptyMessage = 'No recent activity',
  maxItems = 10,
}: ActivityTimelineProps): React.ReactElement {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="activity-timeline-loading">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div
        className="text-center py-8 text-gray-500 dark:text-gray-400"
        data-testid="activity-timeline-empty"
      >
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="relative" data-testid="activity-timeline">
      {/* Timeline line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <ul className="space-y-4">
        {displayActivities.map((activity, index) => {
          const iconConfig = ACTIVITY_ICONS[activity.type];
          const isLast = index === displayActivities.length - 1;

          return (
            <li key={activity.id} className="relative flex gap-3 pl-1">
              {/* Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconConfig.color}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconConfig.icon} />
                </svg>
              </div>

              {/* Content */}
              <div className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
                <p className="text-sm text-gray-900 dark:text-gray-100">{activity.description}</p>
                <time className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimestamp(activity.timestamp)}
                </time>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Show more indicator */}
      {activities.length > maxItems && (
        <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
          + {activities.length - maxItems} more activities
        </p>
      )}
    </div>
  );
}

export default ActivityTimeline;
