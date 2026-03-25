/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hook for fetching a user's ranking and tier level
 */

import { useQuery } from '@tanstack/react-query';
import type { UserRank } from '../types/ranking';
import { apiClient } from '../lib/api';

/**
 * Fetches a user's ranking information by their ID
 * @param userId - The user's UUID
 * @returns Query result with UserRank data
 */
export function useUserRank(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRank', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await apiClient.get<UserRank>(`/users/${userId}/ranking`);
      return response;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Don't throw on 404 - user may not have a rank yet
    retry: (failureCount, error) => {
      // Don't retry on 404 (user has no rank yet)
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
