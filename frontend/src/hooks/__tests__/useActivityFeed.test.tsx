/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityFeed } from '../useActivityFeed';
import { apiClient, ApiError } from '../../lib/api';
import type { ActivityFeedResponse } from '../../types/activity';

// Mock the API client
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
    },
  };
});

const mockApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
};

const mockActivityResponse: ActivityFeedResponse = {
  activities: [
    {
      id: 'activity-1',
      activityType: 'TOPIC_CREATED',
      targetId: 'topic-1',
      targetType: 'TOPIC',
      targetTitle: 'Test Topic',
      targetSlug: 'test-topic',
      createdAt: '2025-01-01T12:00:00Z',
      user: {
        id: 'user-1',
        displayName: 'John Doe',
        avatarUrl: null,
      },
    },
    {
      id: 'activity-2',
      activityType: 'RESPONSE_POSTED',
      targetId: 'topic-2',
      targetType: 'RESPONSE',
      targetTitle: 'Another Topic',
      targetSlug: null,
      createdAt: '2025-01-01T11:00:00Z',
      user: {
        id: 'user-2',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
    },
  ],
  nextCursor: 'cursor-123',
  hasMore: true,
};

const mockEmptyResponse: ActivityFeedResponse = {
  activities: [],
  nextCursor: null,
  hasMore: false,
};

describe('useActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      mockApiClient.get.mockResolvedValue(mockEmptyResponse);

      const { result } = renderHook(() => useActivityFeed({ fetchOnMount: false }));

      expect(result.current.activities).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
      expect(result.current.nextCursor).toBeNull();
    });

    it('should fetch on mount by default', async () => {
      mockApiClient.get.mockResolvedValue(mockActivityResponse);

      renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/feed', {
          params: { limit: 20 },
        });
      });
    });

    it('should not fetch on mount when fetchOnMount is false', () => {
      mockApiClient.get.mockResolvedValue(mockActivityResponse);

      renderHook(() => useActivityFeed({ fetchOnMount: false }));

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should use custom limit', async () => {
      mockApiClient.get.mockResolvedValue(mockActivityResponse);

      renderHook(() => useActivityFeed({ limit: 10 }));

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/feed', {
          params: { limit: 10 },
        });
      });
    });
  });

  describe('fetchFeed', () => {
    it('should fetch and set activities', async () => {
      mockApiClient.get.mockResolvedValue(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed({ fetchOnMount: false }));

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.activities).toEqual(mockActivityResponse.activities);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.nextCursor).toBe('cursor-123');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: ActivityFeedResponse) => void;
      const promise = new Promise<ActivityFeedResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockApiClient.get.mockReturnValue(promise);

      const { result } = renderHook(() => useActivityFeed({ fetchOnMount: false }));

      // Start fetching
      act(() => {
        result.current.fetchFeed();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockActivityResponse);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle API errors', async () => {
      const apiError = new ApiError('Network error', 500);
      mockApiClient.get.mockRejectedValue(apiError);

      const { result } = renderHook(() => useActivityFeed({ fetchOnMount: false }));

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-API errors with generic message', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Something went wrong'));

      const { result } = renderHook(() => useActivityFeed({ fetchOnMount: false }));

      await act(async () => {
        await result.current.fetchFeed();
      });

      expect(result.current.error).toBe('Failed to load activity feed');
    });
  });

  describe('loadMore', () => {
    it('should load more activities and append them', async () => {
      // First fetch
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      // Load more
      const moreActivities: ActivityFeedResponse = {
        activities: [
          {
            id: 'activity-3',
            activityType: 'TOPIC_CREATED',
            targetId: 'topic-3',
            targetType: 'TOPIC',
            targetTitle: 'Third Topic',
            targetSlug: 'third-topic',
            createdAt: '2025-01-01T10:00:00Z',
            user: {
              id: 'user-3',
              displayName: 'Bob Wilson',
              avatarUrl: null,
            },
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
      mockApiClient.get.mockResolvedValueOnce(moreActivities);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.activities).toHaveLength(3);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.nextCursor).toBeNull();
    });

    it('should use cursor for pagination', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      mockApiClient.get.mockResolvedValueOnce(mockEmptyResponse);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockApiClient.get).toHaveBeenLastCalledWith('/feed', {
        params: { limit: 20, cursor: 'cursor-123' },
      });
    });

    it('should not load more when hasMore is false', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockEmptyResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });

      mockApiClient.get.mockClear();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should not load more when already loading more', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      // Create a promise that won't resolve immediately
      let resolveLoadMore: (value: ActivityFeedResponse) => void;
      const loadMorePromise = new Promise<ActivityFeedResponse>((resolve) => {
        resolveLoadMore = resolve;
      });
      mockApiClient.get.mockReturnValueOnce(loadMorePromise);

      // Start first loadMore
      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);

      // Try to call loadMore again while loading
      mockApiClient.get.mockClear();
      await act(async () => {
        await result.current.loadMore();
      });

      // Should not have called again
      expect(mockApiClient.get).not.toHaveBeenCalled();

      // Cleanup
      await act(async () => {
        resolveLoadMore!(mockEmptyResponse);
      });
    });

    it('should set isLoadingMore state correctly', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      let resolveLoadMore: (value: ActivityFeedResponse) => void;
      const loadMorePromise = new Promise<ActivityFeedResponse>((resolve) => {
        resolveLoadMore = resolve;
      });
      mockApiClient.get.mockReturnValueOnce(loadMorePromise);

      act(() => {
        result.current.loadMore();
      });

      expect(result.current.isLoadingMore).toBe(true);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        resolveLoadMore!(mockEmptyResponse);
      });

      expect(result.current.isLoadingMore).toBe(false);
    });

    it('should handle loadMore errors', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      mockApiClient.get.mockRejectedValueOnce(new Error('Load more failed'));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.error).toBe('Failed to load more activities');
      expect(result.current.isLoadingMore).toBe(false);
      // Original activities should still be there
      expect(result.current.activities).toHaveLength(2);
    });
  });

  describe('refresh', () => {
    it('should clear activities and fetch fresh data', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(2);
      });

      const freshResponse: ActivityFeedResponse = {
        activities: [
          {
            id: 'activity-new',
            activityType: 'TOPIC_CREATED',
            targetId: 'topic-new',
            targetType: 'TOPIC',
            targetTitle: 'Fresh Topic',
            targetSlug: 'fresh-topic',
            createdAt: '2025-01-02T12:00:00Z',
            user: {
              id: 'user-1',
              displayName: 'John Doe',
              avatarUrl: null,
            },
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
      mockApiClient.get.mockResolvedValueOnce(freshResponse);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.activities).toHaveLength(1);
      expect(result.current.activities[0].id).toBe('activity-new');
    });

    it('should reset cursor and hasMore before refresh', async () => {
      mockApiClient.get.mockResolvedValueOnce(mockActivityResponse);

      const { result } = renderHook(() => useActivityFeed());

      await waitFor(() => {
        expect(result.current.nextCursor).toBe('cursor-123');
        expect(result.current.hasMore).toBe(true);
      });

      mockApiClient.get.mockResolvedValueOnce(mockEmptyResponse);

      await act(async () => {
        await result.current.refresh();
      });

      // After refresh, should have fresh state
      expect(mockApiClient.get).toHaveBeenLastCalledWith('/feed', {
        params: { limit: 20 },
      });
    });
  });
});
