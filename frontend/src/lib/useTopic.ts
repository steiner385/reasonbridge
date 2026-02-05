import { useQuery } from '@tanstack/react-query';
import type { Topic } from '../types/topic';
import { apiClient } from './api';

/**
 * React Query hook for fetching a single topic by ID
 */
export function useTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!topicId) {
        throw new Error('Topic ID is required');
      }
      const response = await apiClient.get<Topic>(`/topics/${topicId}`);
      return response;
    },
    enabled: !!topicId,
  });
}
