/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Activity types that can appear in the feed
 */
export type ActivityType = 'TOPIC_CREATED' | 'RESPONSE_POSTED';

/**
 * Target types for activity events
 */
export type TargetType = 'TOPIC' | 'RESPONSE';

/**
 * User information in activity events
 */
export interface ActivityUser {
  id: string;
  displayName: string | null;
}

/**
 * Single activity event in the feed
 */
export interface ActivityEvent {
  id: string;
  activityType: ActivityType;
  targetId: string;
  targetType: TargetType;
  targetTitle: string | null;
  targetSlug: string | null;
  createdAt: string;
  user: ActivityUser;
}

/**
 * Activity feed response from API
 */
export interface ActivityFeedResponse {
  activities: ActivityEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}
