/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * React Query hook for fetching the current user's profile
 */

import { useQuery } from '@tanstack/react-query';
import type { UserProfile } from '../types/user';
import { apiClient } from './api';

/**
 * Fetches the current authenticated user's profile
 * Requires a valid auth token in localStorage
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: async () => {
      const response = await apiClient.get<UserProfile>('/users/me');
      return response;
    },
    // Only fetch if we have an auth token
    enabled: !!apiClient.getAuthToken(),
    // Keep user data fresh
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on 401/403
  });
}
