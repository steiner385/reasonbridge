/**
 * T035 [US3] - useEditTopic Hook (Feature 016)
 *
 * TanStack Query mutation hook for editing topic details
 * Handles API calls, optimistic updates, and cache invalidation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface EditTopicRequest {
  topicId: string;
  title?: string;
  description?: string;
  tags?: string[];
  editReason?: string;
  flagForReview?: boolean;
}

export interface UseEditTopicOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useEditTopic(options?: UseEditTopicOptions) {
  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

  return useMutation({
    mutationFn: async (request: EditTopicRequest) => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Authentication required to edit topics');
      }

      const { topicId, ...updates } = request;

      const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to edit topic: ${response.statusText}`);
      }

      return response.json();
    },

    onSuccess: (data, variables) => {
      // Invalidate topic listings
      queryClient.invalidateQueries({ queryKey: ['topics'] });

      // Invalidate the specific topic
      queryClient.invalidateQueries({ queryKey: ['topics', variables.topicId] });

      // Invalidate edit history
      queryClient.invalidateQueries({ queryKey: ['topics', variables.topicId, 'history'] });

      options?.onSuccess?.();
    },

    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
