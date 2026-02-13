/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { userService, type FollowUser } from '../services/userService';

/**
 * Hook state for followers/following lists
 */
export interface UseFollowersState {
  users: FollowUser[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

/**
 * Hook return type for followers/following lists
 */
export interface UseFollowersReturn extends UseFollowersState {
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook options
 */
export interface UseFollowersOptions {
  /** Initial page size */
  pageSize?: number;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
}

/**
 * Custom hook for fetching a user's followers list
 *
 * @param userId - The user ID to fetch followers for
 * @param options - Hook options
 */
export function useFollowers(
  userId: string,
  options: UseFollowersOptions = {},
): UseFollowersReturn {
  const { pageSize = 20, fetchOnMount = true } = options;

  const [state, setState] = useState<UseFollowersState>({
    users: [],
    total: 0,
    isLoading: false,
    error: null,
    hasMore: true,
  });

  const fetchFollowers = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await userService.getFollowers(userId, {
          limit: pageSize,
          offset,
        });

        setState((prev) => ({
          users: append ? [...prev.users, ...response.followers] : response.followers,
          total: response.total,
          isLoading: false,
          error: null,
          hasMore: offset + response.followers.length < response.total,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load followers',
        }));
      }
    },
    [userId, pageSize],
  );

  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;
    await fetchFollowers(state.users.length, true);
  }, [state.isLoading, state.hasMore, state.users.length, fetchFollowers]);

  const refresh = useCallback(async () => {
    await fetchFollowers(0, false);
  }, [fetchFollowers]);

  useEffect(() => {
    if (fetchOnMount && userId) {
      fetchFollowers(0, false);
    }
  }, [fetchOnMount, userId, fetchFollowers]);

  return {
    ...state,
    loadMore,
    refresh,
  };
}

/**
 * Custom hook for fetching users that a user is following
 *
 * @param userId - The user ID to fetch following list for
 * @param options - Hook options
 */
export function useFollowing(
  userId: string,
  options: UseFollowersOptions = {},
): UseFollowersReturn {
  const { pageSize = 20, fetchOnMount = true } = options;

  const [state, setState] = useState<UseFollowersState>({
    users: [],
    total: 0,
    isLoading: false,
    error: null,
    hasMore: true,
  });

  const fetchFollowing = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await userService.getFollowing(userId, {
          limit: pageSize,
          offset,
        });

        setState((prev) => ({
          users: append ? [...prev.users, ...response.following] : response.following,
          total: response.total,
          isLoading: false,
          error: null,
          hasMore: offset + response.following.length < response.total,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load following',
        }));
      }
    },
    [userId, pageSize],
  );

  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;
    await fetchFollowing(state.users.length, true);
  }, [state.isLoading, state.hasMore, state.users.length, fetchFollowing]);

  const refresh = useCallback(async () => {
    await fetchFollowing(0, false);
  }, [fetchFollowing]);

  useEffect(() => {
    if (fetchOnMount && userId) {
      fetchFollowing(0, false);
    }
  }, [fetchOnMount, userId, fetchFollowing]);

  return {
    ...state,
    loadMore,
    refresh,
  };
}
