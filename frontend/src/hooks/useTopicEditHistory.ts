/**
 * T036 [US3] - useTopicEditHistory Hook (Feature 016)
 *
 * TanStack Query hook for fetching topic edit history
 */

import { useQuery } from '@tanstack/react-query';

export interface TopicEdit {
  id: string;
  topicId: string;
  editorId: string;
  previousTitle?: string;
  newTitle?: string;
  previousDescription?: string;
  newDescription?: string;
  previousTags?: string[];
  newTags?: string[];
  changeReason?: string;
  flagForReview: boolean;
  editedAt: string;
  editor?: {
    id: string;
    name: string;
    username: string;
  };
}

export interface TopicEditHistoryResponse {
  edits: TopicEdit[];
  total: number;
}

export function useTopicEditHistory(topicId: string, limit: number = 50) {
  const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

  return useQuery<TopicEditHistoryResponse>({
    queryKey: ['topics', topicId, 'history', limit],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}/history?limit=${limit}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch edit history: ${response.statusText}`,
        );
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
