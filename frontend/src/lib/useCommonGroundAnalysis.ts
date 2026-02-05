import { useQuery } from '@tanstack/react-query';
import type { CommonGroundAnalysis } from '../types/common-ground';
import { apiClient } from './api';

/**
 * React Query hook for fetching common ground analysis for a topic
 */
export function useCommonGroundAnalysis(topicId: string | undefined) {
  return useQuery({
    queryKey: ['commonGroundAnalysis', topicId],
    queryFn: async () => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }
      const response = await apiClient.get<CommonGroundAnalysis>(
        `/topics/${topicId}/common-ground-analysis`,
      );
      return response;
    },
    enabled: !!topicId,
  });
}
