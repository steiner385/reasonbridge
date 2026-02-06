/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T045 [US6] - useMergeTopics Hook (Feature 016)
 *
 * TanStack Query mutation hook for merging topics
 * Moderator-only operation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface MergeTopicsRequest {
  sourceTopicIds: string[];
  targetTopicId: string;
  mergeReason: string;
}

export interface UseMergeTopicsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useMergeTopics(options?: UseMergeTopicsOptions) {
  const queryClient = useQueryClient();
  const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

  return useMutation({
    mutationFn: async (request: MergeTopicsRequest) => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('Authentication required to merge topics');
      }

      const response = await fetch(`${API_BASE_URL}/topics/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to merge topics: ${response.statusText}`);
      }

      return response.json();
    },

    onSuccess: (data, variables) => {
      // Invalidate topic listings
      queryClient.invalidateQueries({ queryKey: ['topics'] });

      // Invalidate all involved topics
      queryClient.invalidateQueries({ queryKey: ['topics', variables.targetTopicId] });
      variables.sourceTopicIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ['topics', id] });
      });

      options?.onSuccess?.();
    },

    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
