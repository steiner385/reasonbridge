/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * User service for user-related API calls
 * Handles followers, following, and user profile operations
 */

import { apiClient } from '../lib/api';

/**
 * User summary for follower/following lists
 */
export interface FollowUser {
  id: string;
  displayName: string | null;
  followedAt: string;
}

/**
 * Paginated followers response
 */
export interface FollowersResponse {
  followers: FollowUser[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Paginated following response
 */
export interface FollowingResponse {
  following: FollowUser[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Pagination options for list requests
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

class UserService {
  /**
   * Get a user's followers
   * @param userId - The user ID to get followers for
   * @param options - Pagination options
   */
  async getFollowers(userId: string, options: PaginationOptions = {}): Promise<FollowersResponse> {
    const { limit = 20, offset = 0 } = options;
    return apiClient.get<FollowersResponse>(`/users/${userId}/followers`, {
      params: { limit, offset },
    });
  }

  /**
   * Get users that a user is following
   * @param userId - The user ID to get following list for
   * @param options - Pagination options
   */
  async getFollowing(userId: string, options: PaginationOptions = {}): Promise<FollowingResponse> {
    const { limit = 20, offset = 0 } = options;
    return apiClient.get<FollowingResponse>(`/users/${userId}/following`, {
      params: { limit, offset },
    });
  }

  /**
   * Get follower count for a user
   * @param userId - The user ID
   */
  async getFollowerCount(userId: string): Promise<number> {
    const response = await this.getFollowers(userId, { limit: 0, offset: 0 });
    return response.total;
  }

  /**
   * Get following count for a user
   * @param userId - The user ID
   */
  async getFollowingCount(userId: string): Promise<number> {
    const response = await this.getFollowing(userId, { limit: 0, offset: 0 });
    return response.total;
  }
}

export const userService = new UserService();
