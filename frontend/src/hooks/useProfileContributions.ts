/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * useProfileContributions - React Query hook for fetching user contributions
 *
 * Supports pagination, filtering by type, and infinite scroll.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import type { ContributionItem, ContributionStats, ContributionType } from '../types/contribution';

/** API response for paginated contributions */
interface ContributionsResponse {
  data: ContributionItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/** Query parameters for contributions */
export interface ContributionsQueryParams {
  type?: ContributionType;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Hook for fetching paginated user contributions with infinite scroll
 *
 * @param userId - The user's ID
 * @param params - Filter and pagination parameters
 * @returns Infinite query result with contributions
 *
 * @example
 * ```tsx
 * const { data, isLoading, hasNextPage, fetchNextPage } = useProfileContributions(
 *   userId,
 *   { type: 'RESPONSE', limit: 20 }
 * );
 *
 * const contributions = data?.pages.flatMap(page => page.data) ?? [];
 * ```
 */
export function useProfileContributions(
  userId: string | undefined,
  params: ContributionsQueryParams = {},
) {
  const { type, sortOrder = 'desc', limit = 20 } = params;

  return useInfiniteQuery({
    queryKey: ['contributions', userId, type, sortOrder, limit],
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const queryParams: Record<string, string | number> = {
        page: pageParam,
        limit,
        sortOrder,
      };

      if (type) {
        queryParams['type'] = type;
      }

      const response = await apiClient.get<ContributionsResponse>(
        `/users/${userId}/contributions`,
        { params: queryParams },
      );

      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasNextPage) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching contribution statistics
 *
 * @param userId - The user's ID
 * @returns Query result with contribution counts
 *
 * @example
 * ```tsx
 * const { data: stats } = useContributionStats(userId);
 * // stats = { topicCount: 10, responseCount: 50, voteCount: 200, propositionCount: 25 }
 * ```
 */
export function useContributionStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['contributionStats', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await apiClient.get<ContributionStats>(
        `/users/${userId}/contributions/stats`,
      );

      return response;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Helper to flatten paginated contribution data
 *
 * @param data - Paginated data from useProfileContributions
 * @returns Flattened array of contributions
 */
export function flattenContributions(
  data: ReturnType<typeof useProfileContributions>['data'],
): ContributionItem[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

/**
 * Get total count from paginated data
 *
 * @param data - Paginated data from useProfileContributions
 * @returns Total number of contributions
 */
export function getTotalCount(data: ReturnType<typeof useProfileContributions>['data']): number {
  return data?.pages[0]?.pagination.totalItems ?? 0;
}

export default useProfileContributions;
