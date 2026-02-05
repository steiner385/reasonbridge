import { useQuery } from '@tanstack/react-query';
import type { PaginatedTopicsResponse, GetTopicsParams } from '../types/topic';
import { apiClient } from './api';

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
