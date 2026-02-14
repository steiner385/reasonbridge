/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient, ApiError } from '../lib/api';
import type { ActivityEvent, ActivityFeedResponse } from '../types/activity';

/**
 * State for the activity feed hook
 */
export interface UseActivityFeedState {
  activities: ActivityEvent[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Return type for the activity feed hook
 */
export interface UseActivityFeedReturn extends UseActivityFeedState {
  fetchFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Options for the activity feed hook
 */
export interface UseActivityFeedOptions {
  /** Number of items to fetch per page */
  limit?: number;
  /** Whether to fetch on mount */
  fetchOnMount?: boolean;
}

/**
 * Custom hook for fetching activity feed from followed users
 *
 * Provides functionality to:
 * - Fetch initial activity feed
 * - Load more activities with cursor-based pagination
 * - Refresh the feed
 *
 * @param options - Configuration options
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const { limit = 20, fetchOnMount = true } = options;

  const [state, setState] = useState<UseActivityFeedState>({
    activities: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    nextCursor: null,
  });

  /**
   * Fetch the activity feed from the API
   */
  const fetchFeed = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.get<ActivityFeedResponse>('/feed', {
        params: { limit },
      });

      setState({
        activities: response.activities,
        isLoading: false,
        isLoadingMore: false,
        error: null,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : 'Failed to load activity feed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [limit]);

  /**
   * Load more activities using cursor pagination
   */
  const loadMore = useCallback(async () => {
    if (!state.hasMore || !state.nextCursor || state.isLoadingMore) {
      return;
    }

    setState((prev) => ({ ...prev, isLoadingMore: true, error: null }));

    try {
      const response = await apiClient.get<ActivityFeedResponse>('/feed', {
        params: { limit, cursor: state.nextCursor },
      });

      setState((prev) => ({
        ...prev,
        activities: [...prev.activities, ...response.activities],
        isLoadingMore: false,
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof ApiError ? error.message : 'Failed to load more activities';
      setState((prev) => ({
        ...prev,
        isLoadingMore: false,
        error: errorMessage,
      }));
    }
  }, [limit, state.hasMore, state.nextCursor, state.isLoadingMore]);

  /**
   * Refresh the feed (fetch from beginning)
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      activities: [],
      nextCursor: null,
      hasMore: false,
    }));
    await fetchFeed();
  }, [fetchFeed]);

  // Fetch on mount if enabled
  useEffect(() => {
    if (!fetchOnMount) {
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await apiClient.get<ActivityFeedResponse>('/feed', {
          params: { limit },
        });

        if (!cancelled) {
          setState({
            activities: response.activities,
            isLoading: false,
            isLoadingMore: false,
            error: null,
            hasMore: response.hasMore,
            nextCursor: response.nextCursor,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage =
            error instanceof ApiError ? error.message : 'Failed to load activity feed';
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [fetchOnMount, limit]);

  return {
    activities: state.activities,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    hasMore: state.hasMore,
    nextCursor: state.nextCursor,
    fetchFeed,
    loadMore,
    refresh,
  };
}
