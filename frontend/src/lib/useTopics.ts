/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api';
import type { PaginatedTopicsResponse, GetTopicsParams } from '../types/topic';

/**
 * React Query hook for fetching topics with filtering and pagination
 */
export function useTopics(params?: GetTopicsParams) {
  return useQuery({
    queryKey: ['topics', params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedTopicsResponse>('/topics', {
        params: params as Record<string, string | number | boolean>,
      });
      return response;
    },
  });
}
