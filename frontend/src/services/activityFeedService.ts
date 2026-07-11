/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Activity Feed API service for T250: Activity Feed Page
 * Handles fetching activity feed from followed users
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface ActivityUser {
  id: string;
  displayName: string | null;
}

export interface ActivityEvent {
  id: string;
  activityType: string;
  targetId: string;
  targetType: string;
  targetTitle: string | null;
  targetSlug: string | null;
  createdAt: string;
  user: ActivityUser;
}

export interface ActivityFeedResponse {
  activities: ActivityEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GetFeedParams {
  limit?: number;
  cursor?: string;
}

class ActivityFeedService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get activity feed from followed users
   * Supports cursor-based pagination
   */
  async getFeed(params?: GetFeedParams): Promise<ActivityFeedResponse> {
    const searchParams = new URLSearchParams();

    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.cursor) searchParams.append('cursor', params.cursor);

    // The API gateway exposes the activity feed at GET /feed
    // (services/api-gateway/src/proxy/activity-proxy.controller.ts). The old
    // /activity-feed path does not exist on the gateway and 404s.
    const url = `${API_BASE_URL}/feed${searchParams.toString() ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please log in to view your activity feed');
      }
      const error = await response
        .json()
        .catch(() => ({ message: 'Failed to fetch activity feed' }));
      throw new Error(error.message || 'Failed to fetch activity feed');
    }

    return response.json();
  }
}

export const activityFeedService = new ActivityFeedService();
