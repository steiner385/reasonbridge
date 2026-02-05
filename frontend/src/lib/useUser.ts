/**
 * React Query hook for fetching a user by ID
 */

import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from '../types/user';
import { apiClient } from './api';

/**
 * Fetches a user's profile by their ID
 * @param userId - The user's UUID
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await apiClient.get<UserProfile>(`/users/${userId}`);
      return response;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
